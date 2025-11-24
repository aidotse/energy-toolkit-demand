/**
 * Vitest Test Setup
 *
 * This file runs before all tests and sets up the testing environment.
 */

import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Import MSW server only in Node environment (not in browser mode)
// Browser mode tests don't need API mocking as they test components in isolation
// Check for 'process' which exists in Node but not in browser
if (typeof process !== 'undefined' && process.versions?.node) {
  await import('./mocks/server');
}

// Mock window.matchMedia (used by responsive components)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver (used by lazy-loading components)
// Use window in browser mode, global in Node mode
const globalThis = typeof window !== 'undefined' ? window : global;

if (!globalThis.IntersectionObserver) {
  globalThis.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    unobserve() {}
    takeRecords() {
      return [];
    }
  } as any;
}

// Mock ResizeObserver (used by responsive charts)
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class ResizeObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    unobserve() {}
  } as any;
}

// Suppress console errors in tests (unless DEBUG=true)
// Skip in browser mode as process.env may not be available
if (typeof process !== 'undefined' && !process.env.DEBUG) {
  const consoleTarget = typeof window !== 'undefined' ? window.console : global.console;
  Object.assign(consoleTarget, {
    error: vi.fn(),
    warn: vi.fn(),
  });
}
