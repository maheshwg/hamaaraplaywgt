## Jar-based Page Object Execution (Replacing the DB “Java Parser”)

This document outlines a **plugin-jar approach** where page objects (screens + locators + methods) are shipped as a **JAR**, loaded at runtime, and invoked directly—so we don’t need to interpret stored Java source with a custom DSL/parser.

## Why a JAR approach

- **Full Java support**: loops, if/else, helper methods, collections, complex logic.
- **Leverages real Playwright Java API**: no re-implementing Playwright behavior in a DSL.
- **Single source of truth**: the page-object `.java` code is what executes.

Tradeoff:
- You must manage **jar build + distribution + versioning** (but you can avoid full backend redeploy by treating page objects as a plugin artifact).

## High-level architecture

- **Backend** owns browser lifecycle via `PlaywrightJavaService` (per-thread `Playwright/Browser/Context/Page`).
- A **Page Object Plugin JAR** contains:
  - screen classes (e.g., `saucedemo.ProductsPage`)
  - locators + helper methods
  - optional “screen registry” metadata
- Backend loads the jar with an isolated `ClassLoader` and invokes:
  - locator-based steps (click/fill/hover/select) **or**
  - page-object methods (call_method) directly.

## Two modes: which one you choose matters

### Mode A: “Method-only” (simplest)

- Tests map to **screen method calls** only (e.g., `products::addToCart("Sauce Labs Fleece Jacket")`)
- Backend calls `products.addToCart(...)` via reflection (or an interface).

This avoids needing to expose locators to the backend; locators stay internal to the page object.

### Mode B: “Element actions + methods” (more flexible)

- Tests can map to both:
  - element actions: click/fill/hover/select on a named element
  - method calls
- The plugin exposes a way to resolve element names → `Locator` (or selector).

This is closest to what you have now with `Screen.elements`, but without DB-stored locators.

## Implementation steps (recommended path)

### 1) Define a stable plugin API (a small interface JAR)

Create a small shared module (or package) that both backend and plugin depend on, e.g.:

- `ScreenPlugin`
  - `String getAppName()`
  - `Set<String> getScreenNames()`
  - `Object createScreen(String screenName, Page page)`
- Optional: `ElementRegistry`
  - `Map<String, Locator> elements()` or `Locator element(String name)`

The key is: **backend compiles against the interface**, not the plugin implementation.

### 2) Build plugin jars

For each app (or app version), build a jar:
- `saucedemo-plugin.jar`
- `testautomationpractice-plugin.jar`

The jar includes:
- compiled page object classes
- their dependencies if needed (see “dependency strategy” below)

### 3) Store plugin metadata in DB

Add fields on `App` (or a new table), e.g.:
- `pluginJarUrl` (S3/local path)
- `pluginJarSha256`
- `pluginVersion`

SUPER_ADMIN can upload/point an app to a jar.

### 4) Load jar at runtime (with caching)

Backend service responsibilities:
- download jar (if remote)
- verify checksum
- create a `URLClassLoader` **per plugin version**
- cache classloaders in-memory (LRU) so repeated runs don’t reload.

### 5) Inject Playwright objects

Backend remains the owner of:
- `PlaywrightJavaService.ensureStarted()`
- the thread’s `Page`

When invoking plugin code:
- create the screen object with `Page`
- then call methods / resolve locators.

### 6) Execute test steps

#### call_method steps (works best)
- Mapped step: `type=call_method`
- Selector: `screenName::methodName`
- Value: JSON args

Backend:
- find screen instance
- reflectively invoke method with args (or via typed interface)
- if return type is boolean:
  - `false` fails the step
  - `true` passes

#### Element action steps (optional)

If the plugin provides `Locator element(String name)`:
- `fill`: `locator.fill(value)`
- `click`: `locator.click()`
- `hover`: `locator.hover()`
- `select_by_label`: `locator.selectOption(new SelectOption().setLabel(label))`
- `select_by_value`: `locator.selectOption(value)` (value) or `new SelectOption().setValue(...)`

### 7) Logging and reporting hooks

In plugin methods you can do normal Java logging:
- SLF4J logger inside the page object

If you want to export values into test reports (StepResult):
- define a small “execution context” interface passed to page objects, e.g.:
  - `ctx.log(String)`
  - `ctx.export(String key, Object value)`

Backend collects exports and writes them to:
- `StepResult.extractedVariables`
- and merges into `TestRun.variables`

### 8) Versioning / compatibility rules

