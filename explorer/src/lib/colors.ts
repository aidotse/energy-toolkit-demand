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
	pageBg: '#ededed'
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
		100: '#bfe9f7'
	},

	/** Indigo / dark navy scale used for the Service segment and dark axis tones */
	indigo: {
		900: '#282658',
		700: '#0c2444',
		500: '#003f66'
	},

	/**
	 * Warm burgundy / dark purple accent used for the Datacenter segment and the
	 * top end of the map gradient. This is THE single source — change here and
	 * every chart, legend, and palette below picks it up.
	 */
	burgundy: {
		500: '#660042', // datacenter background, map gradient peak
		300: '#47134d' // dark purple, map gradient before-peak
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
		primary: '#3b82f6', // Blue
		secondary: '#10b981', // Green
		tertiary: '#f59e0b', // Amber
		baseline: '#6b7280' // Gray
	},

	/**
	 * Warm orange used by flex / "before vs after flexibility" charts (FlexImpactChart,
	 * FlexPeakBars). Single source — change here and every flex chart picks it up.
	 */
	flex: '#e67e22',

	/** Single-series default line color */
	line: '#47B3FF',

	/* SVG furniture -------------------------------------------------------- */
	/** Grid lines */
	grid: '#e5e7eb',
	/** Subtle background fill for highlighted regions and tooltip backgrounds */
	subtleBg: '#f3f4f6',
	/** Reference / axis lines, mean indicators */
	axis: '#9ca3af',
	/** Strong text on chart annotations (titles, tooltip headlines) */
	text: '#000000',
	/** Text labels on charts */
	label: '#374151',
	/** Peak / alert annotations */
	emphasis: '#b91c1c',
	/** Strong warning red (used for delta/decrease annotations in flex charts) */
	warning: '#dc2626',
	/** Muted gray text label */
	mutedLabel: '#6b7280',

	/** Unknown-segment fallback */
	fallback: '#9ca3af'
} as const;

// ---------------------------------------------------------------------------
// Derived constants
// ---------------------------------------------------------------------------

/**
 * Segment name → background + contrasting text color.
 * All swatches reference `viz.*` so a single edit there propagates everywhere.
 */
export const SEGMENT_COLORS: Record<string, { bg: string; text: string }> = {
	industry: { bg: viz.teal[900], text: 'white' },
	housing: { bg: viz.teal[700], text: 'white' },
	services: { bg: viz.indigo[900], text: 'white' },
	transport: { bg: viz.teal[300], text: 'black' },
	datacenters: { bg: viz.burgundy[500], text: 'white' }
};

/** Ordered scenario-color array for comparison mode */
export const COMPARISON_COLORS = [
	viz.scenario.primary,
	viz.scenario.secondary,
	viz.scenario.tertiary
] as const;

/** Scenario colors keyed by role (re-export shape for backward compat) */
export const SCENARIO_COLORS = viz.scenario;

/**
 * Ordered palette for charts that need to color N items by index (TimeLine
 * multi-geo lines, GeoPieChart wedges, etc.). Built from `viz.*` so the
 * palette stays in sync with the segment colors above.
 */
export const GEO_PALETTE = [
	viz.teal[900], // dark teal       (1st)
	viz.teal[700], // cyan            (2nd)
	viz.indigo[900], // indigo        (3rd)
	viz.teal[300], // light cyan      (4th)
	viz.burgundy[500], // burgundy    (5th)
	viz.burgundy[300], // dark purple (6th)
	viz.teal[500], // medium cyan     (7th)
	viz.teal[100], // very light cyan (8th)
	viz.indigo[500], // petrol blue   (9th)
	viz.fallback // gray              (10th)
] as const;

/**
 * 12-stop perceptual palette for the monthly weekly-load chart. Each entry maps
 * to a calendar month and is chosen so adjacent months are visually adjacent
 * (cool winter → warm summer → cool autumn).
 */
export const MONTHLY_PALETTE = [
	'#1e3a5f', // Jan — deep navy
	'#2b5c8a', // Feb — navy blue
	'#3a7ca5', // Mar — steel blue
	'#48a999', // Apr — teal
	'#5cb85c', // May — leaf green
	'#8cc63f', // Jun — lime
	'#ffc107', // Jul — gold
	'#ff9800', // Aug — orange
	'#e65100', // Sep — burnt orange
	'#c62828', // Oct — red
	'#6a1b9a', // Nov — purple
	'#283593' // Dec — indigo
] as const;

// ---------------------------------------------------------------------------
// Tailwind integration
// ---------------------------------------------------------------------------

/** Object shaped for `theme.extend.colors` in tailwind.config.ts */
export const tailwindColors = {
	chart: viz.teal,
	map: {
		light: viz.mapGradient[0], // #7fd4f0
		mid: viz.mapGradient[1], // #003f66
		dark: viz.mapGradient[2], // #282658
		accent: viz.mapGradient[4] // #660042
	},
	highlight: ui.highlight,
	'page-bg': ui.pageBg
} as const;
