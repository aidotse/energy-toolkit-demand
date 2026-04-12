/**
 * Tests for chartConfig
 *
 * Tests segment label/color lookups and axis configuration factories.
 */

import { describe, test, expect, vi } from 'vitest';

// Mock Paraglide messages before importing chartConfig
vi.mock('$lib/paraglide/messages', () => ({
	segment_industry: () => 'Industri',
	segment_housing: () => 'Bostäder',
	segment_services: () => 'Service',
	segment_transport: () => 'Transport',
	segment_datacenters: () => 'Datacenter',
	segment_total: () => 'Total'
}));

// Mock units store
vi.mock('$lib/stores/units.svelte', () => ({
	getEnergyPrefix: () => 'T',
	getPowerPrefix: () => 'G'
}));

import {
	SEGMENT_ORDER,
	SEGMENT_LABELS,
	getSegmentLabel,
	getSegmentColor,
	getTimeSeriesAxisConfig,
	getTimelineAxisConfig,
	getDistributionAxisConfig,
	getGeographicAxisConfig,
	getBarChartProps
} from './chartConfig';

describe('SEGMENT_ORDER', () => {
	test('contains all 5 segments', () => {
		expect(SEGMENT_ORDER).toHaveLength(5);
		expect(SEGMENT_ORDER).toContain('industry');
		expect(SEGMENT_ORDER).toContain('housing');
		expect(SEGMENT_ORDER).toContain('services');
		expect(SEGMENT_ORDER).toContain('transport');
		expect(SEGMENT_ORDER).toContain('datacenters');
	});

	test('industry is first (largest sector)', () => {
		expect(SEGMENT_ORDER[0]).toBe('industry');
	});
});

describe('getSegmentLabel', () => {
	test('returns localized label for known segments', () => {
		expect(getSegmentLabel('industry')).toBe('Industri');
		expect(getSegmentLabel('housing')).toBe('Bostäder');
		expect(getSegmentLabel('services')).toBe('Service');
		expect(getSegmentLabel('transport')).toBe('Transport');
		expect(getSegmentLabel('datacenters')).toBe('Datacenter');
	});

	test('returns label for total', () => {
		expect(getSegmentLabel('total')).toBe('Total');
	});

	test('returns raw segment name for unknown segments', () => {
		expect(getSegmentLabel('unknown_segment')).toBe('unknown_segment');
		expect(getSegmentLabel('')).toBe('');
	});
});

describe('getSegmentColor', () => {
	test('returns color config for known segments', () => {
		const industry = getSegmentColor('industry');
		expect(industry.bg).toBeDefined();
		expect(industry.text).toBeDefined();
		expect(typeof industry.bg).toBe('string');
	});

	test('returns fallback for unknown segments', () => {
		const unknown = getSegmentColor('nonexistent');
		expect(unknown.bg).toBeDefined();
		expect(unknown.text).toBe('white');
	});

	test('all SEGMENT_ORDER segments have colors', () => {
		for (const segment of SEGMENT_ORDER) {
			const color = getSegmentColor(segment);
			expect(color.bg).toBeTruthy();
		}
	});
});

describe('getTimeSeriesAxisConfig', () => {
	test('returns full config when displayAxes is true', () => {
		const config = getTimeSeriesAxisConfig(true);
		expect(config.xAxis?.format).toBeDefined();
		expect(config.yAxis?.format).toBeDefined();
		expect(config.grid).toEqual({ x: false, y: false });
	});

	test('returns hidden config when displayAxes is false', () => {
		const config = getTimeSeriesAxisConfig(false);
		expect(config.xAxis?.ticks).toEqual([]);
		expect(config.xAxis?.labels).toBe(false);
		expect(config.yAxis?.labels).toBe(false);
	});

	test('xAxis format returns string representation', () => {
		const config = getTimeSeriesAxisConfig(true);
		const format = config.xAxis?.format as (v: number) => string;
		expect(format(2025)).toBe('2025');
	});
});

describe('getTimelineAxisConfig', () => {
	test('returns config with y grid when displayAxes is true', () => {
		const config = getTimelineAxisConfig(true);
		expect(config.grid).toEqual({ x: false, y: true });
	});

	test('returns hidden config when displayAxes is false', () => {
		const config = getTimelineAxisConfig(false);
		expect(config.xAxis?.labels).toBe(false);
	});
});

describe('getDistributionAxisConfig', () => {
	test('returns config with tick function when displayAxes is true', () => {
		const config = getDistributionAxisConfig(true);
		expect(typeof config.xAxis?.ticks).toBe('function');
	});

	test('tick function handles empty domain', () => {
		const config = getDistributionAxisConfig(true);
		const tickFn = config.xAxis?.ticks as (scale: { domain(): unknown[] }) => unknown[];
		const result = tickFn({ domain: () => [] });
		expect(result).toEqual([]);
	});

	test('yAxis format adds h suffix', () => {
		const config = getDistributionAxisConfig(true);
		const format = config.yAxis?.format as (v: number) => string;
		expect(format(42)).toBe('42h');
	});
});

describe('getGeographicAxisConfig', () => {
	test('returns config with y grid when displayAxes is true', () => {
		const config = getGeographicAxisConfig(true);
		expect(config.grid).toEqual({ x: false, y: true });
	});
});

describe('getBarChartProps', () => {
	test('returns default config', () => {
		const props = getBarChartProps();
		expect(props.bars).toBeDefined();
		expect(props.xAxis).toBeDefined();
		expect(props.yAxis).toBeDefined();
	});

	test('hides axes when displayAxes is false', () => {
		const props = getBarChartProps({ displayAxes: false });
		expect(props.xAxis.labels).toBe(false);
		expect(props.yAxis.labels).toBe(false);
	});
});
