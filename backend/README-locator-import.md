# Java Locator Import (SUPER_ADMIN)

This backend supports **importing element locators from Java page-object source files** into an app screen’s runtime registry (`Screen.elements`).

This is useful when you want to keep the DB’s stored screen metadata in sync with a page-object file that contains `page.locator("...")` assignments.

## What gets imported

The importer scans a Java source file for assignments like:

```java
nameInput = page.locator("input[name='name']");
submitButton = page.locator("button[type='submit']");
```

For each match it creates a `ScreenElementRequest` with:

- `elementName`: the variable name (e.g., `nameInput`)
- `selectorType`: `css`
- `selector`: the selector string inside `page.locator("...")`
- `elementType`: inferred from the selector prefix (`input/select/button/...`)
- `actionsSupported`: inferred from `elementType`

## Security / safety constraints

- **Role**: endpoints are **SUPER_ADMIN-only** (controller has `@PreAuthorize("hasRole('SUPER_ADMIN')")`).
- **File allowlist**: `sourcePath` must resolve under:
  - `backend/src/main/java`
- **File type**: must be a `.java` file
- **Max size**: 1MB (to prevent accidental huge reads)

## API endpoint

### Import locators into a screen (generic)

`POST /api/admin/apps/by-name/{appName}/screens/{screenName}/import-elements-from-java?sourcePath=...`

Example:

```bash
TOKEN="<SUPER_ADMIN_JWT>"
curl -X POST \
  "http://localhost:8080/api/admin/apps/by-name/testautomationpractice/screens/homepage/import-elements-from-java?sourcePath=src/main/java/testautomationpractice/HomePage.java" \
  -H "Authorization: Bearer $TOKEN"
```

Response example:

```json
{
  "appId": 10,
  "appName": "testautomationpractice",
  "screenName": "homepage",
  "sourcePath": "src/main/java/testautomationpractice/HomePage.java",
  "elementsImported": 43
}
```

### Back-compat alias

Older endpoint name (kept for convenience):

`POST /api/admin/apps/by-name/{appName}/screens/{screenName}/import-elements-from-homepage-java`

This simply calls the generic endpoint with:

- `sourcePath=src/main/java/testautomationpractice/HomePage.java`

## Implementation

- **Importer**: `backend/src/main/java/com/youraitester/service/JavaLocatorImportService.java`
- **Method importer**: `backend/src/main/java/com/youraitester/service/JavaMethodImportService.java`
- **Controller**: `backend/src/main/java/com/youraitester/controller/AppAdminController.java`

## Importing methods (signatures + bodies)

`POST /api/admin/apps/by-name/{appName}/screens/{screenName}/import-methods-from-java?sourcePath=...`

Example:

```bash
TOKEN="<SUPER_ADMIN_JWT>"
curl -X POST \
  "http://localhost:8080/api/admin/apps/by-name/testautomationpractice/screens/homepage/import-methods-from-java?sourcePath=src/main/java/testautomationpractice/HomePage.java" \
  -H "Authorization: Bearer $TOKEN"
```

## Known limitations

- Only matches `page.locator("...")` assignments that use **double quotes** and end with a semicolon.
- Does **not** yet parse `getByRole(...)`, `getByTestId(...)`, chained locators, or variables/constants.
- The selector type is always stored as **css**.
- Method import is a lightweight parser (not JavaParser). It focuses on typical page-object `public` methods.


