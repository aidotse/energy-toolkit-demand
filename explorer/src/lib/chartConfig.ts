/**
 * Chart Configuration Utilities
 *
 * Standardized configuration for LayerChart components to ensure
 * consistent axis rendering, formatting, and appearance across all charts.
 */

import { formatNumber } from '$lib/utilities';
import { getEnergyPrefix, getPowerPrefix } from '$lib/stores/units.svelte';

export interface StandardAxisConfig {
	xAxis?: {
		format?: (value: any) => string;
		ticks?: any;
		labels?: boolean;
		line?: boolean;
		tweened?: boolean;
	};
	yAxis?: {
		format?: (value: any) => string;
		ticks?: any;
		labels?: boolean;
		line?: boolean;
		tweened?: boolean;
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
			xAxis: { ticks: [], labels: false, line: false },
			yAxis: { ticks: [], labels: false, line: false },
			grid: { x: false, y: false }
		};
	}

	return {
		xAxis: {
			format: (value) => String(value),
			tweened: true
		},
		yAxis: {
			format: (num) => formatNumber(num, aggregation === 'sum' ? getEnergyPrefix() : getPowerPrefix(), aggregation === 'sum' ? 'Wh' : 'W'),
			tweened: true
		},
		grid: {
			x: false,
			y: true
		}
	};
}

/**
 * Standard axis configuration for hourly/daily timeline charts
 */
export function getTimelineAxisConfig(displayAxes: boolean = true): StandardAxisConfig {
	if (!displayAxes) {
		return {
			xAxis: { ticks: [], labels: false, line: false },
			yAxis: { ticks: [], labels: false, line: false },
			grid: { x: false, y: false }
		};
	}

	return {
		xAxis: {
			tweened: true
		},
		yAxis: {
			format: 'metric',
			tweened: true
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
			xAxis: { ticks: [], labels: false, line: false },
			yAxis: { ticks: [], labels: false, line: false },
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
			tweened: true
		},
		yAxis: {
			format: (value) => `${Math.round(value)}h`,
			tweened: true
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
			xAxis: { ticks: [], labels: false, line: false },
			yAxis: { ticks: [], labels: false, line: false },
			grid: { x: false, y: false }
		};
	}

	return {
		xAxis: {
			tweened: true
		},
		yAxis: {
			format: (value) => formatNumber(value, getEnergyPrefix(), 'Wh'),
			tweened: true
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
		xAxis: displayAxes ? { tweened: true } : { ticks: [], labels: false, line: false },
		yAxis: displayAxes ? { format: 'metric', tweened: true } : { ticks: [], labels: false, line: false },
		bars: { tweened: true, radius: 2, stroke: 'none' }
	};
}
