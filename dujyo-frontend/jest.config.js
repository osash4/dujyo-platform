/** @type {import('jest').Config} */
export default {
  // Test environment
  testEnvironment: 'node',
  
  // File patterns to match
  testMatch: [
    '**/tests/unit/**/*.test.ts',
    '**/tests/unit/**/*.test.js',
    '**/tests/**/*.spec.ts',
    '**/tests/**/*.spec.js'
  ],

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Transform files
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }]
  },

  // Module paths
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**'
  ],

  // Coverage thresholds
  coverageThresholds: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest-setup.ts'],

  // Test timeout
  testTimeout: 10000,

  // Verbose output
  verbose: true,

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/'
  ],

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks after each test
  restoreMocks: true
};

