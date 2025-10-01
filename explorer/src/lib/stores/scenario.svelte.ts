/**
 * Scenario Store (Svelte 5 Runes)
 *
 * Global reactive state for the currently selected scenario.
 * Components can subscribe to this to update when scenario changes.
 */

/**
 * Scenario State Object
 */
class ScenarioState {
	currentScenario = $state<any | null>(null);
	scenarios = $state<any[]>([]);

	setScenario(scenario: any) {
		this.currentScenario = scenario;
	}

	setScenarios(scenarios: any[]) {
		this.scenarios = scenarios;
	}

	// Find scenario by parameters
	findScenarioByParameters(parameters: Record<string, number>): any | null {
		return this.scenarios.find((scenario) => {
			if (!scenario.parameters) return false;
			return Object.keys(parameters).every(
				(key) => scenario.parameters[key] === parameters[key]
			);
		});
	}

	// Get scenario ID for API calls
	get scenarioId(): string {
		return this.currentScenario?.scenario_id || this.currentScenario?.id || 'default';
	}

	// Get scenario name for display
	get scenarioName(): string {
		return this.currentScenario?.name || 'Default Scenario';
	}
}

export const scenarioState = new ScenarioState();
