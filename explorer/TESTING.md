# Testing Guide for Explorer

**Status:** ✅ Phase 1 Complete - Vitest 3 Browser Mode with Svelte 5 | ✅ Phase 2 Complete - Storybook Visual Documentation

## Quick Start

### Unit & Integration Tests

```bash
# Run all tests
npm test

# Watch mode (interactive)
npm run test:watch

# UI dashboard
npm run test:ui

# Coverage report
npm run test:coverage

# E2E tests
npm run test:e2e
```

### Storybook (Visual Documentation)

```bash
# Start Storybook dev server
npm run storybook
# Opens at http://localhost:6006

# Build static Storybook
npm run build-storybook
```

## Current Testing Capabilities

### ✅ Working Now

**Vitest (Unit & Integration Tests):**

- **Utility Functions**: Services, helpers, data transformations
- **TypeScript/JavaScript**: Any non-Svelte code
- **API Mocking**: MSW configured for all endpoints
- **DOM Mocking**: Window, ResizeObserver, IntersectionObserver
- **Test Utilities**: Comprehensive helper functions

**Storybook (Visual Documentation & Testing):**

- **Component Isolation**: Develop and test components independently
- **Visual Documentation**: Interactive component library
- **State Variants**: Test all component states and prop combinations
- **Live Examples**: Working examples for developers and designers
- **Auto-generated Docs**: Automatic documentation from component props

### ✅ Vitest Browser Mode (Component Testing)

**Updated:** 2025-01-10 - Successfully migrated to Vitest Browser Mode!

**What Changed:**

- Upgraded vitest from v2.1.9 to v3.2.4
- Configured Vitest Browser Mode with Playwright
- Using `@testing-library/svelte/vite` plugin (`svelteTesting()`)
- Added `conditions: ['browser', 'default']` to resolve config (fixes SSR mount errors)
- Component tests now run in real Chromium browser

**Requirements:**
System dependencies needed for Playwright (one-time setup):

```bash
sudo apt-get install libnss3 libnspr4 libgbm1 libasound2
```

**Component Tests Available:**

**Shared Components:**

- `LoadingSkeleton.test.ts` - All 4 variants tested (8 tests)
- `MetricCard.test.ts` - Metric display component tests (11 tests)

**Chart Components:**

- `AreaChart.test.ts` - Time series area chart tests (11 tests)
  - Props: data, geography, year, aggregation, scenarios, comparisonMode, displayAxes, class
  - Tests: rendering, title variations, empty state, custom class, scenario modes
- `Histogram.test.ts` - Distribution histogram tests (9 tests)
  - Props: data, geography, year, resolution, segment, aggregation, scenarios, comparisonMode, class
  - Tests: rendering, title, empty state, custom class, different props, scenario modes
- `TimeLine.test.ts` - Timeline visualization tests (10 tests)
  - Props: data, geography, year, resolution, segment, aggregation, scenarios, comparisonMode, class
  - Tests: rendering, title, empty state, custom class, different segments, scenario modes
- `GeoBarChart.test.ts` - Geographic bar chart tests (9 tests)
  - Props: data, parameterData, year, scenarios, comparisonMode, class
  - Tests: rendering, title, empty state, custom class, different years, invalid data filtering, scenario modes
- `SegmentBars.test.ts` - Segment breakdown tests (9 tests)
  - Props: data, geography, year, scenarios, comparisonMode, class
  - Tests: rendering, title, empty state, custom class, different geographies/years, scenario modes

**Total Test Coverage:**

- 9 test files
- 71 tests (67 component tests + 4 utility tests)
- All chart components test: basic rendering, empty states, prop handling, single/comparison scenario modes

**Why Browser Mode:**

- Tests run in real browser environment (Chromium via Playwright)
- Avoids vite-plugin-svelte configureServer hook compatibility issues
- More realistic testing environment than jsdom/happy-dom
- Recommended 2025 best practice for Svelte component testing
- Requires `conditions: ['browser']` in resolve config to prevent SSR module resolution

