#!/bin/bash

# Pre-Deployment Check Script
# Runs all checks before deployment

set -e

echo "🚀 CloudGreet Pre-Deployment Checks"
echo "===================================="
echo ""

ERRORS=0
WARNINGS=0

# Check 1: Environment Variables
echo "1️⃣  Checking Environment Variables..."
if node scripts/validate-env.js; then
    echo "✅ Environment variables validated"
else
    echo "❌ Environment variable validation failed"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check 2: TypeScript Compilation
echo "2️⃣  Checking TypeScript..."
if npm run type-check 2>/dev/null || pnpm type-check 2>/dev/null || npx tsc --noEmit 2>/dev/null; then
    echo "✅ TypeScript compilation successful"
else
    echo "❌ TypeScript compilation failed"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check 3: Linting
echo "3️⃣  Checking Linting..."
if npm run lint 2>/dev/null || pnpm lint 2>/dev/null || npx eslint . 2>/dev/null; then
    echo "✅ Linting passed"
else
    echo "⚠️  Linting warnings (non-blocking)"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# Check 4: Build Test
echo "4️⃣  Testing Build..."
if npm run build 2>/dev/null || pnpm build 2>/dev/null; then
    echo "✅ Build successful"
else
    echo "❌ Build failed"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check 5: Database Migrations
echo "5️⃣  Checking Database Migrations..."
if [ -d "migrations" ]; then
    MIGRATION_COUNT=$(ls -1 migrations/*.sql 2>/dev/null | wc -l)
    echo "   Found $MIGRATION_COUNT migration files"
    if [ "$MIGRATION_COUNT" -gt 0 ]; then
        echo "✅ Migrations directory exists"
    else
        echo "⚠️  No migration files found"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo "⚠️  Migrations directory not found"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# Check 6: Required Files
echo "6️⃣  Checking Required Files..."
REQUIRED_FILES=(
    "package.json"
    "next.config.js"
    "app/api/health/route.ts"
    "lib/auth-middleware.ts"
    "lib/supabase.ts"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file"
    else
        echo "   ❌ $file (MISSING)"
        ERRORS=$((ERRORS + 1))
    fi
done
echo ""

# Summary
echo "===================================="
echo "Pre-Deployment Check Summary"
echo "===================================="
echo "✅ Checks Passed: $((5 - ERRORS - WARNINGS))"
echo "⚠️  Warnings: $WARNINGS"
echo "❌ Errors: $ERRORS"
echo ""

if [ $ERRORS -eq 0 ]; then
    if [ $WARNINGS -eq 0 ]; then
        echo "✅ All checks passed! Ready to deploy."
        exit 0
    else
        echo "⚠️  Checks passed with warnings. Review warnings before deploying."
        exit 0
    fi
else
    echo "❌ Deployment blocked: Fix errors before deploying."
    exit 1
fi




# Pre-Deployment Check Script
# Runs all checks before deployment

set -e

echo "🚀 CloudGreet Pre-Deployment Checks"
echo "===================================="
echo ""

ERRORS=0
WARNINGS=0

# Check 1: Environment Variables
echo "1️⃣  Checking Environment Variables..."
if node scripts/validate-env.js; then
    echo "✅ Environment variables validated"
else
    echo "❌ Environment variable validation failed"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check 2: TypeScript Compilation
echo "2️⃣  Checking TypeScript..."
if npm run type-check 2>/dev/null || pnpm type-check 2>/dev/null || npx tsc --noEmit 2>/dev/null; then
    echo "✅ TypeScript compilation successful"
else
    echo "❌ TypeScript compilation failed"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check 3: Linting
echo "3️⃣  Checking Linting..."
if npm run lint 2>/dev/null || pnpm lint 2>/dev/null || npx eslint . 2>/dev/null; then
    echo "✅ Linting passed"
else
    echo "⚠️  Linting warnings (non-blocking)"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# Check 4: Build Test
echo "4️⃣  Testing Build..."
if npm run build 2>/dev/null || pnpm build 2>/dev/null; then
    echo "✅ Build successful"
else
    echo "❌ Build failed"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check 5: Database Migrations
echo "5️⃣  Checking Database Migrations..."
if [ -d "migrations" ]; then
    MIGRATION_COUNT=$(ls -1 migrations/*.sql 2>/dev/null | wc -l)
    echo "   Found $MIGRATION_COUNT migration files"
    if [ "$MIGRATION_COUNT" -gt 0 ]; then
        echo "✅ Migrations directory exists"
    else
        echo "⚠️  No migration files found"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo "⚠️  Migrations directory not found"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# Check 6: Required Files
echo "6️⃣  Checking Required Files..."
REQUIRED_FILES=(
    "package.json"
    "next.config.js"
    "app/api/health/route.ts"
    "lib/auth-middleware.ts"
    "lib/supabase.ts"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file"
    else
        echo "   ❌ $file (MISSING)"
        ERRORS=$((ERRORS + 1))
    fi
done
echo ""

# Summary
echo "===================================="
echo "Pre-Deployment Check Summary"
echo "===================================="
echo "✅ Checks Passed: $((5 - ERRORS - WARNINGS))"
echo "⚠️  Warnings: $WARNINGS"
echo "❌ Errors: $ERRORS"
echo ""

if [ $ERRORS -eq 0 ]; then
    if [ $WARNINGS -eq 0 ]; then
        echo "✅ All checks passed! Ready to deploy."
        exit 0
    else
        echo "⚠️  Checks passed with warnings. Review warnings before deploying."
        exit 0
    fi
else
    echo "❌ Deployment blocked: Fix errors before deploying."
    exit 1
fi


