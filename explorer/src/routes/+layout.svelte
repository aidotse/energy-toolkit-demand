<script lang="ts">
	import "../app.css";
	import { i18n } from '$lib/i18n';
	import { ParaglideJS } from '@inlang/paraglide-sveltekit';
	import { settings } from 'svelte-ux';
	import { untrack } from 'svelte';
	import TopNavigationBar from '$lib/components/navigation/TopNavigationBar.svelte';
	import { scenarioState } from '$lib/stores/scenario.svelte';
	import { parameterStore } from '$lib/stores/parameterStore.svelte';
	import { getStrategy2Config } from '$lib/dataService';
	import type { LayoutData } from './$types';

	let { children, data }: { children: any; data: LayoutData } = $props();

	const { scenarios, parameters, defaultScenario } = data;

	// Initialize scenario store
	scenarioState.setScenarios(scenarios);
	scenarioState.setScenario(defaultScenario);

	// Initialize parameter store with Strategy 2 config
	const strategy2Config = getStrategy2Config(parameters);
	parameterStore.initialize(strategy2Config);

	// Sync parameterStore.baseScenario to scenarioState.currentScenario
	// This ensures chart components react to base scenario changes
	$effect(() => {
		const baseScenarioId = parameterStore.baseScenario;
		if (baseScenarioId && scenarios.length > 0) {
			// Find the matching scenario object
			const matchingScenario = scenarios.find(
				s => s.id === baseScenarioId || s.scenario_id === baseScenarioId
			);
			// Use untrack to avoid creating dependency on scenarioState
			untrack(() => {
				const currentId = scenarioState.currentScenario?.id || scenarioState.currentScenario?.scenario_id;
				if (matchingScenario && currentId !== baseScenarioId) {
					scenarioState.setScenario(matchingScenario);
				}
			});
		}
	});

	// Initialize svelte-ux settings with theme support
	settings({
		themes: {
			light: ['light'],
			dark: ['dark']
		}
	});
</script>

<ParaglideJS {i18n}>
	<!-- Navigation -->
	<TopNavigationBar />

	<!-- Main Content Area -->
	<div class="pt-14">
		{@render children()}
	</div>
</ParaglideJS>