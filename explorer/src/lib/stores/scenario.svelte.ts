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

	// Comparison mode state
	stagedComparisonScenarios = $state<any[]>([]); // Staged scenarios (not applied yet)
	comparisonScenarios = $state<any[]>([]); // Active comparison scenarios
	comparisonMode = $state<boolean>(false);

	setScenario(scenario: any) {
		this.currentScenario = scenario;
	}

	setScenarios(scenarios: any[]) {
		this.scenarios = scenarios;
	}

	// Staged comparison methods (scenarios prepared but not yet applied)
	addToStaged(scenario: any) {
		if (!this.stagedComparisonScenarios.find(s => (s.id || s.scenario_id) === (scenario.id || scenario.scenario_id))) {
			this.stagedComparisonScenarios = [...this.stagedComparisonScenarios, scenario];
		}
	}

	removeFromStaged(scenario: any) {
		this.stagedComparisonScenarios = this.stagedComparisonScenarios.filter(
			s => (s.id || s.scenario_id) !== (scenario.id || scenario.scenario_id)
		);
	}

	clearStaged() {
		this.stagedComparisonScenarios = [];
	}

	// Apply staged scenarios to active comparison
	applyComparison() {
		if (this.stagedComparisonScenarios.length >= 2) {
			this.comparisonScenarios = [...this.stagedComparisonScenarios];
			this.comparisonMode = true;
		}
	}

	// Active comparison methods (for backwards compatibility and direct manipulation)
	addToComparison(scenario: any) {
		if (!this.comparisonScenarios.find(s => (s.id || s.scenario_id) === (scenario.id || scenario.scenario_id))) {
			this.comparisonScenarios = [...this.comparisonScenarios, scenario];
		}
		if (this.comparisonScenarios.length >= 2) {
			this.comparisonMode = true;
		}
	}

	removeFromComparison(scenario: any) {
		this.comparisonScenarios = this.comparisonScenarios.filter(
			s => (s.id || s.scenario_id) !== (scenario.id || scenario.scenario_id)
		);
		if (this.comparisonScenarios.length < 2) {
			this.comparisonMode = false;
		}
	}

	clearComparison() {
		this.comparisonScenarios = [];
		this.stagedComparisonScenarios = [];
		this.comparisonMode = false;
	}

	toggleComparisonMode() {
		this.comparisonMode = !this.comparisonMode;
		// If enabling comparison with only current scenario, add it
		if (this.comparisonMode && this.comparisonScenarios.length === 0 && this.currentScenario) {
			this.comparisonScenarios = [this.currentScenario];
		}
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
