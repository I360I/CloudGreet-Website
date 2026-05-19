#!/usr/bin/env bash
# Re-wires general_tools (including the new warm_transfer config) on every
# live Retell agent, by hitting your own /api/admin/retell/wire-tools.
#
# Usage:
#   ADMIN_JWT=eyJ... ./scripts/resync-warm-transfer.sh
#
# Get ADMIN_JWT by logging into cloudgreet.com/admin in your browser, opening
# DevTools -> Application -> Cookies, and copying the value of the auth cookie
# (or copy the Bearer token from a Network tab admin request). The script
# POSTs to prod, so this runs against your live agents.

set -euo pipefail

if [[ -z "${ADMIN_JWT:-}" ]]; then
  echo "ADMIN_JWT is required. Set it to your admin auth cookie/token." >&2
  exit 1
fi

BASE="${BASE_URL:-https://cloudgreet.com}"

# All businesses with retell_agent_id as of 2026-05-18
BUSINESS_IDS=(
  "9cead2f6-a6c7-442b-8ff9-6f12c2762d71"   # test 2 (43 calls)
  "e5e08d78-8618-4063-ac74-2f2084eccd45"   # A1 Plus Electrical (2 calls)
  "6ea7f3f0-abfd-4c56-86b2-f90d4615de9e"   # ITZ ELECTRIC INC (1 call)
  "49561e5f-d9a9-46bb-8077-64da2202e210"   # TOP NOTCH A/C (1 call)
  "5863dc7d-a374-4783-ae3c-c69d1a30af8e"   # A1 Plus Electrical (0 calls)
)

for id in "${BUSINESS_IDS[@]}"; do
  echo "=== $id ==="
  curl -s -X POST "$BASE/api/admin/retell/wire-tools" \
    -H "Content-Type: application/json" \
    -H "Cookie: cg_session=$ADMIN_JWT" \
    -d "{\"businessId\":\"$id\"}" | tee /dev/stderr
  echo
done
