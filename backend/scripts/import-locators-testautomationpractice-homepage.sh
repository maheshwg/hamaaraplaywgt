#!/usr/bin/env bash
set -euo pipefail

# Imports Screen.elements + Screen.methods for one or more screens by parsing a Java source file under
# backend/src/main/java.
#
# Default behavior (backwards-compatible): imports a SINGLE screen from SCREEN_NAME + SOURCE_PATH.
#
# Optional env overrides:
#   BASE_URL="http://localhost:8080"
#   APP_NAME="saucedemo"
#   SCREEN_NAME="products"
#   SOURCE_PATH="src/main/java/saucedemo/Products.java"
#   DEV_SUB="superadmin"
#
# Multi-import (repeatable):
#   backend/scripts/import-locators-testautomationpractice-homepage.sh \
#     --app saucedemo \
#     --import products=src/main/java/saucedemo/Products.java \
#     --import login=src/main/java/saucedemo/LoginPage.java
#
# Manifest file (one per line, # comments allowed):
#   backend/scripts/import-locators-testautomationpractice-homepage.sh \
#     --app saucedemo \
#     --manifest backend/scripts/import-manifest.txt
#   where import-manifest.txt lines look like:
#     products=src/main/java/saucedemo/Products.java
#     login=src/main/java/saucedemo/LoginPage.java

BASE_URL="${BASE_URL:-http://localhost:8080}"
APP_NAME="${APP_NAME:-saucedemo}"
SCREEN_NAME="${SCREEN_NAME:-products}" # single-import default
SOURCE_PATH="${SOURCE_PATH:-src/main/java/saucedemo/Products.java}" # single-import default
DEV_SUB="${DEV_SUB:-superadmin}"

usage() {
  cat <<'USAGE'
Usage:
  backend/scripts/import-locators-testautomationpractice-homepage.sh [flags]

Flags:
  --base-url URL         (default: http://localhost:8080)
  --app APP_NAME         (default: from APP_NAME env)
  --dev-sub SUBJECT      (default: superadmin)
  --import screen=path   (repeatable; imports elements+methods for each screen)
  --manifest FILE        (each non-empty non-comment line: screen=path)
  -h|--help              show help

Notes:
  - If no --import/--manifest provided, falls back to single import using SCREEN_NAME + SOURCE_PATH env vars.
USAGE
}

IMPORTS=()
MANIFEST=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base-url) BASE_URL="${2:-}"; shift 2 ;;
    --app) APP_NAME="${2:-}"; shift 2 ;;
    --dev-sub) DEV_SUB="${2:-}"; shift 2 ;;
    --import) IMPORTS+=("${2:-}"); shift 2 ;;
    --manifest) MANIFEST="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *)
      echo "Unknown argument: $1"
      usage
      exit 2
      ;;
  esac
done

if [[ -n "${MANIFEST}" ]]; then
  if [[ ! -f "${MANIFEST}" ]]; then
    echo "ERROR: manifest not found: ${MANIFEST}"
    exit 2
  fi
  while IFS= read -r line; do
    line="${line%$'\r'}"
    [[ -z "${line// /}" ]] && continue
    [[ "${line}" =~ ^[[:space:]]*# ]] && continue
    IMPORTS+=("${line}")
  done < "${MANIFEST}"
fi

if [[ ${#IMPORTS[@]} -eq 0 ]]; then
  IMPORTS+=("${SCREEN_NAME}=${SOURCE_PATH}")
fi

echo "Base URL:     $BASE_URL"
echo "App:          $APP_NAME"
echo "Dev subject:  $DEV_SUB"
echo "Imports:      ${#IMPORTS[@]}"
echo ""

# Fetch a SUPER_ADMIN JWT using the dev-token endpoint
DEV_TOKEN_URL="${BASE_URL}/api/public/dev-token?role=SUPER_ADMIN&sub=${DEV_SUB}"
DEV_TOKEN_RESP="$(curl -sS -f "${DEV_TOKEN_URL}" || true)"
if [[ -z "${DEV_TOKEN_RESP}" ]]; then
  echo "ERROR: dev-token endpoint returned empty response."
  echo "URL: ${DEV_TOKEN_URL}"
  exit 1
fi
TOKEN="$(
  printf "%s" "${DEV_TOKEN_RESP}" \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["token"])' 2>/dev/null || true
)"
if [[ -z "${TOKEN}" ]]; then
  echo "ERROR: Could not parse dev-token JSON response."
  echo "URL: ${DEV_TOKEN_URL}"
  echo "Raw response:"
  echo "${DEV_TOKEN_RESP}"
  exit 1
fi

failures=0
for spec in "${IMPORTS[@]}"; do
  if [[ "${spec}" != *"="* ]]; then
    echo "ERROR: invalid import spec (expected screen=path): ${spec}"
    failures=$((failures + 1))
    continue
  fi

  screen="${spec%%=*}"
  path="${spec#*=}"
  screen="$(echo -n "${screen}" | xargs)"
  path="$(echo -n "${path}" | xargs)"

  if [[ -z "${screen}" || -z "${path}" ]]; then
    echo "ERROR: invalid import spec (empty screen or path): ${spec}"
    failures=$((failures + 1))
    continue
  fi

  echo "───────────────────────────────────────────────────────────"
  echo "Screen:       ${screen}"
  echo "Source path:  ${path}"

  encoded_path="$(
    python3 -c 'import sys,urllib.parse; print(urllib.parse.quote(sys.argv[1]))' "${path}"
  )"

  echo ""
  echo "Importing elements..."
  curl -sS -X POST -f \
    "${BASE_URL}/api/admin/apps/by-name/${APP_NAME}/screens/${screen}/import-elements-from-java?sourcePath=${encoded_path}" \
    -H "Authorization: Bearer ${TOKEN}" \
    | python3 -c 'import sys,json; print(json.dumps(json.load(sys.stdin), indent=2))' 2>/dev/null \
    || { echo "ERROR: import-elements-from-java failed for screen='${screen}'"; failures=$((failures + 1)); }

  echo ""
  echo "Importing methods..."
  curl -sS -X POST -f \
    "${BASE_URL}/api/admin/apps/by-name/${APP_NAME}/screens/${screen}/import-methods-from-java?sourcePath=${encoded_path}" \
    -H "Authorization: Bearer ${TOKEN}" \
    | python3 -c 'import sys,json; print(json.dumps(json.load(sys.stdin), indent=2))' 2>/dev/null \
    || { echo "ERROR: import-methods-from-java failed for screen='${screen}'"; failures=$((failures + 1)); }

  echo ""
done

if [[ "${failures}" -gt 0 ]]; then
  echo "ERROR: ${failures} import(s) failed."
  exit 1
fi