Pin versions:
- Playwright Java version must be compatible between backend and plugin.
- If plugin bundles Playwright itself, ensure no “duplicate classes” collide.

Recommended dependency strategy:
- Plugin jar is **thin** (only your page objects), backend provides Playwright dependency.
- Plugin depends on the shared plugin API + Playwright at `provided` scope.

### 9) Safety constraints

This is executing compiled Java from a jar. Treat it like code deploy:
- only SUPER_ADMIN can upload/attach jars
- validate checksum + signature
- isolate classloader
- enforce timeouts at Playwright level

## Structured DSL approach (UI-editable flows)

If the main goal is **UI-editable test logic** (including bounded loops + if/else), a structured DSL is usually a better long-term representation than:
- storing raw Java source text (custom parser), or
- shipping everything as code in a plugin jar.

### What “DSL” means here

- Store each screen method (or test/module) as **JSON**: a list of steps + control-flow blocks.
- The backend executes the JSON with a **DSL interpreter** (Java service) that:
  - evaluates conditions / loop bounds
  - performs actions by calling `PlaywrightJavaService` (click/fill/select/etc.)
  - exports variables into `TestRun.variables` / `StepResult.extractedVariables`
  - produces clean user-facing `StepResult.notes` / error messages

### Why this is different from the current DB “Java parser”

- **Representation**: explicit JSON blocks (safe and parseable) vs free-form Java-like text.
- **UI editing**: the UI can reliably build/edit blocks without breaking syntax.
- **Safety**: supported operations are limited by design (no “execute arbitrary code”).
- **Portability**: no dependency on Java compilation, classloaders, or jar compatibility.

### Where the DSL lives

You can introduce DSL in two ways (non-breaking):

- **Option 1 (recommended)**: DSL replaces `ScreenMethod.methodBody` (string) with something like `ScreenMethod.dslJson` (TEXT/JSON).
- **Option 2**: DSL is stored on `TestStep` / `ModuleStep` directly (a “test-level DSL”), independent of screens.

In either case, the executor is the same: a `DslExecutionService` that runs JSON blocks and calls `PlaywrightJavaService`.

### Supported primitives (suggested minimal set)

- **Actions**: `navigate`, `click`, `fill`, `hover`, `press_key`, `select_by_value`, `select_by_label`, `wait_for_visible`, `assert_visible`, `assert_text_equals`
- **Variables**:
  - `store_text` (read text into a variable)
  - `export` (write variables into report/run variables)
  - standard substitution: `{{var}}`
- **Control flow** (bounded):
  - `if` with conditions like `visible(selector)` or `textContains(selector, "...")`
  - `repeatUntil` with `maxIterations` + a condition

### Execution model (how it runs)

- Backend owns browser lifecycle via `PlaywrightJavaService` (same as today).
- The DSL interpreter executes steps sequentially:
  - resolves selectors (either raw CSS or via element registry)
  - substitutes variables (`{{var}}`)
  - calls the corresponding `PlaywrightJavaService` method
  - records per-step screenshots + `StepResult.notes`
- For loops:
  - enforce `maxIterations` (and optionally total timeout) to avoid infinite loops.
- For conditions:
  - allow only whitelisted condition types (e.g., `visible`, `textEquals`) so evaluation is safe and predictable.

### Example: a UI-editable “login and verify error” flow

Below is an example DSL JSON for a single “method” (or module). It shows actions, variable substitution, an if/else, and exports.

```json
{
  "name": "loginAndValidate",
  "steps": [
    { "type": "navigate", "url": "https://www.saucedemo.com/" },
    { "type": "fill", "selector": "input[data-test='username']", "value": "{{username}}" },
    { "type": "fill", "selector": "input[data-test='password']", "value": "{{password}}" },
    { "type": "click", "selector": "input[data-test='login-button']" },

    {
      "type": "if",
      "condition": { "type": "visible", "selector": "[data-test='error']" },
      "then": [
        { "type": "store_text", "selector": "[data-test='error']", "var": "errorText" },
        { "type": "export", "key": "loginError", "value": "{{errorText}}" },
        { "type": "fail", "message": "Login failed: {{errorText}}" }
      ],
      "else": [
        { "type": "assert_visible", "selector": ".inventory_list", "message": "Login succeeded" }
      ]
    }
  ]
}
```

How this runs at runtime:
- The interpreter substitutes `{{username}}/{{password}}` from `TestRun.variables` / dataset / extracted vars.
- It calls:
  - `playwright.navigate(url)`
  - `playwright.fill(selector, value)` (Playwright Java `locator.fill`)
  - `playwright.click(selector)`
