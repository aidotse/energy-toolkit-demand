import { describe, test, expect } from 'vitest';
import { formatNumber, getGeos, makeDemandQuery, makeGeographiesQuery } from './utilities';

describe('formatNumber', () => {
    test('formats small numbers without prefix', () => {
        expect(formatNumber(500, '', 'Wh')).toBe('500 Wh');
    });

    test('scales up to kilo prefix', () => {
        expect(formatNumber(1500, '', 'Wh')).toBe('1.50 kWh');
    });

    test('handles input prefix correctly', () => {
        // 5 GWh = 5,000,000,000 Wh -> should display as 5.00 GWh
        expect(formatNumber(5, 'G', 'Wh')).toBe('5.00 GWh');
    });

    test('scales down large numbers', () => {
        // 1500 GWh = 1.5 TWh
        expect(formatNumber(1500, 'G', 'Wh')).toBe('1.50 TWh');
    });

    test('handles zero', () => {
        expect(formatNumber(0, '', 'Wh')).toBe('0.00 Wh');
    });

    test('handles negative numbers', () => {
        expect(formatNumber(-1500, '', 'Wh')).toBe('-1.50 kWh');
    });

    test('throws on invalid prefix', () => {
        expect(() => formatNumber(100, 'X', 'Wh')).toThrow('Invalid input prefix');
    });

    test('adjusts decimal places based on magnitude', () => {
        // num >= 100 -> 0 decimal places
        expect(formatNumber(150, '', 'Wh')).toBe('150 Wh');
        // num >= 10 -> 1 decimal place
        expect(formatNumber(15, '', 'Wh')).toBe('15.0 Wh');
        // num < 10 -> 2 decimal places
        expect(formatNumber(5, '', 'Wh')).toBe('5.00 Wh');
    });
});

describe('getGeos', () => {
    test('transforms geography objects', () => {
        const geos = [
            { geo_id: 'SE-01', geo_name: 'Stockholm' },
            { geo_id: 'SE-02', geo_name: 'Goteborg' },
        ];
        const result = getGeos(geos);
        expect(result).toHaveLength(2);
        expect(result[0]).toHaveProperty('label');
        expect(result[0]).toHaveProperty('value');
    });

    test('puts Sverige first', () => {
        const geos = [
            { geo_id: 'SE-01', geo_name: 'Stockholm' },
            { geo_id: 'SE-00', geo_name: 'Sverige' },
            { geo_id: 'SE-02', geo_name: 'Goteborg' },
        ];
        const result = getGeos(geos);
        expect(result[0].label).toBe('Sverige');
    });

    test('filters out invalid entries', () => {
        const geos = [
            { geo_id: 'SE-01', geo_name: 'Stockholm' },
            { geo_id: '', geo_name: '' },
            { geo_id: null, geo_name: null },
        ];
        const result = getGeos(geos);
        expect(result).toHaveLength(1);
    });

    test('handles empty array', () => {
        expect(getGeos([])).toEqual([]);
    });
});

describe('makeDemandQuery', () => {
    test('builds basic query parameters', () => {
        const qp = makeDemandQuery({
            start: '2025',
            end: '2050',
            resolution: '1Y',
            aggregation: 'sum',
            geography: 'total',
            segment: 'total',
        });
        expect(qp.get('period[start]')).toBe('2025');
        expect(qp.get('period[end]')).toBe('2050');
        expect(qp.get('period[resolution]')).toBe('1Y');
        expect(qp.get('geography')).toBe('total');
    });

    test('includes baseScenario when provided', () => {
        const qp = makeDemandQuery({
            start: '2025',
            end: '2050',
            resolution: '1Y',
            aggregation: 'sum',
            geography: 'total',
            segment: 'total',
            baseScenario: 'beslutad-policy',
        });
        expect(qp.get('baseScenario')).toBe('beslutad-policy');
    });

    test('includes non-zero parameter values', () => {
        const qp = makeDemandQuery({
            start: '2025',
            end: '2050',
            resolution: '1Y',
            aggregation: 'sum',
            geography: 'total',
            segment: 'total',
            parameterValues: { housing_growth: 2, transport_flex: 0 },
        });
        expect(qp.get('housing_growth')).toBe('2');
        expect(qp.has('transport_flex')).toBe(false);
    });

    test('falls back scenarioId to baseScenario', () => {
        const qp = makeDemandQuery({
            start: '2025',
            end: '2050',
            resolution: '1Y',
            aggregation: 'sum',
            geography: 'total',
            segment: 'total',
            scenarioId: 'high-growth',
        });
        expect(qp.get('baseScenario')).toBe('high-growth');
    });
});

describe('makeGeographiesQuery', () => {
    test('defaults to json format', () => {
        const qp = makeGeographiesQuery();
        expect(qp.get('format')).toBe('json');
    });

    test('accepts geojson format', () => {
        const qp = makeGeographiesQuery('geojson');
        expect(qp.get('format')).toBe('geojson');
    });
});
