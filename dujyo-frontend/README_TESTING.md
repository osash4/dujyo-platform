# Dujyo Testing Guide

## Overview

Dujyo uses a comprehensive testing strategy with:
- **Playwright** for End-to-End (E2E) testing
- **Jest** for Unit testing
- **Supertest** for API testing

## Installation

Install dependencies:
```bash
npm install
```

## Running Tests

### E2E Tests (Playwright)

Run all E2E tests:
```bash
npm run test:e2e
```

Run specific test suites:
```bash
npm run test:artist  # Artist flow tests
npm run test:user    # User flow tests
```

Run E2E tests with UI:
```bash
npm run test:e2e:ui
```

Run E2E tests in debug mode:
```bash
npm run test:e2e:debug
```

Run E2E tests in headed mode (see browser):
```bash
npm run test:e2e:headed
```

### Unit Tests (Jest)

Run all unit tests:
```bash
npm run test
```

Run tests in watch mode:
```bash
npm run test:watch
```

Run tests with coverage:
```bash
npm run test:coverage
```

### All Tests

Run both unit and E2E tests:
```bash
npm run test:all
```

## Test Structure

```
tests/
├── e2e/
│   ├── artist-flow.spec.ts    # Complete artist flow tests
│   └── user-flow.spec.ts      # Complete user flow tests
├── unit/
│   └── api-endpoints.test.ts  # API endpoint tests
└── setup/
    ├── global-setup.ts        # Playwright global setup
    └── jest-setup.ts          # Jest setup
```

## Test Flows

### Artist Flow (`artist-flow.spec.ts`)
1. ✅ Register as Artist
2. ✅ Upload Content
3. ✅ Verify Streaming
4. ✅ Check Royalties
5. ✅ DEX Swap

### User Flow (`user-flow.spec.ts`)
1. ✅ Register User
2. ✅ Connect Wallet
3. ✅ Listen to Music (Stream-to-Earn)
4. ✅ Check Earnings
5. ✅ Stake Tokens
6. ✅ Browse NFT Marketplace

## Prerequisites

Before running tests, ensure:
1. Backend is running on `http://localhost:8083`
   ```bash
   cd ../dujyo-backend && cargo run --release
   ```

2. Frontend is running on `http://localhost:5173`
   ```bash
   npm run dev
   ```

## Configuration

### Environment Variables

Set in `.env` or `.env.test`:
```env
API_BASE_URL=http://localhost:8083
FRONTEND_URL=http://localhost:5173
```

### Playwright Configuration

See `playwright.config.ts` for:
- Browser configurations
- Test timeouts
- Screenshots/videos on failure
- Global setup

### Jest Configuration

See `jest.config.js` for:
- Test patterns
- Coverage thresholds
- Module resolution

## Troubleshooting

### Tests fail with "Backend not running"
- Start the backend: `cd ../dujyo-backend && cargo run --release`
- Verify it's accessible: `curl http://localhost:8083/health`

### Tests fail with "Frontend not running"
- Start the frontend: `npm run dev`
- Verify it's accessible: `curl http://localhost:5173`

### Tests timeout
- Increase timeout in test files or config
- Check if services are slow to respond

### Playwright browsers not installed
```bash
npx playwright install
```

## CI/CD Integration

Tests can be run in CI/CD pipelines. The config automatically detects CI environment:
- Retries: 2 (in CI)
- Workers: 1 (in CI)
- Screenshots/videos: Always on failure

## Coverage Goals

- Unit tests: 50% coverage minimum
- E2E tests: Cover all critical user flows
- API tests: Cover all public endpoints

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Clean up test data after tests
3. **Realistic**: Use realistic test data
4. **Error Handling**: Test error scenarios
5. **Performance**: Keep tests fast (< 30s per test)

## Contributing

When adding new features:
1. Write E2E tests for user-facing flows
2. Write unit tests for business logic
3. Write API tests for new endpoints
4. Ensure all tests pass before merging