- It evaluates the `if` by calling `playwright.isVisible(selector)`.
- On failure, it throws a `UserFacingStepException("Login failed: ...")` so UI gets a clean message.

### Example: bounded loop (“repeatUntil” with maxIterations)

This pattern is how you safely represent loops in a UI-editable DSL without risking infinite runs.

Use case: you click “Load more” until a specific product appears (or you hit a hard limit).

```json
{
  "name": "loadUntilProductVisible",
  "steps": [
    { "type": "navigate", "url": "https://example.com/products" },

    {
      "type": "repeatUntil",
      "maxIterations": 10,
      "condition": { "type": "visible", "selector": ".product-card:has-text(\"Sauce Labs Fleece Jacket\")" },
      "body": [
        { "type": "click", "selector": "button:has-text(\"Load more\")" },
        { "type": "wait_for_visible", "selector": ".product-card", "timeoutMs": 5000 }
      ],
      "onTimeout": [
        { "type": "fail", "message": "Product did not appear after loading more items." }
      ]
    },

    { "type": "click", "selector": ".product-card:has-text(\"Sauce Labs Fleece Jacket\") button[data-test^='add-to-cart']" }
  ]
}
```

How this runs at runtime:
- Each iteration evaluates the condition via `playwright.isVisible(selector)`.
- If false, it runs `body` and increments the counter.
- If the condition never becomes true, the interpreter stops after `maxIterations` and executes `onTimeout` (failing the step with a clean message).

### Relationship to the jar approach

- **Jar approach** is best when you want “real Java” flexibility and are okay treating page objects as deployable code artifacts.
- **DSL approach** is best when you want **UI-editable**, **safe**, **deterministic**, and **portable** flows (and you can live with a bounded set of primitives).

You can also combine them:
- Start with **jar method-only** (fastest to get full Java power).
- Add **DSL for UI-built flows** (modules/tests), and optionally let DSL call into jar methods as a single primitive like `call_method`.

## What kinds of steps work with this approach

### Works well

- **Clicks / fills / hovers / selects**:
  - If implemented inside page object methods (Mode A), or
  - If plugin exposes element registry (Mode B)
- **Any Java control flow** in methods:
  - loops, if/else, helper methods, streams, collections
- **Complex validations**:
  - return boolean for assertions (fail step if false)
- **Reusable helpers**:
  - calling one page method from another is natural
- **Dynamic locators**:
  - `locator.filter(...)`, `nth(...)`, `getByRole(...)`, etc.

### Works with mapping

- Mapping can produce:
  - `call_method` (best)
  - optionally, element actions if you expose element registry

### Limitations / non-goals

- If you don’t expose an element registry, “click <elementName>” steps can’t be executed directly; you must map them to a method call.
- Runtime jar loading still requires operational hygiene:
  - artifact upload, caching, version compatibility.

## Summary recommendation

If you want **maximum Java flexibility**, the jar approach is the right long-term model:
- Prefer **Mode A (method-only)** at first (simplest + most powerful).
- Add **Mode B (element registry)** later only if you truly need element-level actions outside methods.

## Which approach is best? (my opinion)

The “best” choice depends on what you want the UI to do.

- If your goal is **UI-editable flows** (including safe loops/if/else), the **Structured DSL (JSON)** approach is the best long-term foundation.
- If your goal is **only**: “users write English steps, and we map them to *existing executable code*”, then the **Plugin JAR (method-first)** approach is typically best (because it runs the real page-object Java without a custom interpreter).

### Quick comparison

- **Structured DSL (JSON interpreter)** — *best for UI-editable, safe, deterministic execution*
  - **Pros**: UI can edit reliably; explicit control-flow; easy validation; “safe by design”; portable across environments; no jar/version/classloader complexity.
  - **Cons**: you must define/maintain the primitive set; very complex custom logic needs either more primitives or an “escape hatch”.

- **Plugin JAR (page objects as deployable code)** — *best for maximum Java power with clean semantics*
  - **Pros**: full Java expressiveness (loops, helpers, streams); no custom parser; page object code is the runtime truth; nested method calls “just work”.
  - **Cons**: operational overhead (build/distribute/version jars); dependency compatibility (Playwright); still “code deploy” (needs trust + review); not inherently UI-editable unless UI is generating code.

