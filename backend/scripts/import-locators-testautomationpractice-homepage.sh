#!/usr/bin/env bash
set -euo pipefail

# Imports Screen.elements for an app screen by parsing `page.locator("...")` assignments
# from a Java source file under backend/src/main/java.
#
# Defaults match the testautomationpractice homepage example.
#
# Usage:
#   backend/scripts/import-locators-testautomationpractice-homepage.sh
#
# Optional env overrides:
#   BASE_URL="http://localhost:8080"
#   APP_NAME="testautomationpractice"
#   SCREEN_NAME="homepage"
#   SOURCE_PATH="src/main/java/testautomationpractice/HomePage.java"
#   DEV_SUB="superadmin"
#
# Output:
#   Prints the JSON response from the import endpoint.

BASE_URL="${BASE_URL:-http://localhost:8080}"
APP_NAME="${APP_NAME:-testautomationpractice}"
SCREEN_NAME="${SCREEN_NAME:-homepage}"
SOURCE_PATH="${SOURCE_PATH:-src/main/java/testautomationpractice/HomePage.java}"
DEV_SUB="${DEV_SUB:-superadmin}"

echo "Base URL:     $BASE_URL"
echo "App:          $APP_NAME"
echo "Screen:       $SCREEN_NAME"
echo "Source path:  $SOURCE_PATH"
echo "Dev subject:  $DEV_SUB"
echo ""

# Fetch a SUPER_ADMIN JWT using the dev-token endpoint
TOKEN="$(
  curl -sS "${BASE_URL}/api/public/dev-token?role=SUPER_ADMIN&sub=${DEV_SUB}" \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["token"])'
)"

curl -sS -X POST \
  "${BASE_URL}/api/admin/apps/by-name/${APP_NAME}/screens/${SCREEN_NAME}/import-elements-from-java?sourcePath=${SOURCE_PATH}" \
  -H "Authorization: Bearer ${TOKEN}" \
  | python3 -c 'import sys,json; print(json.dumps(json.load(sys.stdin), indent=2))'

echo ""
echo "Importing methods from the same source file..."
curl -sS -X POST \
  "${BASE_URL}/api/admin/apps/by-name/${APP_NAME}/screens/${SCREEN_NAME}/import-methods-from-java?sourcePath=${SOURCE_PATH}" \
  -H "Authorization: Bearer ${TOKEN}" \
  | python3 -c 'import sys,json; print(json.dumps(json.load(sys.stdin), indent=2))'


