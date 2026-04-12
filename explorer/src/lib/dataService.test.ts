/**
 * Tests for dataService utilities
 */

import { describe, it, expect } from 'vitest';
import { calculateHistogram, calculateSegmentData } from './dataService';
import type { DemandRow } from './dataService';

describe('calculateHistogram', () => {
	it('should create histogram bins from data', () => {
		const data: DemandRow[] = [
			{
				period: new Date('2025-01-01'),
				value: 10,
				geography: 'total',
				segment: 'total',
				scenario_id: 'base',
				timestamp_year: 2025
			},
			{
				period: new Date('2025-01-02'),
				value: 20,
				geography: 'total',
				segment: 'total',
				scenario_id: 'base',
				timestamp_year: 2025
			},
			{
				period: new Date('2025-01-03'),
				value: 30,
				geography: 'total',
				segment: 'total',
				scenario_id: 'base',
				timestamp_year: 2025
			},
			{
				period: new Date('2025-01-04'),
				value: 40,
				geography: 'total',
				segment: 'total',
				scenario_id: 'base',
				timestamp_year: 2025
			},
			{
				period: new Date('2025-01-05'),
				value: 50,
				geography: 'total',
				segment: 'total',
				scenario_id: 'base',
				timestamp_year: 2025
			}
		];

		const bins = calculateHistogram(data, 'value', 5);

		expect(bins).toBeDefined();
		expect(bins.length).toBe(5);
		expect(bins[0]).toHaveProperty('x0');
		expect(bins[0]).toHaveProperty('x1');
		expect(bins[0]).toHaveProperty('length');
	});

	it('should handle empty data', () => {
		const bins = calculateHistogram([], 'value', 10);
		expect(bins).toEqual([]);
	});

	it('should handle data with same values', () => {
		const data: DemandRow[] = [
			{
				period: new Date('2025-01-01'),
				value: 100,
				geography: 'total',
				segment: 'total',
				scenario_id: 'base',
				timestamp_year: 2025
			},
			{
				period: new Date('2025-01-02'),
				value: 100,
				geography: 'total',
				segment: 'total',
				scenario_id: 'base',
				timestamp_year: 2025
			},
			{
				period: new Date('2025-01-03'),
				value: 100,
				geography: 'total',
				segment: 'total',
				scenario_id: 'base',
				timestamp_year: 2025
			}
		];

		const bins = calculateHistogram(data, 'value', 5);
		expect(bins).toBeDefined();
		expect(bins.length).toBe(1);
		expect(bins[0].length).toBe(3);
	});
});

describe('calculateSegmentData', () => {
	it('should aggregate data by segment', () => {
		const data: DemandRow[] = [
			{
				period: new Date('2025-01-01'),
				value: 100,
				geography: 'total',
				segment: 'housing',
				scenario_id: 'base',
				timestamp_year: 2025
			},
			{
				period: new Date('2025-01-01'),
				value: 200,
				geography: 'total',
				segment: 'transport',
				scenario_id: 'base',
				timestamp_year: 2025
			},
			{
				period: new Date('2025-01-01'),
				value: 150,
				geography: 'total',
				segment: 'housing',
				scenario_id: 'base',
				timestamp_year: 2025
			}
		];

		const segmentData = calculateSegmentData(data, 'total');

		expect(segmentData).toBeDefined();
		expect(segmentData.length).toBe(2);

		const housing = segmentData.find((s) => s.segment === 'housing');
		expect(housing?.value).toBe(250);

		const transport = segmentData.find((s) => s.segment === 'transport');
		expect(transport?.value).toBe(200);
	});

	it('should handle empty data', () => {
		const segmentData = calculateSegmentData([], 'total');
		expect(segmentData).toEqual([]);
	});

	it('should filter by geography', () => {
		const data: DemandRow[] = [
			{
				period: new Date('2025-01-01'),
				value: 100,
				geography: 'stockholm',
				segment: 'housing',
				scenario_id: 'base',
				timestamp_year: 2025
			},
			{
				period: new Date('2025-01-01'),
				value: 200,
				geography: 'gothenburg',
				segment: 'housing',
				scenario_id: 'base',
				timestamp_year: 2025
			}
		];

		const stockholmData = calculateSegmentData(data, 'stockholm');
		expect(stockholmData.length).toBe(1);
		expect(stockholmData[0].value).toBe(100);
	});
});
