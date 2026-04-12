/**
 * Scenario Store (Svelte 5 Runes)
 *
 * Global reactive state for the currently selected scenario and comparison mode.
 *
 * **Staged vs Active comparison flow:**
 * 1. User picks scenarios → addToStaged() builds a candidate list
 * 2. User confirms → applyComparison() copies staged → active and enables comparison mode
 * 3. Charts read comparisonScenarios + comparisonMode for rendering
 *
 * Relationship to parameterStore: parameterStore manages *parameter-level* variations
 * within a single base scenario; this store manages *scenario-level* selection and
 * multi-scenario comparison.
 */

import type { Scenario } from '../../types/api';

/**
 * Scenario State Object
 */
class ScenarioState {
	currentScenario = $state<Scenario | null>(null);
	scenarios = $state<Scenario[]>([]);

	// Comparison mode state
	stagedComparisonScenarios = $state<Scenario[]>([]);
	comparisonScenarios = $state<Scenario[]>([]);
	comparisonMode = $state<boolean>(false);

	setScenario(scenario: Scenario) {
		this.currentScenario = scenario;
	}

	setScenarios(scenarios: Scenario[]) {
		this.scenarios = scenarios;
	}

	// Staged comparison methods (scenarios prepared but not yet applied)
	addToStaged(scenario: Scenario) {
		if (
			!this.stagedComparisonScenarios.find(
				(s) => (s.id || s.scenario_id) === (scenario.id || scenario.scenario_id)
			)
		) {
			this.stagedComparisonScenarios = [...this.stagedComparisonScenarios, scenario];
		}
	}

	removeFromStaged(scenario: Scenario) {
		this.stagedComparisonScenarios = this.stagedComparisonScenarios.filter(
			(s) => (s.id || s.scenario_id) !== (scenario.id || scenario.scenario_id)
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
	addToComparison(scenario: Scenario) {
		if (
			!this.comparisonScenarios.find(
				(s) => (s.id || s.scenario_id) === (scenario.id || scenario.scenario_id)
			)
		) {
			this.comparisonScenarios = [...this.comparisonScenarios, scenario];
		}
		if (this.comparisonScenarios.length >= 2) {
			this.comparisonMode = true;
		}
	}

	removeFromComparison(scenario: Scenario) {
		this.comparisonScenarios = this.comparisonScenarios.filter(
			(s) => (s.id || s.scenario_id) !== (scenario.id || scenario.scenario_id)
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
	findScenarioByParameters(parameters: Record<string, number>): Scenario | null {
		return (
			this.scenarios.find((scenario) => {
				if (!scenario.parameters) return false;
				return Object.keys(parameters).every((key) => scenario.parameters[key] === parameters[key]);
			}) ?? null
		);
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
