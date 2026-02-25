/**
 * Parameter store for Strategy 2 independent parameters
 * Uses Svelte 5 runes for reactive state management
 */

import type {
    Strategy2Config,
    Strategy2BaseScenario,
    Strategy2Parameter,
    ParameterValues
} from '$lib/dataService';

/**
 * Store state interface
 */
interface ParameterStoreState {
    baseScenario: string;
    parameterValues: ParameterValues;
    config: Strategy2Config | null;
}

/**
 * Create the parameter store state
 */
function createParameterStore() {
    let state = $state<ParameterStoreState>({
        baseScenario: 'beslutad-policy',
        parameterValues: {},
        config: null
    });

    return {
        /**
         * Get current base scenario ID
         */
        get baseScenario() {
            return state.baseScenario;
        },

        /**
         * Get current parameter values
         */
        get parameterValues() {
            return state.parameterValues;
        },

        /**
         * Get Strategy 2 configuration
         */
        get config() {
            return state.config;
        },

        /**
         * Get available base scenarios
         */
        get baseScenarios(): Strategy2BaseScenario[] {
            return state.config?.baseScenarios || [];
        },

        /**
         * Get parameters grouped by segment
         */
        get parametersBySegment(): Record<string, Strategy2Parameter[]> {
            return state.config?.bySegment || {};
        },

        /**
         * Check if store is initialized with config
         */
        get isInitialized(): boolean {
            return state.config !== null;
        },

        /**
         * Check if the default base scenario is currently selected
         * Parameters are only applicable when the default scenario is selected
         */
        get isDefaultScenario(): boolean {
            const defaultScenario = state.config?.baseScenarios.find(s => s.default);
            return state.baseScenario === (defaultScenario?.id || 'beslutad-policy');
        },

        /**
         * Get the default base scenario
         */
        get defaultScenario(): Strategy2BaseScenario | null {
            return state.config?.baseScenarios.find(s => s.default) || null;
        },

        /**
         * Initialize store with Strategy 2 configuration
         */
        initialize(config: Strategy2Config | null) {
            if (!config) {
                state.config = null;
                return;
            }

            state.config = config;

            // Set default base scenario
            const defaultScenario = config.baseScenarios.find(s => s.default);
            state.baseScenario = defaultScenario?.id || config.baseScenarios[0]?.id || 'beslutad-policy';

            // Set default parameter values (all 0 = baseline)
            state.parameterValues = { ...config.defaults };
        },

        /**
         * Set base scenario
         * Resets parameters to baseline when switching away from the default scenario,
         * since parameter adjustments only apply to the default scenario.
         */
        setBaseScenario(scenarioId: string) {
            state.baseScenario = scenarioId;

            const defaultId = state.config?.baseScenarios.find(s => s.default)?.id || 'beslutad-policy';
            if (scenarioId !== defaultId && state.config?.defaults) {
                state.parameterValues = { ...state.config.defaults };
            }
        },

        /**
         * Set a single parameter value
         */
        setParameterValue(paramName: string, index: number) {
            state.parameterValues = {
                ...state.parameterValues,
                [paramName]: index
            };
        },

        /**
         * Set multiple parameter values at once
         */
        setParameterValues(values: ParameterValues) {
            state.parameterValues = {
                ...state.parameterValues,
                ...values
            };
        },

        /**
         * Reset all parameters to baseline (index 0)
         */
        resetToBaseline() {
            if (state.config?.defaults) {
                state.parameterValues = { ...state.config.defaults };
            }
        },

        /**
         * Reset a specific segment's parameters to baseline
         */
        resetSegment(segment: string) {
            const segmentParams = state.config?.bySegment[segment] || [];
            const updates: ParameterValues = {};

            for (const param of segmentParams) {
                updates[param.name] = 0;
            }

            state.parameterValues = {
                ...state.parameterValues,
                ...updates
            };
        },

        /**
         * Get parameter value by name
         */
        getParameterValue(paramName: string): number {
            return state.parameterValues[paramName] || 0;
        },

        /**
         * Get parameter definition by name
         */
        getParameter(paramName: string): Strategy2Parameter | null {
            if (!state.config?.parameters[paramName]) {
                return null;
            }
            return {
                name: paramName,
                ...state.config.parameters[paramName]
            };
        },

        /**
         * Check if any non-baseline parameters are active
         */
        get hasActiveParameters(): boolean {
            return Object.values(state.parameterValues).some(v => v > 0);
        },

        /**
         * Get count of active (non-baseline) parameters
         */
        get activeParameterCount(): number {
            return Object.values(state.parameterValues).filter(v => v > 0).length;
        },

        /**
         * Export current state for URL/sharing
         */
        exportState(): { baseScenario: string; params: Record<string, number> } {
            // Only include non-zero parameters
            const activeParams: Record<string, number> = {};
            for (const [name, value] of Object.entries(state.parameterValues)) {
                if (value > 0) {
                    activeParams[name] = value;
                }
            }

            return {
                baseScenario: state.baseScenario,
                params: activeParams
            };
        },

        /**
         * Import state from URL/sharing
         */
        importState(imported: { baseScenario?: string; params?: Record<string, number> }) {
            if (imported.baseScenario) {
                state.baseScenario = imported.baseScenario;
            }

            if (imported.params && state.config?.defaults) {
                // Start with defaults, then apply imported values
                state.parameterValues = {
                    ...state.config.defaults,
                    ...imported.params
                };
            }
        }
    };
}

/**
 * Singleton parameter store instance
 */
export const parameterStore = createParameterStore();

/**
 * Helper to get parameter label from index
 */
export function getParameterLabel(param: Strategy2Parameter, index: number): string {
    const value = param.values.find(v => v.index === index);
    return value?.label || `Index ${index}`;
}

/**
 * Helper to check if a parameter value has data available
 */
export function parameterHasData(param: Strategy2Parameter, index: number): boolean {
    const value = param.values.find(v => v.index === index);
    return value?.hasData ?? false;
}
