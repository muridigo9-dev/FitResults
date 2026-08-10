#!/bin/bash

# =====================================================
# Script: Run All Tests
# Description: Executa todos os testes (unit + E2E)
# =====================================================

set -e # Exit on error

echo "🧪 Flexi Bloom Core - Test Suite"
echo "================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Supabase is running
echo "🔍 Checking Supabase status..."
if ! supabase status > /dev/null 2>&1; then
  echo -e "${RED}❌ Supabase is not running!${NC}"
  echo "   Run: supabase start"
  exit 1
fi
echo -e "${GREEN}✅ Supabase is running${NC}"
echo ""

# Check if migrations are applied
echo "🔍 Checking migrations..."
MIGRATION_COUNT=$(supabase db diff | wc -l)
if [ "$MIGRATION_COUNT" -gt 5 ]; then
  echo -e "${YELLOW}⚠️  Unapplied migrations detected${NC}"
  echo "   Run: supabase db push"
  read -p "   Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi
echo -e "${GREEN}✅ Migrations OK${NC}"
echo ""

# Get Supabase credentials
export SUPABASE_URL=$(supabase status --output json | grep -o '"API URL":"[^"]*"' | cut -d'"' -f4)
export SUPABASE_ANON_KEY=$(supabase status --output json | grep -o '"anon key":"[^"]*"' | cut -d'"' -f4)
export SUPABASE_SERVICE_ROLE_KEY=$(supabase status --output json | grep -o '"service_role key":"[^"]*"' | cut -d'"' -f4)
export APP_URL="http://localhost:5173"

echo "📊 Environment:"
echo "   SUPABASE_URL: $SUPABASE_URL"
echo "   APP_URL: $APP_URL"
echo ""

# Counter for results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run test
run_test() {
  local test_name=$1
  local test_file=$2
  
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🧪 Running: $test_name"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  if deno test --allow-net --allow-env "$test_file"; then
    echo -e "${GREEN}✅ PASSED: $test_name${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    echo -e "${RED}❌ FAILED: $test_name${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
  
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  echo ""
}

# Run Unit Tests
echo "╔════════════════════════════════════════════════╗"
echo "║         UNIT TESTS - Edge Functions            ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

run_test "create-invite" "supabase/functions/create-invite/create-invite.test.ts"
run_test "accept-invite" "supabase/functions/accept-invite/accept-invite.test.ts"

# Run E2E Tests
echo "╔════════════════════════════════════════════════╗"
echo "║              E2E TESTS - Flows                 ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

run_test "Invite Flow" "tests/e2e/invite-flow.test.ts"

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 TEST SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Total Tests:  $TOTAL_TESTS"
echo -e "${GREEN}Passed:       $PASSED_TESTS${NC}"
if [ $FAILED_TESTS -gt 0 ]; then
  echo -e "${RED}Failed:       $FAILED_TESTS${NC}"
else
  echo "Failed:       $FAILED_TESTS"
fi
echo ""

# Exit with error if any test failed
if [ $FAILED_TESTS -gt 0 ]; then
  echo -e "${RED}❌ Some tests failed${NC}"
  exit 1
else
  echo -e "${GREEN}🎉 All tests passed!${NC}"
  exit 0
fi
