/**
 * Tests for parameterStore
 *
 * Note: The parameterStore uses Svelte 5 $state() runes in a .svelte.ts file.
 * Tests run in vitest browser mode where the Svelte compiler processes runes.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { parameterStore, getParameterLabel, parameterHasData } from './parameterStore.svelte';
import type { Strategy2Config, Strategy2Parameter } from '$lib/dataService';

// Helper to create a mock Strategy2Config
function createMockConfig(overrides?: Partial<Strategy2Config>): Strategy2Config {
    return {
        baseScenarios: [
            { id: 'beslutad-policy', name: 'Beslutad policy', default: true },
            { id: 'high-growth', name: 'High Growth', default: false },
        ],
        parameters: {
            housing_growth: {
                label: 'Housing Growth',
                segment: 'housing',
                values: [
                    { index: 0, label: 'Baseline', hasData: true },
                    { index: 1, label: 'High', hasData: true },
                    { index: 2, label: 'Low', hasData: false },
                ],
            },
            transport_flex: {
                label: 'Transport Flex',
                segment: 'transport',
                values: [
                    { index: 0, label: 'Baseline', hasData: true },
                    { index: 1, label: 'High', hasData: true },
                ],
            },
        },
        defaults: {
            housing_growth: 0,
            transport_flex: 0,
        },
        bySegment: {
            housing: [
                {
                    name: 'housing_growth',
                    label: 'Housing Growth',
                    segment: 'housing',
                    values: [
                        { index: 0, label: 'Baseline', hasData: true },
                        { index: 1, label: 'High', hasData: true },
                        { index: 2, label: 'Low', hasData: false },
                    ],
                },
            ],
            transport: [
                {
                    name: 'transport_flex',
                    label: 'Transport Flex',
                    segment: 'transport',
                    values: [
                        { index: 0, label: 'Baseline', hasData: true },
                        { index: 1, label: 'High', hasData: true },
                    ],
                },
            ],
        },
        ...overrides,
    };
}

describe('parameterStore', () => {
    beforeEach(() => {
        // Reset by re-initializing with null then a fresh config
        parameterStore.initialize(null);
    });

    test('initial state before initialization', () => {
        expect(parameterStore.config).toBeNull();
        expect(parameterStore.isInitialized).toBe(false);
    });

    test('initialize sets config and defaults', () => {
        const config = createMockConfig();
        parameterStore.initialize(config);

        expect(parameterStore.isInitialized).toBe(true);
        expect(parameterStore.config).toBe(config);
        expect(parameterStore.baseScenario).toBe('beslutad-policy');
        expect(parameterStore.parameterValues).toEqual({ housing_growth: 0, transport_flex: 0 });
    });

    test('initialize with null clears config', () => {
        parameterStore.initialize(createMockConfig());
        parameterStore.initialize(null);

        expect(parameterStore.config).toBeNull();
        expect(parameterStore.isInitialized).toBe(false);
    });

    test('setBaseScenario updates the scenario', () => {
        parameterStore.initialize(createMockConfig());
        parameterStore.setBaseScenario('high-growth');

        expect(parameterStore.baseScenario).toBe('high-growth');
    });

    test('setBaseScenario resets parameters when switching away from default', () => {
        const config = createMockConfig();
        parameterStore.initialize(config);
        parameterStore.setParameterValue('housing_growth', 1);

        // Switch away from default -> resets params
        parameterStore.setBaseScenario('high-growth');
        expect(parameterStore.parameterValues).toEqual({ housing_growth: 0, transport_flex: 0 });
    });

    test('setBaseScenario preserves parameters when setting default scenario', () => {
        const config = createMockConfig();
        parameterStore.initialize(config);
        parameterStore.setParameterValue('housing_growth', 1);

        // Set to default scenario -> should preserve params
        parameterStore.setBaseScenario('beslutad-policy');
        expect(parameterStore.parameterValues.housing_growth).toBe(1);
    });

    test('setParameterValue updates a single parameter', () => {
        parameterStore.initialize(createMockConfig());
        parameterStore.setParameterValue('housing_growth', 2);

        expect(parameterStore.parameterValues.housing_growth).toBe(2);
        expect(parameterStore.parameterValues.transport_flex).toBe(0);
    });

    test('setParameterValues updates multiple parameters', () => {
        parameterStore.initialize(createMockConfig());
        parameterStore.setParameterValues({ housing_growth: 1, transport_flex: 1 });

        expect(parameterStore.parameterValues).toEqual({ housing_growth: 1, transport_flex: 1 });
    });

    test('resetToBaseline sets all parameters to defaults', () => {
        parameterStore.initialize(createMockConfig());
        parameterStore.setParameterValues({ housing_growth: 2, transport_flex: 1 });
        parameterStore.resetToBaseline();

        expect(parameterStore.parameterValues).toEqual({ housing_growth: 0, transport_flex: 0 });
    });

    test('resetSegment resets only parameters in that segment', () => {
        parameterStore.initialize(createMockConfig());
        parameterStore.setParameterValues({ housing_growth: 2, transport_flex: 1 });
        parameterStore.resetSegment('housing');

        expect(parameterStore.parameterValues.housing_growth).toBe(0);
        expect(parameterStore.parameterValues.transport_flex).toBe(1);
    });

    test('getParameterValue returns value by name', () => {
        parameterStore.initialize(createMockConfig());
        parameterStore.setParameterValue('housing_growth', 1);

        expect(parameterStore.getParameterValue('housing_growth')).toBe(1);
        expect(parameterStore.getParameterValue('nonexistent')).toBe(0);
    });

    test('hasActiveParameters detects non-zero parameters', () => {
        parameterStore.initialize(createMockConfig());
        expect(parameterStore.hasActiveParameters).toBe(false);

        parameterStore.setParameterValue('housing_growth', 1);
        expect(parameterStore.hasActiveParameters).toBe(true);
    });

    test('activeParameterCount counts non-zero parameters', () => {
        parameterStore.initialize(createMockConfig());
        expect(parameterStore.activeParameterCount).toBe(0);

        parameterStore.setParameterValues({ housing_growth: 1, transport_flex: 1 });
        expect(parameterStore.activeParameterCount).toBe(2);
    });

    test('isDefaultScenario checks against config default', () => {
        parameterStore.initialize(createMockConfig());
        expect(parameterStore.isDefaultScenario).toBe(true);

        parameterStore.setBaseScenario('high-growth');
        expect(parameterStore.isDefaultScenario).toBe(false);
    });

    test('baseScenarios returns config baseScenarios', () => {
        parameterStore.initialize(createMockConfig());
        expect(parameterStore.baseScenarios).toHaveLength(2);
        expect(parameterStore.baseScenarios[0].id).toBe('beslutad-policy');
    });

    test('parametersBySegment returns config bySegment', () => {
        parameterStore.initialize(createMockConfig());
        const bySegment = parameterStore.parametersBySegment;
        expect(Object.keys(bySegment)).toContain('housing');
        expect(Object.keys(bySegment)).toContain('transport');
    });

    test('defaultScenario returns the default from config', () => {
        parameterStore.initialize(createMockConfig());
        expect(parameterStore.defaultScenario?.id).toBe('beslutad-policy');
    });

    test('exportState includes only non-zero parameters', () => {
        parameterStore.initialize(createMockConfig());
        parameterStore.setParameterValue('housing_growth', 2);

        const exported = parameterStore.exportState();
        expect(exported.baseScenario).toBe('beslutad-policy');
        expect(exported.params).toEqual({ housing_growth: 2 });
        expect(exported.params).not.toHaveProperty('transport_flex');
    });

    test('importState restores base scenario and parameters', () => {
        parameterStore.initialize(createMockConfig());
        parameterStore.importState({
            baseScenario: 'high-growth',
            params: { housing_growth: 1 },
        });

        expect(parameterStore.baseScenario).toBe('high-growth');
        expect(parameterStore.parameterValues.housing_growth).toBe(1);
        expect(parameterStore.parameterValues.transport_flex).toBe(0);
    });

    test('importState with only params preserves baseScenario', () => {
        parameterStore.initialize(createMockConfig());
        parameterStore.importState({ params: { transport_flex: 1 } });

        expect(parameterStore.baseScenario).toBe('beslutad-policy');
        expect(parameterStore.parameterValues.transport_flex).toBe(1);
    });

    test('getParameter returns parameter definition', () => {
        parameterStore.initialize(createMockConfig());
        const param = parameterStore.getParameter('housing_growth');
        expect(param).not.toBeNull();
        expect(param?.name).toBe('housing_growth');
    });

    test('getParameter returns null for unknown parameter', () => {
        parameterStore.initialize(createMockConfig());
        expect(parameterStore.getParameter('nonexistent')).toBeNull();
    });
});

describe('getParameterLabel', () => {
    test('returns label for known index', () => {
        const param: Strategy2Parameter = {
            name: 'test',
            label: 'Test',
            segment: 'test',
            values: [
                { index: 0, label: 'Baseline', hasData: true },
                { index: 1, label: 'High', hasData: true },
            ],
        };
        expect(getParameterLabel(param, 0)).toBe('Baseline');
        expect(getParameterLabel(param, 1)).toBe('High');
    });

    test('returns fallback for unknown index', () => {
        const param: Strategy2Parameter = {
            name: 'test',
            label: 'Test',
            segment: 'test',
            values: [{ index: 0, label: 'Baseline', hasData: true }],
        };
        expect(getParameterLabel(param, 99)).toBe('Index 99');
    });
});

describe('parameterHasData', () => {
    test('returns true when value has data', () => {
        const param: Strategy2Parameter = {
            name: 'test',
            label: 'Test',
            segment: 'test',
            values: [{ index: 0, label: 'Baseline', hasData: true }],
        };
        expect(parameterHasData(param, 0)).toBe(true);
    });

    test('returns false when value has no data', () => {
        const param: Strategy2Parameter = {
            name: 'test',
            label: 'Test',
            segment: 'test',
            values: [{ index: 0, label: 'Baseline', hasData: false }],
        };
        expect(parameterHasData(param, 0)).toBe(false);
    });

    test('returns false for unknown index', () => {
        const param: Strategy2Parameter = {
            name: 'test',
            label: 'Test',
            segment: 'test',
            values: [{ index: 0, label: 'Baseline', hasData: true }],
        };
        expect(parameterHasData(param, 99)).toBe(false);
    });
});
