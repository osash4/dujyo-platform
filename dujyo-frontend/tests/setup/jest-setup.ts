/**
 * Jest Setup File
 * Runs before each test file
 */

// Global test setup
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8083';
  process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
});

// Global test teardown
afterAll(() => {
  // Cleanup after all tests
  console.log('All tests completed');
});

// Mock console methods in tests to reduce noise
global.console = {
  ...console,
  // Uncomment to silence console logs in tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