## Test Infrastructure

### Configuration Files

**Vitest Configuration (`vitest.config.ts`):**

```typescript
/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import { svelteTesting } from '@testing-library/svelte/vite';

export default defineConfig({
	plugins: [sveltekit(), svelteTesting()],

	test: {
		browser: {
			enabled: true,
			name: 'chromium',
			provider: 'playwright',
			headless: true
		},
		globals: true,
		setupFiles: ['./src/tests/setup.ts']
		// ... other config
	},

	resolve: {
		alias: {
			$lib: '/src/lib',
			$app: '/node_modules/@sveltejs/kit/src/runtime/app'
		},
		conditions: ['browser', 'default'] // CRITICAL: Forces client-side Svelte imports
	}
});
```

**Key Points:**

- `svelteTesting()` plugin from `@testing-library/svelte/vite` handles Svelte compilation
- Browser mode uses Playwright to launch real Chromium browser
- `/// <reference types="vitest" />` provides TypeScript support
- **CRITICAL:** `conditions: ['browser', 'default']` forces Vite to use client-side Svelte exports instead of SSR, preventing "mount(...) is not available on the server" errors

**Other Files:**

- `src/tests/setup.ts` - Global test setup
- `src/tests/test-utils.ts` - Reusable utilities
- `src/tests/mock-data.ts` - Mock data patterns
- `src/tests/mocks/handlers.ts` - MSW request handlers
- `src/tests/mocks/server.ts` - MSW server setup

### Test Utilities

```typescript
import { render, wait, createMockFetch } from '$lib/tests/test-utils';
import { mockDailyData, mockScenarios } from '$lib/tests/mock-data';

// Example: Testing a utility function
it('should calculate histogram bins', () => {
	const bins = calculateHistogram(mockDailyData, 'value', 10);
	expect(bins).toBeDefined();
	expect(bins.length).toBe(10);
});
```

### Mock Data Available

- `mockParameters` - API parameters (years, geographies, segments)
- `mockScenarios` - Test scenarios
- `mockHourlyData` - 24h time series
- `mockDailyData` - 365d time series
- `mockYearlyData` - Multi-year data
- `mockHistogramData` - Distribution data
- `mockSectorData` - Sector breakdown
- `mockGeographicData` - Geographic data
- `mockGeoJSON` - GeoJSON features

### API Mocking (MSW)

All API endpoints are mocked automatically:

```typescript
// Tests automatically use mocked endpoints
const data = await fetchDemandData(query);
// Returns mock data from MSW handlers

// Override for specific test
import { server } from '$lib/tests/mocks/server';
import { http, HttpResponse } from 'msw';

server.use(
	http.get('/api/demand', () => {
		return HttpResponse.json(customData);
	})
);
```

## Writing Tests

### Utility/Service Tests

```typescript
// src/lib/utilities.test.ts
import { describe, it, expect } from 'vitest';
import { formatNumber } from './utilities';

describe('formatNumber', () => {
	it('should format numbers with Swedish locale', () => {
		expect(formatNumber(1234567)).toBe('1 234 567');
	});
});
```

### Component Tests (When Available)

```typescript
// src/lib/components/Button.test.ts
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import Button from './Button.svelte';

describe('Button', () => {
	it('should render with text', () => {
		render(Button, { props: { text: 'Click me' } });
		expect(screen.getByText('Click me')).toBeTruthy();
	});
});
```

## Coverage Goals

- **Utilities/Services**: 80%+ coverage (critical paths 100%)
- **Components**: 80%+ coverage (when available)
- **Integration**: E2E tests for key user flows

## Continuous Integration

Tests run automatically on:

- Pre-commit (configured with git hooks)
- Pull requests
- Main branch pushes

## Troubleshooting

### Tests Not Running

```bash
# Clear cache
rm -rf node_modules/.vitest

# Reinstall dependencies
npm install
```

### Mock Data Not Working

Ensure MSW server is imported in setup:

```typescript
// src/tests/setup.ts
import './mocks/server';
```

### Type Errors

Run type checking separately:

```bash
npm run check
```

## Storybook Visual Documentation

### Overview

Storybook provides interactive visual documentation for components. It's particularly useful for:

- Component development in isolation
- Visual testing and QA
- Living documentation for designers and developers
- Testing different component states and props

### Writing Stories

Stories are written using the Component Story Format (CSF) with TypeScript:

```typescript
// LoadingSkeleton.stories.ts
import type { Meta, StoryObj } from '@storybook/svelte';
import LoadingSkeleton from './LoadingSkeleton.svelte';

const meta = {
	title: 'Shared/LoadingSkeleton',
	component: LoadingSkeleton,
	tags: ['autodocs'],
	argTypes: {
		variant: {
			control: 'select',
			options: ['chart', 'map', 'table', 'text'],
			description: 'Visual variant to match the content type'
		},
		message: {
			control: 'text',
			description: 'Loading message to display'
		}
	},
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component: 'A reusable loading skeleton component...'
			}
		}
	}
} satisfies Meta<LoadingSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

// Each export is a story
export const Chart: Story = {
	args: {
		variant: 'chart',
		message: 'Laddar data...'
	}
};

export const Map: Story = {
	args: {
		variant: 'map',
		message: 'Loading geography...'
	}
};
```

### Story Organization

Stories are organized by component type:

- **Shared/** - Reusable UI components (LoadingSkeleton, ErrorState, EmptyState)
- **Charts/** - Chart components (SegmentBars, AreaChart, etc.)
- **Controls/** - Form controls and inputs
- **Navigation/** - Navigation components

### Best Practices

1. **One story file per component** - `Component.svelte` + `Component.stories.ts`
2. **Cover all states** - loading, error, empty, populated, variants
3. **Use mock data** - Don't rely on live API calls in stories
4. **Add documentation** - Use JSDoc comments and story descriptions
5. **Interactive controls** - Use argTypes for interactive prop testing

### Example Stories

See the following example stories:

- `src/lib/components/shared/LoadingSkeleton.stories.ts` - Simple prop variations
- `src/lib/components/shared/ErrorState.stories.ts` - Action callbacks
- `src/lib/components/shared/EmptyState.stories.ts` - Custom icons
- `src/lib/components/SegmentBars.stories.ts` - Chart with mock data

### Storybook Configuration

- **`.storybook/main.ts`** - Storybook configuration, addons, and framework setup
- **`.storybook/preview.ts`** - Global decorators, parameters, and styles

Current addons:

- `@storybook/addon-svelte-csf` - Svelte component support
- `@storybook/addon-docs` - Auto-generated documentation
- `@chromatic-com/storybook` - Visual regression testing (optional)

### Limitations

- Component tests requiring complex API mocking may be better suited for Vitest
- Some Svelte 5 features may have limited Storybook support
- Interactive scenarios with complex state management are better tested with E2E

## Next Steps

1. **✅ Phase 1 Complete** - Vitest Browser Mode with Svelte 5 working perfectly

2. **✅ Phase 2 Complete** - Storybook setup with initial component stories
   - Consider expanding coverage to all chart components
   - Consider Chromatic for visual regression testing

3. **Phase 3: E2E Testing** (Future)
   - Playwright configuration for end-to-end tests
   - User flow tests (navigation, form submission, etc.)
   - Cross-browser testing

## Resources

### Testing Frameworks

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Docs](https://testing-library.com/docs/svelte-testing-library/intro)
- [MSW Documentation](https://mswjs.io/)
- [Svelte Testing Guide](https://svelte.dev/docs/svelte/testing)

### Visual Documentation

- [Storybook Documentation](https://storybook.js.org/docs)
- [Storybook for SvelteKit](https://storybook.js.org/docs/get-started/frameworks/sveltekit)
- [Component Story Format (CSF)](https://storybook.js.org/docs/api/csf)