- **DB “Java-like” methodBody + custom interpreter (current)** — *best as a bridge / bootstrap, not the end-state*
  - **Pros**: fastest to bootstrap from existing page objects; no jar pipeline needed; editable in admin UI today.
  - **Cons**: interpreter grows forever; every new Java/Playwright pattern becomes “unsupported statement”; hardest to make both safe and feature-complete; UI edits are still text-editing (fragile).

### Recommendation (practical)

- **If you want UI-editable flows**: invest in **Structured DSL JSON** as the canonical representation for tests/modules/screen methods.
- **If you want English → existing code** (your stated preference): choose **Plugin JAR (method-first)** and make the mapper output mostly `call_method` steps.
- **Near-term migration**: keep the current interpreter only as a **bridge** while you move to the chosen end-state.

In other words:
- **DSL** is best when the UI must *author/edit the flow*.
- **JAR** is best when the UI must *only author English* and the system maps to *real Java methods*.
- The **current interpreter** is best for bootstrap/migration speed, not as the final destination.

## How step mapping works if we switch to the JAR approach

Switching execution to a plugin jar does **not** remove the need for mapping; it changes what the mapper targets.

### What mapping outputs (still stored in `TestStep`)

Keep the same idea you already implemented: map natural language at **save-time** into deterministic columns:

- `TestStep.type`: `call_method | click | fill | select_by_value | select_by_label | hover | press_key | navigate`
- `TestStep.selector`:
  - for methods: `screenName::methodName`
  - for element actions (if supported): `screenName::elementName` (or just `elementName` if screen is implicit)
- `TestStep.value`:
  - for element actions: string value (e.g., text to fill, key to press, label/value)
  - for methods: JSON array string of args, e.g. `["standard_user","secret_sauce"]`

At runtime, the executor becomes:
- **method call** → invoke plugin screen method with args
- **element action** → resolve elementName to a `Locator` via plugin registry (if you expose it) and call Playwright Java (`locator.fill/click/...`)

### What the mapper needs from the plugin jar

To map reliably, the mapper needs a list of valid targets. With a jar, you can provide this in two ways:

#### Option A (recommended): plugin exposes a registry (no reflection scraping)

Expose metadata via the plugin API:
- **screens**: `products`, `login`, etc.
- **methods** per screen:
  - name
  - parameter names/types/count
  - optional description/examples (helps LLM mapping)
- optional **elements** per screen:
  - elementName → selector or a factory that returns `Locator`
  - supported actions (fill/click/select)

This avoids brittle “scan classes with reflection and guess”.

#### Option B: backend reflects on classes (works, but less stable)

Backend loads plugin classes and uses reflection to list:
- public methods
- parameter counts and types

This is workable for mapping “call_method”, but you’ll lose:
- parameter names (often not available unless compiled with debug info)
- human-friendly descriptions (unless you add annotations)

### Save-time flow (high level)

1) User saves a test step instruction like:  
   “add to cart product named Sauce Labs Fleece Jacket”

2) Mapping service loads “known targets” for the app:
- screens + method names (+ params)
- optionally element names (+ supported actions)

3) Mapper (LLM or deterministic rules) produces strict JSON like:

```json
{ "action": "call_method", "screen": "products", "targetType": "method", "target": "addToCart", "args": ["Sauce Labs Fleece Jacket"] }
```

4) Persist into `TestStep`:
- `type=call_method`
- `selector=products::addToCart`
- `value=["Sauce Labs Fleece Jacket"]`

5) Runtime execution is fully deterministic: no LLM calls needed unless a step is unmapped and you choose to do one-time “catch-up mapping”.

### How element-action mapping would work (if you expose element registry)

Instruction: “enter {{username}} in username”

Mapper output:
- `type=fill`
- `selector=login::usernameInput` (elementName)
- `value={{username}}`

Runtime:
- plugin resolves `usernameInput` → `Locator`
- backend calls `locator.fill(resolvedValue)`

### Handling method signature changes

If a method changes (renamed params, new param added), mapping can fail in two predictable places:
- **save-time**: mapper can’t find a matching method name/arity → force user to re-save/remap
- **run-time**: invocation throws because arg count/type mismatch → fail step with a clean message

To make this robust:
- version the plugin (`pluginVersion`) and pin tests to a version (optional)
- include parameter counts/types in the mapping prompt so the mapper chooses valid arity

### Recommendation for jar + mapping

- Prefer mapping to **`call_method`** first (more stable, less metadata needed).
- Add **element-action mapping** only if you actually want tests that do “click/fill X” without writing a method.


