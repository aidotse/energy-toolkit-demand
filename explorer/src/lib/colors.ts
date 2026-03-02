/**
 * Canonical color definitions for the Explorer application.
 * Single source of truth — all other files import from here.
 *
 * Architecture:
 * - `ui` — non-chart UI colors (highlights, selection, page background)
 * - `viz` — chart/visualization colors (segment teal scale, map gradient, axis furniture)
 * - `SEGMENT_COLORS` — derived segment→color mapping consumed by chartConfig
 * - `tailwindColors` — object shaped for `theme.extend.colors` in tailwind.config.ts,
 *   so Tailwind utility classes (e.g. `bg-chart-900`, `bg-page-bg`) stay in sync
 *
 * Zero external imports, pure data, `as const`.
 */

// ---------------------------------------------------------------------------
// UI colors
// ---------------------------------------------------------------------------

export const ui = {
	/** Accent teal used for interactive highlights */
	highlight: '#46a0c4',
	/** Text-selection background (used at 30 % opacity in app.css) */
	selection: '#46a0c4',
	/** ThemeSwitch sun icon — targets third-party SVG */
	sunIcon: '#f9ca2d',
	/** Page background (light mode) */
	pageBg: '#ededed',
} as const;

// ---------------------------------------------------------------------------
// Visualization colors
// ---------------------------------------------------------------------------

export const viz = {
	/** Sequential teal scale (dark → light) for segment fills and charts */
	teal: {
		900: '#004d66',
		700: '#007399',
		500: '#46a0c4',
		300: '#61bbd9',
		100: '#90d2e8',
	},

	/** 4-stop map gradient: light → teal → navy → burgundy */
	mapGradient: ['#61bbd9', '#007399', '#002a66', '#660042'] as const,

	/** Discrete scenario palette for comparison mode */
	scenario: {
		primary: '#3b82f6',   // Blue
		secondary: '#10b981', // Green
		tertiary: '#f59e0b',  // Amber
		baseline: '#6b7280',  // Gray
	},

	/** Single-series default line color */
	line: '#47B3FF',

	/* SVG furniture -------------------------------------------------------- */
	/** Grid lines */
	grid: '#e5e7eb',
	/** Reference / axis lines, mean indicators */
	axis: '#9ca3af',
	/** Text labels on charts */
	label: '#374151',
	/** Peak / alert annotations */
	emphasis: '#b91c1c',

	/** Unknown-segment fallback */
	fallback: '#9ca3af',
} as const;

// ---------------------------------------------------------------------------
// Derived constants
// ---------------------------------------------------------------------------

/** Segment name → teal-scale background + contrasting text color */
export const SEGMENT_COLORS: Record<string, { bg: string; text: string }> = {
	industry:    { bg: viz.teal[900], text: 'white' },
	housing:     { bg: viz.teal[700], text: 'white' },
	services:    { bg: viz.teal[500], text: 'white' },
	transport:   { bg: viz.teal[300], text: 'black' },
	datacenters: { bg: viz.teal[100], text: 'black' },
};

/** Ordered scenario-color array for comparison mode */
export const COMPARISON_COLORS = [
	viz.scenario.primary,
	viz.scenario.secondary,
	viz.scenario.tertiary,
] as const;

/** Scenario colors keyed by role (re-export shape for backward compat) */
export const SCENARIO_COLORS = viz.scenario;

// ---------------------------------------------------------------------------
// Tailwind integration
// ---------------------------------------------------------------------------

/** Object shaped for `theme.extend.colors` in tailwind.config.ts */
export const tailwindColors = {
	chart: viz.teal,
	map: {
		light: viz.teal[300],
		mid: viz.teal[700],
		dark: viz.mapGradient[2],   // #002a66
		accent: viz.mapGradient[3], // #660042
	},
	highlight: ui.highlight,
	'page-bg': ui.pageBg,
} as const;
