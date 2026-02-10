/**
 * Chart Configuration Utilities
 *
 * Standardized configuration for LayerChart components to ensure
 * consistent axis rendering, formatting, and appearance across all charts.
 */

import { formatNumber } from '$lib/utilities';

/**
 * Segment display name mapping (API name → Swedish display name)
 */
export const SEGMENT_LABELS: Record<string, string> = {
	'industry': 'Industri',
	'housing': 'Bostäder',
	'services': 'Service',
	'transport': 'Transport',
	'datacenters': 'Datacenter',
} as const;

/**
 * Segment color mapping for pie/sector charts
 * Colors assigned from darkest to lightest based on segment importance
 * Uses API segment names (lowercase)
 */
export const SEGMENT_COLORS: Record<string, { bg: string; text: string }> = {
	'industry': { bg: '#004d66', text: 'white' },
	'housing': { bg: '#007399', text: 'white' },
	'services': { bg: '#46a0c4', text: 'white' },
	'transport': { bg: '#61bbd9', text: 'black' },
	'datacenters': { bg: '#90d2e8', text: 'black' },
} as const;

/**
 * Get display label for a segment
 */
export function getSegmentLabel(segment: string): string {
	return SEGMENT_LABELS[segment] || segment;
}

/**
 * Get color configuration for a segment
 * Returns default gray if segment not found
 */
export function getSegmentColor(segment: string): { bg: string; text: string } {
	return SEGMENT_COLORS[segment] || { bg: '#9ca3af', text: 'white' };
}
import { getEnergyPrefix, getPowerPrefix } from '$lib/stores/units.svelte';

export interface StandardAxisConfig {
	xAxis?: {
		format?: (value: any) => string;
		ticks?: any;
		labels?: boolean;
		rule?: boolean | { class?: string };
		tweened?: boolean | { duration: number };
	};
	yAxis?: {
		format?: (value: any) => string;
		ticks?: any;
		labels?: boolean;
		rule?: boolean | { class?: string };
		tweened?: boolean | { duration: number };
	};
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
			format: (num) => formatNumber(num, aggregation === 'sum' ? getEnergyPrefix() : getPowerPrefix(), aggregation === 'sum' ? 'Wh' : 'W'),
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
	const xTicks = (scale: any) => {
		const domain = scale.domain();
		if (!domain || domain.length === 0) return [];

		const tickCount = 6;
		const step = Math.max(1, Math.floor(domain.length / (tickCount - 1)));
		const ticks: any[] = [];

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
			format: (value) => formatNumber(value, getEnergyPrefix(), 'Wh'),
			tweened: false
		},
		grid: {
			x: false,
			y: true
		}
	};
}

/**
 * Standard props configuration for bar charts
 */
export function getBarChartProps(config?: {
	displayAxes?: boolean;
	resolution?: string;
}): any {
	const { displayAxes = true, resolution = '1d' } = config || {};

	return {
		xAxis: displayAxes ? { tweened: false } : { ticks: [], labels: false, rule: false },
		yAxis: displayAxes ? { format: 'metric', tweened: false } : { ticks: [], labels: false, rule: false },
		bars: { tweened: false, radius: 2, stroke: 'none' }
	};
}
