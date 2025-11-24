/**
 * Test Utilities
 *
 * Helper functions for testing Svelte 5 components with Testing Library
 */

import { render as testingLibraryRender } from '@testing-library/svelte';
import type { ComponentProps, Component } from 'svelte';
import { vi } from 'vitest';

/**
 * Custom render function that wraps @testing-library/svelte render
 * with common test setup (providers, context, etc.)
 */
export function render<T extends Component>(
  component: T,
  options?: {
    props?: ComponentProps<T>;
    context?: Map<any, any>;
  }
) {
  return testingLibraryRender(component, {
    props: options?.props || {},
    context: options?.context,
  });
}

/**
 * Wait for a specific amount of time (useful for animations/transitions)
 */
export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Wait for the next tick
 */
export const nextTick = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Create a mock fetch function that returns specified data
 */
export function createMockFetch(mockResponse: any, options?: { delay?: number; error?: boolean }) {
  return vi.fn().mockImplementation(async () => {
    if (options?.delay) {
      await wait(options.delay);
    }

    if (options?.error) {
      throw new Error('Mock fetch error');
    }

    return {
      ok: true,
      status: 200,
      json: async () => mockResponse,
      text: async () => JSON.stringify(mockResponse),
    };
  });
}

/**
 * Create mock time series data for testing charts
 */
export function createMockTimeSeriesData(length: number = 10) {
  return Array.from({ length }, (_, i) => ({
    timestamp: `2025-01-${String(i + 1).padStart(2, '0')}`,
    value: Math.random() * 100,
  }));
}

/**
 * Create mock scenario data
 */
export function createMockScenario(id: string = 'base') {
  return {
    scenarioId: id,
    name: `Scenario ${id}`,
    description: `Test scenario ${id}`,
  };
}

/**
 * Suppress console warnings/errors during a test
 */
export function suppressConsole() {
  const originalError = console.error;
  const originalWarn = console.warn;

  beforeEach(() => {
    console.error = vi.fn();
    console.warn = vi.fn();
  });

  afterEach(() => {
    console.error = originalError;
    console.warn = originalWarn;
  });
}

/**
 * Create a mock ResizeObserver entry
 */
export function createMockResizeObserverEntry(target: Element, contentRect: Partial<DOMRectReadOnly> = {}) {
  return {
    target,
    contentRect: {
      width: 800,
      height: 600,
      top: 0,
      left: 0,
      bottom: 600,
      right: 800,
      x: 0,
      y: 0,
      toJSON: () => ({}),
      ...contentRect,
    },
  };
}

/**
 * Trigger window resize event
 */
export function triggerResize(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
  window.dispatchEvent(new Event('resize'));
}
