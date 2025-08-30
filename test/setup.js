// Jest setup file
require('dotenv').config({ path: '.env.test' });

// Mock AWS SDK for testing
jest.mock('@aws-sdk/client-lambda');
jest.mock('@aws-sdk/client-cloudwatch');
jest.mock('@aws-sdk/client-cloudwatch-logs');

// Global test timeout
jest.setTimeout(30000);

// Suppress console.error in tests unless explicitly needed
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (args[0]?.includes?.('Warning') || process.env.SHOW_CONSOLE_ERRORS) {
      originalError(...args);
    }
  };
});

afterAll(() => {
  console.error = originalError;
});