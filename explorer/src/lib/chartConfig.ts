/**
 * Chart Configuration Utilities
 *
 * Standardized configuration for LayerChart components to ensure
 * consistent axis rendering, formatting, and appearance across all charts.
 */

import { formatNumber } from '$lib/utilities';
import { SEGMENT_COLORS, viz } from '$lib/colors';
import * as m from '$lib/paraglide/messages';

export { SEGMENT_COLORS };

/**
 * Canonical segment ordering for charts (largest/most important first).
 * LoadProfileChart intentionally uses a different order (housing first).
 */
export const SEGMENT_ORDER = ['industry', 'housing', 'services', 'transport', 'datacenters'] as const;

/**
 * Static segment labels (Swedish). Kept for backward compatibility.
 * Prefer getSegmentLabel() for locale-aware labels.
 */
export const SEGMENT_LABELS: Record<string, string> = {
	'industry': 'Industri',
	'housing': 'Bostäder',
	'services': 'Service',
	'transport': 'Transport',
	'datacenters': 'Datacenter',
} as const;

/**
 * Get locale-aware display label for a segment.
 * Uses Paraglide messages so labels follow the active language.
 */
export function getSegmentLabel(segment: string): string {
	const labels: Record<string, () => string> = {
		industry: m.segment_industry,
		housing: m.segment_housing,
		services: m.segment_services,
		transport: m.segment_transport,
		datacenters: m.segment_datacenters,
		total: m.segment_total,
	};
	return labels[segment]?.() ?? segment;
}

/**
 * Get color configuration for a segment
 * Returns default gray if segment not found
 */
export function getSegmentColor(segment: string): { bg: string; text: string } {
	return SEGMENT_COLORS[segment] || { bg: viz.fallback, text: 'white' };
}
import { getEnergyPrefix, getPowerPrefix } from '$lib/stores/units.svelte';

export interface AxisConfig {
	format?: ((value: number) => string) | string;
	ticks?: unknown[] | ((scale: { domain(): unknown[] }) => unknown[]);
	labels?: boolean;
	rule?: boolean | { class?: string };
	tweened?: boolean | { duration: number };
	tickLabelProps?: Record<string, unknown>;
}

export interface StandardAxisConfig {
	xAxis?: AxisConfig;
	yAxis?: AxisConfig;
	grid?: {
		x?: boolean;
		y?: boolean;
	};
}

/**
 * Standard axis configuration for time series charts (year-based)
 */
export function getTimeSeriesAxisConfig(
	displayAxes: boolean = true,
	aggregation: 'sum' | 'mean' | 'max' = 'sum'
): StandardAxisConfig {
	if (!displayAxes) {
		return {
			xAxis: { ticks: [], labels: false, rule: false },
			yAxis: { ticks: [], labels: false, rule: false },
			grid: { x: false, y: false }
		};
	}

	return {
		xAxis: {
			format: (value) => String(value),
			tweened: false,
			rule: { class: 'stroke-black [stroke-width:1.5px]' }
		},
		yAxis: {
			format: (num) => formatNumber(num, aggregation === 'sum' ? getEnergyPrefix() : getPowerPrefix(), aggregation === 'sum' ? 'Wh' : 'W').replace(/\.\d+/, ''),
			tweened: false,
			rule: { class: 'stroke-black [stroke-width:1.5px]' }
		},
		grid: {
			x: false,
			y: false
		}
	};
}

/**
 * Standard axis configuration for hourly/daily timeline charts
 */
export function getTimelineAxisConfig(displayAxes: boolean = true): StandardAxisConfig {
	if (!displayAxes) {
		return {
			xAxis: { ticks: [], labels: false, rule: false },
			yAxis: { ticks: [], labels: false, rule: false },
			grid: { x: false, y: false }
		};
	}

	return {
		xAxis: {
			tweened: false
		},
		yAxis: {
			format: 'metric',
			tweened: false
		},
		grid: {
			x: false,
			y: true
		}
	};
}

/**
 * Standard axis configuration for distribution/histogram charts
 *
 * @param displayAxes - Whether to display axes
 * @param xDomain - Optional [min, max] array to calculate tick positions that include start and end
 */
export function getDistributionAxisConfig(
	displayAxes: boolean = true,
	xDomain?: [number, number]
): StandardAxisConfig {
	if (!displayAxes) {
		return {
			xAxis: { ticks: [], labels: false, rule: false },
			yAxis: { ticks: [], labels: false, rule: false },
			grid: { x: false, y: false }
		};
	}

	// Use a function to select a subset of domain values for ticks
	// For band scales (like BarChart), we need to return values from the actual domain
	const xTicks = (scale: { domain(): unknown[] }) => {
		const domain = scale.domain();
		if (!domain || domain.length === 0) return [];

		const tickCount = 6;
		const step = Math.max(1, Math.floor(domain.length / (tickCount - 1)));
		const ticks: unknown[] = [];

		// Always include first
		ticks.push(domain[0]);

		// Add intermediate ticks
		for (let i = step; i < domain.length - 1; i += step) {
			ticks.push(domain[i]);
		}

		// Always include last
		if (domain.length > 1) {
			ticks.push(domain[domain.length - 1]);
		}

		return ticks;
	};

	return {
		xAxis: {
			format: (value) => formatNumber(value, getPowerPrefix(), 'W'),
			ticks: xTicks,
			tweened: false
		},
		yAxis: {
			format: (value) => `${Math.round(value)}h`,
			tweened: false
		},
		grid: {
			x: false,
			y: true
		}
	};
}

/**
 * Standard axis configuration for geographic/categorical bar charts
 */
export function getGeographicAxisConfig(displayAxes: boolean = true): StandardAxisConfig {
	if (!displayAxes) {
		return {
			xAxis: { ticks: [], labels: false, rule: false },
			yAxis: { ticks: [], labels: false, rule: false },
			grid: { x: false, y: false }
		};
	}

	return {
		xAxis: {
			tweened: false
		},
		yAxis: {
			format: (value) => formatNumber(value, getEnergyPrefix(), 'Wh').replace(/\.\d+/, ''),
			tweened: false
		},
		grid: {
			x: false,
			y: true
		}
	};
}

/**
 * Standard Layerchart padding for consistent chart margins.
 * Overrides Layerchart defaults ({ top: 4, left: 20, bottom: 20, right: 4 })
 * which are too small for formatted axis labels.
 */
export const CHART_PADDING = {
	/** For charts with horizontal x-axis labels */
	standard: { top: 16, right: 16, bottom: 36, left: 48 },
	/** For charts with rotated x-axis labels (county names, etc.) */
	rotatedX: { top: 16, right: 16, bottom: 80, left: 48 },
} as const;

/**
 * Standard props configuration for bar charts
 */
export function getBarChartProps(config?: {
	displayAxes?: boolean;
	resolution?: string;
}): { xAxis: AxisConfig; yAxis: AxisConfig; bars: Record<string, unknown> } {
	const { displayAxes = true, resolution = '1d' } = config || {};

	return {
		xAxis: displayAxes ? { tweened: false } : { ticks: [], labels: false, rule: false },
		yAxis: displayAxes ? { format: 'metric', tweened: false } : { ticks: [], labels: false, rule: false },
		bars: { tweened: false, radius: 2, stroke: 'none' }
	};
}
