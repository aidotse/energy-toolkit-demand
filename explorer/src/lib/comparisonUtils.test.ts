import { describe, test, expect } from 'vitest';
import {
    assignScenarioColors,
    getScenarioColor,
    calculateAbsoluteDifferences,
    calculatePercentageDifferences,
    mergeScenarioData,
    formatPercentageDiff,
    formatAbsoluteDiff,
    hexToRgba,
    getNormalizedScenarios
} from './comparisonUtils';
import { COMPARISON_COLORS, SCENARIO_COLORS } from './colors';
import type { ScenarioObject } from '$lib/types/ChartComponent.interface';

describe('assignScenarioColors', () => {
    test('assigns colors from COMPARISON_COLORS palette', () => {
        const scenarios: ScenarioObject[] = [
            { id: 'a', name: 'Scenario A' },
            { id: 'b', name: 'Scenario B' },
        ];
        const result = assignScenarioColors(scenarios);
        expect(result[0].color).toBe(COMPARISON_COLORS[0]);
        expect(result[1].color).toBe(COMPARISON_COLORS[1]);
    });

    test('preserves existing color if already set', () => {
        const scenarios: ScenarioObject[] = [
            { id: 'a', name: 'Scenario A', color: '#ff0000' },
        ];
        const result = assignScenarioColors(scenarios);
        expect(result[0].color).toBe('#ff0000');
    });

    test('wraps around when more scenarios than colors', () => {
        const scenarios: ScenarioObject[] = Array.from({ length: COMPARISON_COLORS.length + 1 }, (_, i) => ({
            id: `s${i}`,
            name: `Scenario ${i}`,
        }));
        const result = assignScenarioColors(scenarios);
        expect(result[COMPARISON_COLORS.length].color).toBe(COMPARISON_COLORS[0]);
    });

    test('handles empty array', () => {
        expect(assignScenarioColors([])).toEqual([]);
    });
});

describe('getScenarioColor', () => {
    test('returns color by scenario id', () => {
        const scenarios: ScenarioObject[] = [
            { id: 'base', color: '#123456' },
            { id: 'alt', color: '#abcdef' },
        ];
        expect(getScenarioColor('alt', scenarios)).toBe('#abcdef');
    });

    test('returns color by scenario_id', () => {
        const scenarios: ScenarioObject[] = [
            { scenario_id: 'sc1', color: '#111111' },
        ];
        expect(getScenarioColor('sc1', scenarios)).toBe('#111111');
    });

    test('returns default baseline color for unknown scenario', () => {
        const scenarios: ScenarioObject[] = [
            { id: 'known', color: '#aabbcc' },
        ];
        expect(getScenarioColor('unknown', scenarios)).toBe(SCENARIO_COLORS.baseline);
    });

    test('returns default for empty scenarios', () => {
        expect(getScenarioColor('any', [])).toBe(SCENARIO_COLORS.baseline);
    });
});

describe('calculateAbsoluteDifferences', () => {
    test('calculates correct differences from baseline', () => {
        const scenarios: ScenarioObject[] = [
            { id: 'base' },
            { id: 'high' },
        ];
        const values = { base: 100, high: 150 };
        const result = calculateAbsoluteDifferences(values, scenarios);
        expect(result['base']).toBe(0);
        expect(result['high']).toBe(50);
    });

    test('handles negative differences', () => {
        const scenarios: ScenarioObject[] = [
            { id: 'base' },
            { id: 'low' },
        ];
        const values = { base: 200, low: 120 };
        const result = calculateAbsoluteDifferences(values, scenarios);
        expect(result['low']).toBe(-80);
    });

    test('handles empty scenarios', () => {
        expect(calculateAbsoluteDifferences({ a: 1 }, [])).toEqual({});
    });

    test('handles missing values', () => {
        const scenarios: ScenarioObject[] = [
            { id: 'base' },
            { id: 'missing' },
        ];
        const values = { base: 100 };
        const result = calculateAbsoluteDifferences(values, scenarios);
        expect(result['missing']).toBe(-100);
    });
});

describe('calculatePercentageDifferences', () => {
    test('calculates correct percentages', () => {
        const scenarios: ScenarioObject[] = [
            { id: 'base' },
            { id: 'double' },
        ];
        const values = { base: 100, double: 200 };
        const result = calculatePercentageDifferences(values, scenarios);
        expect(result['base']).toBe(0);
        expect(result['double']).toBe(100);
    });

    test('handles zero baseline', () => {
        const scenarios: ScenarioObject[] = [
            { id: 'base' },
            { id: 'other' },
        ];
        const values = { base: 0, other: 50 };
        const result = calculatePercentageDifferences(values, scenarios);
        expect(result['base']).toBe(0);
        expect(result['other']).toBe(0);
    });

    test('handles empty scenarios', () => {
        expect(calculatePercentageDifferences({}, [])).toEqual({});
    });
});

