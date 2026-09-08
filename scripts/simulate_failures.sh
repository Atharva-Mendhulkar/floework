#!/bin/bash

# Configuration
API_URL="https://floework.vercel.app/api/tasks"
PROJECT_ID="d5b480c4-ce88-4a96-aeae-7386b436a8ac"
AUTH_TOKEN=${AUTH_TOKEN:-$(grep -s COGNITO_ID_TOKEN .env.local | cut -d'=' -f2 || echo "test-auth-token")}

echo "--- Scenario A.1: Task Status Update Conflict ---"
echo "Injecting 2s delay via header..."

# Simulate Tab A update
curl -X PATCH "$API_URL" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-sim-delay: 2000" \
  -d "{\"id\":\"t1\", \"status\":\"in_progress\", \"projectId\":\"$PROJECT_ID\"}" &
PID1=$!

# Simulate Tab B update immediately after
echo "Tab B update (race conditions)..."
curl -X PATCH "$API_URL" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"id\":\"t1\", \"status\":\"review\", \"projectId\":\"$PROJECT_ID\"}" &
PID2=$!

wait $PID1 $PID2
echo "Scenario A.1 Complete"

echo "--- Scenario C.1: API Failure After Optimistic Update ---"
echo "Injecting failure probability via header..."
curl -X PATCH "$API_URL" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-sim-fail: true" \
  -d "{\"id\":\"t2\", \"status\":\"done\", \"projectId\":\"$PROJECT_ID\"}"
echo "Scenario C.1 Complete"
