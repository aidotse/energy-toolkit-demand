/**
 * Chart Parameters Store
 *
 * Manages per-chart parameter overrides for the chart library page.
 * Each chart can override global parameters (geography, year, segment, resolution, aggregation).
 */

import type { ChartParameters } from '$lib/types/controls';

interface ChartParameterState {
	[chartId: string]: ChartParameters;
}

class ChartParametersStore {
	private state = $state<ChartParameterState>({});

	/**
	 * Get parameters for a specific chart
	 */
	getParameters(chartId: string): ChartParameters {
		return this.state[chartId] || {};
	}

	/**
	 * Set a parameter for a specific chart
	 */
	setParameter<K extends keyof ChartParameters>(
		chartId: string,
		key: K,
		value: ChartParameters[K]
	) {
		if (!this.state[chartId]) {
			this.state[chartId] = {};
		}
		this.state[chartId][key] = value;
	}

	/**
	 * Clear a specific parameter for a chart
	 */
	clearParameter(chartId: string, key: keyof ChartParameters) {
		if (this.state[chartId]) {
			delete this.state[chartId][key];
			// Clean up empty objects
			if (Object.keys(this.state[chartId]).length === 0) {
				delete this.state[chartId];
			}
		}
	}

	/**
	 * Clear all parameters for a chart
	 */
	clearChart(chartId: string) {
		delete this.state[chartId];
	}

	/**
	 * Check if a chart has any overrides
	 */
	hasOverrides(chartId: string): boolean {
		return !!this.state[chartId] && Object.keys(this.state[chartId]).length > 0;
	}

	/**
	 * Get count of overridden parameters for a chart
	 */
	getOverrideCount(chartId: string): number {
		return this.state[chartId] ? Object.keys(this.state[chartId]).length : 0;
	}

	/**
	 * Clear all chart overrides
	 */
	clearAll() {
		this.state = {};
	}
}

export const chartParametersStore = new ChartParametersStore();