describe('mergeScenarioData', () => {
    test('merges datasets by timestamp', () => {
        const scenarios: ScenarioObject[] = [
            { id: 'a' },
            { id: 'b' },
        ];
        const dataByScenario = {
            a: [{ timestamp: new Date('2025-01-01'), value: 10 }],
            b: [{ timestamp: new Date('2025-01-01'), value: 20 }],
        };
        const result = mergeScenarioData(dataByScenario, scenarios);
        expect(result).toHaveLength(1);
        expect(result[0].values['a']).toBe(10);
        expect(result[0].values['b']).toBe(20);
    });

    test('handles missing data for a scenario', () => {
        const scenarios: ScenarioObject[] = [
            { id: 'a' },
            { id: 'b' },
        ];
        const dataByScenario = {
            a: [
                { timestamp: new Date('2025-01-01'), value: 10 },
                { timestamp: new Date('2026-01-01'), value: 15 },
            ],
            b: [{ timestamp: new Date('2025-01-01'), value: 20 }],
        };
        const result = mergeScenarioData(dataByScenario, scenarios);
        expect(result).toHaveLength(2);
        expect(result[1].values['a']).toBe(15);
        expect(result[1].values['b']).toBeUndefined();
    });

    test('handles empty data', () => {
        const scenarios: ScenarioObject[] = [{ id: 'a' }];
        const result = mergeScenarioData({}, scenarios);
        expect(result).toEqual([]);
    });

    test('sorts results by timestamp', () => {
        const scenarios: ScenarioObject[] = [{ id: 'a' }];
        const dataByScenario = {
            a: [
                { timestamp: new Date('2030-01-01'), value: 30 },
                { timestamp: new Date('2025-01-01'), value: 10 },
                { timestamp: new Date('2027-01-01'), value: 20 },
            ],
        };
        const result = mergeScenarioData(dataByScenario, scenarios);
        expect(result[0].timestamp.getFullYear()).toBe(2025);
        expect(result[1].timestamp.getFullYear()).toBe(2027);
        expect(result[2].timestamp.getFullYear()).toBe(2030);
    });
});

describe('formatPercentageDiff', () => {
    test('formats positive with sign', () => {
        expect(formatPercentageDiff(12.34)).toBe('+12.3%');
    });

    test('formats negative without extra sign', () => {
        expect(formatPercentageDiff(-5.67)).toBe('-5.7%');
    });

    test('formats zero', () => {
        expect(formatPercentageDiff(0)).toBe('0.0%');
    });

    test('formats without sign when includeSign is false', () => {
        expect(formatPercentageDiff(12.34, false)).toBe('12.3%');
    });
});

describe('formatAbsoluteDiff', () => {
    test('formats small values directly', () => {
        expect(formatAbsoluteDiff(42, 'Wh')).toBe('+42.0 Wh');
    });

    test('formats kilo range', () => {
        expect(formatAbsoluteDiff(5000, 'Wh')).toBe('+5.0 kWh');
    });

    test('formats mega range', () => {
        expect(formatAbsoluteDiff(2500000, 'Wh')).toBe('+2.5 MWh');
    });

    test('formats giga range', () => {
        expect(formatAbsoluteDiff(3e9, 'W')).toBe('+3.0 GW');
    });

    test('formats tera range', () => {
        expect(formatAbsoluteDiff(1.5e12, 'Wh')).toBe('+1.5 TWh');
    });

    test('formats negative values', () => {
        expect(formatAbsoluteDiff(-5000, 'Wh')).toBe('-5.0 kWh');
    });

    test('formats without sign when includeSign is false', () => {
        expect(formatAbsoluteDiff(5000, 'Wh', false)).toBe('5.0 kWh');
    });
});

describe('hexToRgba', () => {
    test('converts hex with hash to rgba', () => {
        expect(hexToRgba('#3b82f6', 0.5)).toBe('rgba(59, 130, 246, 0.5)');
    });

    test('converts hex without hash to rgba', () => {
        expect(hexToRgba('ff0000', 1)).toBe('rgba(255, 0, 0, 1)');
    });

    test('handles black', () => {
        expect(hexToRgba('#000000', 0)).toBe('rgba(0, 0, 0, 0)');
    });

    test('handles white', () => {
        expect(hexToRgba('#ffffff', 1)).toBe('rgba(255, 255, 255, 1)');
    });
});

describe('getNormalizedScenarios', () => {
    test('returns scenarios array if provided', () => {
        const scenarios: ScenarioObject[] = [
            { id: 'a' },
            { id: 'b' },
        ];
        expect(getNormalizedScenarios(undefined, scenarios)).toEqual(scenarios);
    });

    test('wraps single scenario into array', () => {
        const scenario: ScenarioObject = { id: 'single' };
        const result = getNormalizedScenarios(scenario, undefined);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('single');
    });

    test('returns empty array when nothing provided', () => {
        expect(getNormalizedScenarios(undefined, undefined)).toEqual([]);
    });

    test('prefers scenarios array over single scenario', () => {
        const scenario: ScenarioObject = { id: 'single' };
        const scenarios: ScenarioObject[] = [{ id: 'a' }, { id: 'b' }];
        expect(getNormalizedScenarios(scenario, scenarios)).toEqual(scenarios);
    });
});
