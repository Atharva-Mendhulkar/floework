#!/bin/bash

# Configuration
API_URL="https://floework.vercel.app/api/tasks"
PROJECT_ID="d5b480c4-ce88-4a96-aeae-7386b436a8ac"
AUTH_TOKEN=$(grep NEXT_PUBLIC_SUPABASE_ANON_KEY .env.local | cut -d'=' -f2)

echo "--- Starting Mutation Storm (A.1 / C.1) ---"

# We will send 10 updates to the same task with different statuses
# Each will have random backend delay (handled by x-sim-storm header)

STATUSES=("pending" "in-progress" "review" "done")

for i in {1..10}
do
  STATUS=${STATUSES[$((RANDOM % 4))]}
  echo "Mutation $i: setting status to $STATUS"
  
  curl -X PATCH "$API_URL" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -H "x-sim-storm: true" \
    -d "{\"id\":\"t1\", \"status\":\"$STATUS\", \"projectId\":\"$PROJECT_ID\"}" &
done

wait
echo "Storm Complete. Checking final state..."
