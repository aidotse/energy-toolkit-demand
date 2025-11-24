/**
 * MSW Server for Node.js Tests
 *
 * Sets up Mock Service Worker for intercepting HTTP requests during tests
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Create MSW server with default handlers
export const server = setupServer(...handlers);

// Start/stop server automatically with Vitest lifecycle
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'warn', // Warn about requests that aren't mocked
  });
});

afterEach(() => {
  server.resetHandlers(); // Reset handlers after each test
});

afterAll(() => {
  server.close(); // Clean up after all tests
});