## Current approach (today): DB screen metadata + save-time mapping + custom stored-method executor

This section documents how the **current** system works end-to-end, with the main classes/methods involved at each stage.

### Stage 0 — Populate “known targets” (screens/elements/methods) into the DB

This is how the system learns what it can map English steps *to*.

- **Controller**: `AppAdminController` (SUPER_ADMIN-only)
  - **Import elements**: `POST /api/admin/apps/.../import-elements-from-java?sourcePath=...`
    - Calls `JavaLocatorImportService.loadElementsFromJavaSource(sourcePath)`
    - Parses `page.locator("...")` assignments into `ScreenElement` records under `Screen.elements`
  - **Import methods**: `POST /api/admin/apps/by-name/{appName}/screens/{screenName}/import-methods-from-java?sourcePath=...`
    - Calls `JavaMethodImportService.loadMethodsFromJavaSource(sourcePath)`
    - Extracts `public ... method(...) { ... }` blocks into `ScreenMethod` records under `Screen.methods`
    - Stores `methodSignature`, `methodBody`, and parameter metadata
- **Safety**:
  - `JavaLocatorImportService` and `JavaMethodImportService` enforce `sourcePath` must resolve under `backend/src/main/java` and be a `.java` file (allowlist file read).

### Stage 1 — Save-time step mapping (English → deterministic `TestStep` columns)

Mapping happens when tests are created/updated/copied so runtime can be token-free.

- **Entry points**: `TestController`
  - `createTest(...)` → `testStepMappingService.mapTestSteps(test)`
  - `updateTest(...)` → `testStepMappingService.mapTestSteps(existing)` **only if** the request includes `steps`
  - `copyTest(...)` → `testStepMappingService.mapTestSteps(copy)`
- **Core mapper**: `TestStepMappingService.mapTestSteps(Test test)`
  - Requires `test.appId` (resolved from URL via `AppResolutionService` in the controller if needed)
  - Iterates steps in order, tracking `lastScreen` + `executedSoFar`
  - Two mapping strategies:
    - **LLM mapping** (preferred when enabled): `tryMapWithLlm(...)` → `applyMappedStep(...)`
      - Writes:
        - `step.type` (e.g., `fill`, `click`, `call_method`)
        - `step.selector` (CSS for element actions, or `screen::method` for methods)
        - `step.value` (string value or JSON array string for method args)
    - **Deterministic parser fallback**: `Parsed.parse(instruction)`
      - Handles simple formats; leaves step unmapped if unsupported
      - Resolves:
        - element actions via `resolveAcrossScreens(...)` / `resolveWithinScreen(...)`
        - method calls via `resolveMethodAcrossScreens(...)`
- **Privacy/visibility** (UI):
  - `TestController.sanitizeTestForResponse(...)` strips `TestStep.type/selector/value` for non-`SUPER_ADMIN` users.

### Stage 2 — Runtime “catch-up mapping” (only if save was interrupted)

If a user navigated away mid-save and mappings are missing, runtime does a one-time fix and persists it.

- **Entry point**: `TestExecutionService.executeTest(...)`
  - Checks `needsRuntimeMapping(test)`
  - If true: `testStepMappingService.mapTestSteps(test)` + `testRepository.save(test)`

### Stage 3 — Runtime execution path selection (deterministic vs AI)

- **Entry point**: `TestExecutionService.executeTest(...)`
  - If `test.appId != null` → deterministic path: `executeDeterministicSteps(test, testRun, variables)`
  - Else → AI path: `executeStepWithAI(...)` via `AiTestExecutionService`
  - **Modules**: module-based tests currently expand and still run via the AI path (`executeModuleSteps(...)` → `executeStepWithAI(...)`).

### Stage 4 — Deterministic execution (mapped steps and fallback)

