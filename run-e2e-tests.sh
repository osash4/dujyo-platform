#!/bin/bash

echo "🎭 Running XWave E2E Tests"
echo "=========================="

cd /Users/yare/xwave/xwave-frontend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

# Build the frontend
echo "🔨 Building frontend..."
npm run build

# Run Playwright tests
echo "🎭 Running Playwright tests..."
npx playwright test --reporter=html

echo "✅ E2E tests completed"
echo "📊 Check test-results/playwright-report.html for results"
