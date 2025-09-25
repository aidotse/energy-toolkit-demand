/**
 * @fileoverview Test setup file for Vitest
 */

// Global test configuration can go here
// For now, just ensure the test environment is properly initialized

// Mock console.log during tests to reduce noise
const originalLog = console.log;
console.log = (...args) => {
  // Only log if explicitly testing console output
  if (process.env.VITEST_LOG === 'true') {
    originalLog(...args);
  }
};

// Restore console.log after each test
import { afterEach } from 'vitest';

afterEach(() => {
  // Reset any test state if needed
});