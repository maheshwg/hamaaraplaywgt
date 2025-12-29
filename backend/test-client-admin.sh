#!/bin/bash

# First, login to get a token
echo "Logging in as client admin..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "client@test.com",
    "password": "password"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | sed 's/"token":"\(.*\)"/\1/')

if [ -z "$TOKEN" ]; then
  echo "Login failed!"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "Token: ${TOKEN:0:20}..."

# Now fetch projects
echo -e "\nFetching projects..."
curl -s -X GET http://localhost:8080/api/client-admin/projects \
  -H "Authorization: Bearer $TOKEN" | jq '.'