- **Loop**: `TestExecutionService.executeDeterministicSteps(...)`
  - Ensures browser exists: `playwrightJavaService.ensureStarted()`
  - For each `TestStep`:
    - If mapped (`isMappedDeterministicStep(step)`):
      - Runs: `executeMappedDeterministicStep(app, step, variables)`
        - Element actions call Playwright directly:
          - `PlaywrightJavaService.fill/click/hover/selectByValue/selectByLabel/press/navigate`
          - Variable substitution: `resolveTemplate(...)` supports `{{var}}` (plus back-compat `${var}`)
        - Method calls:
          - Parses selector format `screenName::methodName`
          - Loads screen: `screenRepository.findByApp_IdAndName(appId, screenName)`
          - Parses args: `storedMethodExecutionService.parseArgsFromStepValue(step.value)` (JSON array or legacy CSV)
          - Executes: `storedMethodExecutionService.execute(screen, methodName, args)`
          - If boolean-returning method returns `false` or `null` (when expected): fails step using a clean `UserFacingStepException`
      - Screenshot/scroll:
        - `playwrightJavaService.scrollIntoView(selector)` or `scrollToActiveElement()`
        - `playwrightJavaService.screenshot(path)`
    - If **not mapped** (legacy deterministic fallback):
      - Infers screen: `screenInferenceService.inferScreenName(app.info, screenNames, executed, lastScreen)`
      - Parses English with `ParsedStep.parse(step.instruction)`
      - Resolves element via DB metadata (`Screen.elements`) and executes `executeParsedAction(...)`
      - Can also execute an unmapped `call_method` via `storedMethodExecutionService.execute(...)` (legacy path)

### Stage 5 — “Custom Java parser” for stored methods (how `methodBody` runs)

This is the “safe subset” interpreter that executes `ScreenMethod.methodBody` (stored as Java-ish source) without compiling it.

- **Entry**: `StoredMethodExecutionService.execute(Screen screen, String methodName, List<String> args)`
  - Looks up `ScreenMethod` and reads `methodBody`
  - Parses directives from comments (for user-facing behavior):
    - `// @onSuccess: ...`, `// @onFailure: ...`, `// @log: ...`, `// @export: ...`
  - Binds method params: `bindParams(...)`
  - Executes the body line-by-line: `processLines(...)`
    - Supports specific statement patterns via regex (examples):
      - locator assignments like `Locator x = page.locator(...)`
      - actions like `page.locator(...).fill(...)`, `x.click()`, `x.selectByValue(...)`
      - chained locators + filters like `filter(...).first()/nth()/last()`
      - safe `if/else` blocks via `parseIfElseBlock(...)` + `evalIfCondition(...)`
      - `textContent()` assignments into local vars
    - Converts each supported action into a real Playwright call via `PlaywrightJavaService`
  - Returns `StoredMethodResult` with:
    - `booleanValue` (+ `booleanReturnExpected`)
    - `successMessage` / `failureMessage`
    - `extractedVariables`

### Why this matters for the jar decision

This current approach is powerful for bootstrapping, but every time a page-object method uses a new Java/Playwright pattern, you risk hitting **“Unsupported statement”** and needing to extend the interpreter. The jar approach avoids that by executing compiled page-object code directly.



====================

Yes — the mapping fields on TestStep stay the same in all approaches. What changes is how execution interprets them.
What gets stored (always the same)
For each English step we store a single deterministic command in existing columns:
TestStep.type: fill | click | select_by_value | select_by_label | hover | press_key | navigate | call_method
TestStep.selector:
element actions → a concrete selector (today: CSS string from Screen.elements)
method calls → screenName::methodName
TestStep.value:
element actions → value/label/key/url
method calls → JSON array string of args (or legacy CSV)
That is “the mapping”.
What is different between current vs DSL vs jar
Only the runtime executor changes:
Element actions (fill/click/...) → always call PlaywrightJavaService directly (same for all).
call_method:
Current: execute ScreenMethod.methodBody via StoredMethodExecutionService
JAR: invoke the compiled page-object method in the plugin jar
DSL: run ScreenMethod.dslJson via a DSL interpreter
Where DSL would be stored (not in TestStep)
DSL is not a “different mapping” for the test step. DSL is an implementation of a screen method (the thing referenced by call_method), stored on ScreenMethod (e.g., dslJson) rather than in TestStep.
If your goal is jar, you can ignore DSL entirely: keep the same TestStep mapping and just change the call_method executor to call into the jar.
what is ScreenMethod.dslJson?

ScreenMethod.dslJson is not something that exists in your code today.
It’s the proposed future field on the ScreenMethod entity where we would store a structured DSL definition (JSON) of a screen method, instead of storing Java-ish source in ScreenMethod.methodBody.
Conceptually:
Today: ScreenMethod.methodBody (TEXT) = stored Java-like method body, executed by StoredMethodExecutionService.
Proposed DSL: ScreenMethod.dslJson (TEXT/JSON) = stored JSON steps/blocks, executed by a new DslExecutionService.
In the jar approach, you likely don’t need dslJson at all, because methods live and execute inside the plugin jar.