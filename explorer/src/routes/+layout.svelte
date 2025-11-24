<script lang="ts">
	import "../app.css";
	import { i18n } from '$lib/i18n';
	import { ParaglideJS } from '@inlang/paraglide-sveltekit';
	import { settings } from 'svelte-ux';
	import TopNavigationBar from '$lib/components/navigation/TopNavigationBar.svelte';
	import { scenarioState } from '$lib/stores/scenario.svelte';
	import type { LayoutData } from './$types';

	let { children, data }: { children: any; data: LayoutData } = $props();

	const { scenarios, parameters, defaultScenario } = data;

	// Initialize scenario store
	scenarioState.setScenarios(scenarios);
	scenarioState.setScenario(defaultScenario);

	const currentScenario = $derived(scenarioState.scenarioName);

	// Initialize svelte-ux settings with theme support
	// This sets up the theme store that ThemeSwitch uses
	// and automatically handles Tailwind dark mode class
	settings({
		themes: {
			light: ['light'],
			dark: ['dark']
		}
	});
</script>

<ParaglideJS {i18n}>
	<!-- Navigation with unified split layout -->
	<TopNavigationBar
		{currentScenario}
		{scenarios}
		baseScenarios={[]}
		{parameters}
	/>

	<!-- Main Content Area -->
	<div class="pt-14">
		{@render children()}
	</div>
</ParaglideJS>