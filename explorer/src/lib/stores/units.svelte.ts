/**
 * Units configuration store
 *
 * Provides access to data unit prefixes loaded from the API.
 * Default values are used until globals are loaded.
 */

import type { UnitsConfig } from '../../types/api';

// Default unit configuration (fallback if not loaded from API)
const DEFAULT_UNITS: UnitsConfig = {
	energy: { prefix: 'G', unit: 'Wh' },
	power: { prefix: 'G', unit: 'W' }
};

/**
 * Units configuration state
 */
class UnitsState {
	private _config = $state<UnitsConfig>(DEFAULT_UNITS);

	get energy() {
		return this._config.energy;
	}

	get power() {
		return this._config.power;
	}

	get energyPrefix() {
		return this._config.energy.prefix;
	}

	get powerPrefix() {
		return this._config.power.prefix;
	}

	/**
	 * Initialize units from globals data
	 */
	initialize(units?: UnitsConfig) {
		if (units) {
			this._config = units;
		}
	}

	/**
	 * Reset to default values
	 */
	reset() {
		this._config = DEFAULT_UNITS;
	}
}

export const unitsState = new UnitsState();

/**
 * Get the energy unit prefix (for formatNumber calls)
 */
export function getEnergyPrefix(): string {
	return unitsState.energyPrefix;
}

/**
 * Get the power unit prefix (for formatNumber calls)
 */
export function getPowerPrefix(): string {
	return unitsState.powerPrefix;
}
