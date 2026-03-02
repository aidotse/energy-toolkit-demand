/**
 * Tests for scenario store
 *
 * Note: The scenario store uses Svelte 5 $state() runes in a .svelte.ts file.
 * Tests run in vitest browser mode where the Svelte compiler processes runes.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { scenarioState } from './scenario.svelte';
import type { Scenario } from '../../types/api';

// Helper to create a mock Scenario
function createMockScenario(overrides?: Partial<Scenario>): Scenario {
	return {
		id: 'test-scenario',
		scenario_id: 'test-scenario',
		name: 'Test Scenario',
		default: false,
		parameters: { housing_growth: 0, transport_flex: 0 },
		...overrides,
	};
}

describe('scenarioState', () => {
	beforeEach(() => {
		scenarioState.clearComparison();
		scenarioState.setScenario(null as unknown as Scenario);
		scenarioState.setScenarios([]);
	});

	describe('initial state', () => {
		test('currentScenario is null', () => {
			expect(scenarioState.currentScenario).toBeNull();
		});

		test('scenarios is empty', () => {
			expect(scenarioState.scenarios).toEqual([]);
		});

		test('stagedComparisonScenarios is empty', () => {
			expect(scenarioState.stagedComparisonScenarios).toEqual([]);
		});

		test('comparisonScenarios is empty', () => {
			expect(scenarioState.comparisonScenarios).toEqual([]);
		});

		test('comparisonMode is false', () => {
			expect(scenarioState.comparisonMode).toBe(false);
		});
	});

	describe('setScenario / setScenarios', () => {
		test('setScenario updates currentScenario', () => {
			const scenario = createMockScenario();
			scenarioState.setScenario(scenario);

			expect(scenarioState.currentScenario).toBe(scenario);
		});

		test('setScenario can be called with different scenarios', () => {
			const first = createMockScenario({ id: 'first', name: 'First' });
			const second = createMockScenario({ id: 'second', name: 'Second' });

			scenarioState.setScenario(first);
			expect(scenarioState.currentScenario).toBe(first);

			scenarioState.setScenario(second);
			expect(scenarioState.currentScenario).toBe(second);
		});

		test('setScenarios updates the scenarios list', () => {
			const scenarios = [
				createMockScenario({ id: 'a', name: 'A' }),
				createMockScenario({ id: 'b', name: 'B' }),
			];
			scenarioState.setScenarios(scenarios);

			expect(scenarioState.scenarios).toHaveLength(2);
			expect(scenarioState.scenarios[0].id).toBe('a');
			expect(scenarioState.scenarios[1].id).toBe('b');
		});

		test('setScenarios with empty array clears scenarios', () => {
			scenarioState.setScenarios([createMockScenario()]);
			scenarioState.setScenarios([]);

			expect(scenarioState.scenarios).toEqual([]);
		});
	});

	describe('addToStaged / removeFromStaged / clearStaged', () => {
		test('addToStaged adds a scenario to staged list', () => {
			const scenario = createMockScenario({ id: 'staged-1' });
			scenarioState.addToStaged(scenario);

			expect(scenarioState.stagedComparisonScenarios).toHaveLength(1);
			expect(scenarioState.stagedComparisonScenarios[0].id).toBe('staged-1');
		});

		test('addToStaged does not add duplicate scenarios', () => {
			const scenario = createMockScenario({ id: 'staged-1' });
			scenarioState.addToStaged(scenario);
			scenarioState.addToStaged(scenario);

			expect(scenarioState.stagedComparisonScenarios).toHaveLength(1);
		});

		test('addToStaged deduplicates by id or scenario_id', () => {
			const a = createMockScenario({ id: 'same-id', scenario_id: undefined });
			const b = createMockScenario({ id: 'same-id', scenario_id: undefined, name: 'Different Name' });
			scenarioState.addToStaged(a);
			scenarioState.addToStaged(b);

			expect(scenarioState.stagedComparisonScenarios).toHaveLength(1);
		});

		test('addToStaged allows different scenarios', () => {
			scenarioState.addToStaged(createMockScenario({ id: 'a' }));
			scenarioState.addToStaged(createMockScenario({ id: 'b' }));

			expect(scenarioState.stagedComparisonScenarios).toHaveLength(2);
		});

		test('removeFromStaged removes a scenario by id', () => {
			const a = createMockScenario({ id: 'a' });
			const b = createMockScenario({ id: 'b' });
			scenarioState.addToStaged(a);
			scenarioState.addToStaged(b);

			scenarioState.removeFromStaged(a);

			expect(scenarioState.stagedComparisonScenarios).toHaveLength(1);
			expect(scenarioState.stagedComparisonScenarios[0].id).toBe('b');
		});

		test('removeFromStaged does nothing for non-existent scenario', () => {
			scenarioState.addToStaged(createMockScenario({ id: 'a' }));

			scenarioState.removeFromStaged(createMockScenario({ id: 'not-there' }));

			expect(scenarioState.stagedComparisonScenarios).toHaveLength(1);
		});

		test('clearStaged empties the staged list', () => {
			scenarioState.addToStaged(createMockScenario({ id: 'a' }));
			scenarioState.addToStaged(createMockScenario({ id: 'b' }));

			scenarioState.clearStaged();

			expect(scenarioState.stagedComparisonScenarios).toEqual([]);
		});
	});

	describe('applyComparison', () => {
		test('copies staged to active when >= 2 staged', () => {
			const a = createMockScenario({ id: 'a' });
			const b = createMockScenario({ id: 'b' });
			scenarioState.addToStaged(a);
			scenarioState.addToStaged(b);

			scenarioState.applyComparison();

			expect(scenarioState.comparisonScenarios).toHaveLength(2);
			expect(scenarioState.comparisonScenarios[0].id).toBe('a');
			expect(scenarioState.comparisonScenarios[1].id).toBe('b');
			expect(scenarioState.comparisonMode).toBe(true);
		});

		test('works with more than 2 staged scenarios', () => {
			scenarioState.addToStaged(createMockScenario({ id: 'a' }));
			scenarioState.addToStaged(createMockScenario({ id: 'b' }));
			scenarioState.addToStaged(createMockScenario({ id: 'c' }));

			scenarioState.applyComparison();

			expect(scenarioState.comparisonScenarios).toHaveLength(3);
			expect(scenarioState.comparisonMode).toBe(true);
		});

		test('does nothing with fewer than 2 staged scenarios', () => {
			scenarioState.addToStaged(createMockScenario({ id: 'a' }));

			scenarioState.applyComparison();

			expect(scenarioState.comparisonScenarios).toEqual([]);
			expect(scenarioState.comparisonMode).toBe(false);
		});

		test('does nothing with zero staged scenarios', () => {
			scenarioState.applyComparison();

			expect(scenarioState.comparisonScenarios).toEqual([]);
			expect(scenarioState.comparisonMode).toBe(false);
		});
	});

	describe('addToComparison / removeFromComparison', () => {
		test('addToComparison adds a scenario to active comparison', () => {
			const scenario = createMockScenario({ id: 'comp-1' });
			scenarioState.addToComparison(scenario);

			expect(scenarioState.comparisonScenarios).toHaveLength(1);
			expect(scenarioState.comparisonScenarios[0].id).toBe('comp-1');
		});

		test('addToComparison does not add duplicates', () => {
			const scenario = createMockScenario({ id: 'comp-1' });
			scenarioState.addToComparison(scenario);
			scenarioState.addToComparison(scenario);

			expect(scenarioState.comparisonScenarios).toHaveLength(1);
		});

		test('addToComparison auto-enables comparisonMode at >= 2 scenarios', () => {
			scenarioState.addToComparison(createMockScenario({ id: 'a' }));
			expect(scenarioState.comparisonMode).toBe(false);

			scenarioState.addToComparison(createMockScenario({ id: 'b' }));
			expect(scenarioState.comparisonMode).toBe(true);
		});

		test('removeFromComparison removes a scenario', () => {
			const a = createMockScenario({ id: 'a' });
			const b = createMockScenario({ id: 'b' });
			scenarioState.addToComparison(a);
			scenarioState.addToComparison(b);

			scenarioState.removeFromComparison(a);

			expect(scenarioState.comparisonScenarios).toHaveLength(1);
			expect(scenarioState.comparisonScenarios[0].id).toBe('b');
		});

		test('removeFromComparison auto-disables comparisonMode when < 2 remain', () => {
			const a = createMockScenario({ id: 'a' });
			const b = createMockScenario({ id: 'b' });
			scenarioState.addToComparison(a);
			scenarioState.addToComparison(b);
			expect(scenarioState.comparisonMode).toBe(true);

			scenarioState.removeFromComparison(b);
			expect(scenarioState.comparisonMode).toBe(false);
		});

		test('removeFromComparison does nothing for non-existent scenario', () => {
			scenarioState.addToComparison(createMockScenario({ id: 'a' }));

			scenarioState.removeFromComparison(createMockScenario({ id: 'not-there' }));

			expect(scenarioState.comparisonScenarios).toHaveLength(1);
		});
	});

	describe('clearComparison', () => {
		test('clears comparisonScenarios, stagedComparisonScenarios, and comparisonMode', () => {
			scenarioState.addToStaged(createMockScenario({ id: 'a' }));
			scenarioState.addToStaged(createMockScenario({ id: 'b' }));
			scenarioState.applyComparison();

			expect(scenarioState.comparisonScenarios).toHaveLength(2);
			expect(scenarioState.stagedComparisonScenarios).toHaveLength(2);
			expect(scenarioState.comparisonMode).toBe(true);

			scenarioState.clearComparison();

			expect(scenarioState.comparisonScenarios).toEqual([]);
			expect(scenarioState.stagedComparisonScenarios).toEqual([]);
			expect(scenarioState.comparisonMode).toBe(false);
		});
	});

	describe('toggleComparisonMode', () => {
		test('toggles comparisonMode from false to true', () => {
			scenarioState.toggleComparisonMode();
			expect(scenarioState.comparisonMode).toBe(true);
		});

		test('toggles comparisonMode from true to false', () => {
			scenarioState.toggleComparisonMode();
			scenarioState.toggleComparisonMode();
			expect(scenarioState.comparisonMode).toBe(false);
		});

		test('adds current scenario to comparison when enabling with empty list', () => {
			const current = createMockScenario({ id: 'current' });
			scenarioState.setScenario(current);

			scenarioState.toggleComparisonMode();

			expect(scenarioState.comparisonMode).toBe(true);
			expect(scenarioState.comparisonScenarios).toHaveLength(1);
			expect(scenarioState.comparisonScenarios[0].id).toBe('current');
		});

		test('does not add scenario when enabling if comparison list is non-empty', () => {
			const current = createMockScenario({ id: 'current' });
			const existing = createMockScenario({ id: 'existing' });
			scenarioState.setScenario(current);
			scenarioState.addToComparison(existing);

			scenarioState.toggleComparisonMode();

			expect(scenarioState.comparisonMode).toBe(true);
			expect(scenarioState.comparisonScenarios).toHaveLength(1);
			expect(scenarioState.comparisonScenarios[0].id).toBe('existing');
		});

		test('does not add scenario when enabling if currentScenario is null', () => {
			scenarioState.toggleComparisonMode();

			expect(scenarioState.comparisonMode).toBe(true);
			expect(scenarioState.comparisonScenarios).toEqual([]);
		});
	});

	describe('findScenarioByParameters', () => {
		const scenariosWithParams = [
			createMockScenario({ id: 'low', parameters: { housing_growth: 0, transport_flex: 0 } }),
			createMockScenario({ id: 'high', parameters: { housing_growth: 1, transport_flex: 1 } }),
			createMockScenario({ id: 'mixed', parameters: { housing_growth: 1, transport_flex: 0 } }),
		];

		beforeEach(() => {
			scenarioState.setScenarios(scenariosWithParams);
		});

		test('finds a scenario matching all parameters', () => {
			const result = scenarioState.findScenarioByParameters({ housing_growth: 1, transport_flex: 1 });
			expect(result).not.toBeNull();
			expect(result!.id).toBe('high');
		});

		test('finds a scenario with partial parameter match', () => {
			const result = scenarioState.findScenarioByParameters({ housing_growth: 1 });
			// Should match 'high' or 'mixed' — first match wins
			expect(result).not.toBeNull();
			expect(['high', 'mixed']).toContain(result!.id);
		});

		test('returns null when no scenario matches', () => {
			const result = scenarioState.findScenarioByParameters({ housing_growth: 99 });
			expect(result).toBeNull();
		});

		test('returns null when scenarios have no parameters', () => {
			scenarioState.setScenarios([
				createMockScenario({ id: 'no-params', parameters: undefined }),
			]);

			const result = scenarioState.findScenarioByParameters({ housing_growth: 0 });
			expect(result).toBeNull();
		});

		test('returns null for empty scenarios list', () => {
			scenarioState.setScenarios([]);

			const result = scenarioState.findScenarioByParameters({ housing_growth: 0 });
			expect(result).toBeNull();
		});
	});

	describe('scenarioId getter', () => {
		test('returns scenario_id when available', () => {
			scenarioState.setScenario(createMockScenario({ id: 'my-id', scenario_id: 'my-scenario-id' }));
			expect(scenarioState.scenarioId).toBe('my-scenario-id');
		});

		test('falls back to id when scenario_id is undefined', () => {
			scenarioState.setScenario(createMockScenario({ id: 'fallback-id', scenario_id: undefined }));
			expect(scenarioState.scenarioId).toBe('fallback-id');
		});

		test('returns "default" when currentScenario is null', () => {
			expect(scenarioState.scenarioId).toBe('default');
		});

		test('returns "default" when both scenario_id and id are falsy', () => {
			scenarioState.setScenario(createMockScenario({ id: '', scenario_id: '' }));
			expect(scenarioState.scenarioId).toBe('default');
		});
	});

	describe('scenarioName getter', () => {
		test('returns scenario name when available', () => {
			scenarioState.setScenario(createMockScenario({ name: 'My Custom Scenario' }));
			expect(scenarioState.scenarioName).toBe('My Custom Scenario');
		});

		test('returns "Default Scenario" when currentScenario is null', () => {
			expect(scenarioState.scenarioName).toBe('Default Scenario');
		});

		test('returns "Default Scenario" when name is undefined', () => {
			scenarioState.setScenario(createMockScenario({ name: undefined }));
			expect(scenarioState.scenarioName).toBe('Default Scenario');
		});

		test('returns "Default Scenario" when name is empty string', () => {
			scenarioState.setScenario(createMockScenario({ name: '' }));
			expect(scenarioState.scenarioName).toBe('Default Scenario');
		});
	});
});
