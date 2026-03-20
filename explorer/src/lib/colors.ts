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
	highlight: '#1690b8',
	/** Text-selection background (used at 30 % opacity in app.css) */
	selection: '#1690b8',
/** Page background (light mode) */
	pageBg: '#ededed',
} as const;

// ---------------------------------------------------------------------------
// Visualization colors
// ---------------------------------------------------------------------------

export const viz = {
	/** Sequential teal scale (dark → light) for chart fills and UI accents */
	teal: {
		900: '#004d66',
		700: '#1690b8',
		500: '#46a0c4',
		300: '#7fd4f0',
		100: '#bfe9f7',
	},

	/**
	 * 5-stop map/heatmap gradient: cyan → dark blue → indigo → purple → burgundy.
	 * Non-linear — blues compressed into the low end for better differentiation
	 * of typical demand values (2–80 range).
	 */
	mapGradient: ['#7fd4f0', '#003f66', '#282658', '#47134d', '#660042'] as const,

	/**
	 * Non-linear stop positions for mapGradient (0–1).
	 * Blues occupy the first 20 %, then indigo → burgundy spread across the rest.
	 */
	mapStops: [0, 0.2, 0.4, 0.7, 1.0] as const,

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

/** Segment name → background + contrasting text color */
export const SEGMENT_COLORS: Record<string, { bg: string; text: string }> = {
	industry:    { bg: '#004d66', text: 'white' },
	housing:     { bg: '#1690b8', text: 'white' },
	services:    { bg: '#282658', text: 'white' },
	transport:   { bg: '#7fd4f0', text: 'black' },
	datacenters: { bg: '#660042', text: 'white' },
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
		light: viz.mapGradient[0],  // #7fd4f0
		mid: viz.mapGradient[1],    // #003f66
		dark: viz.mapGradient[2],   // #282658
		accent: viz.mapGradient[4], // #660042
	},
	highlight: ui.highlight,
	'page-bg': ui.pageBg,
} as const;
