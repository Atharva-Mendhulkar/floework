#!/bin/bash
set -e

echo "🚀 Starting Production Verification..."

# 1. Run migrations
echo "Applying migrations..."
supabase db push

# 2. Run Security Guardian check
echo "Running Security Guardian invariants check..."
GUARDIAN_OUTPUT=$(supabase db query --linked "SELECT * FROM verify_security_invariants();" --output json)

# 3. Parse output
# The output format for agents is JSON with a boundary. We just need to check if "rows" is empty.
if echo "$GUARDIAN_OUTPUT" | grep -q '"rows": \[\]'; then
  echo "✅ Security Invariants Verified. No permissive policies found."
else
  echo "❌ SECURITY ALERT: Permissive policies or invariants violations found!"
  echo "$GUARDIAN_OUTPUT"
  exit 1
fi

echo "✅ Production deployment verified as secure."
