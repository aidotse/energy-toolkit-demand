<script lang="ts">
	import "../app.css";
	import { i18n } from '$lib/i18n';
	import { ParaglideJS } from '@inlang/paraglide-sveltekit';
	import TopNavigationBar from '$lib/components/navigation/TopNavigationBar.svelte';
	import ScenarioPanel from '$lib/components/navigation/ScenarioPanel.svelte';
	import { navigationState } from '$lib/stores/navigation.svelte';

	let { children } = $props();
</script>

<ParaglideJS {i18n}>
	<!-- New Navigation Structure -->
	<TopNavigationBar />
	<ScenarioPanel />

	<!-- Main Content Area -->
	<div
		class="transition-all duration-300 {navigationState.panelExpanded ? 'pt-22' : 'pt-22'}"
	>
		{@render children()}
	</div>
</ParaglideJS>