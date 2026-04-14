<script lang="ts">
	/**
	 * PersistentDesktopMap - desktop-only Map wrapper that stays mounted across
	 * route changes.
	 *
	 * Why: the mapbox-gl Map takes several seconds to (re)build its WebGL state
	 * every time it mounts. Before this component existed, <Map> lived inside
	 * the home page (+page.svelte), so navigating /charts → / tore down the
	 * WebGL context and rebuilt it from scratch (~6s even with everything in
	 * HTTP cache). This component is mounted once at layout level and kept
	 * alive for the whole session; we just hide it with CSS when the user is
	 * on a non-home route.
	 *
	 * Data flow: the home page's +page.ts loader still fetches config/globals/
	 * geojson/geoData on every visit. +page.svelte writes the result into
	 * viewStore.pageData via an $effect. This component reads from viewStore
	 * reactively, so the map updates without remounting.
	 *
	 * Scope: desktop only. Mobile's two-panel slide-out toggle lives entirely
	 * inside +page.svelte and uses a separate <Map> instance there. Mobile map
	 * still tears down on nav-away — that's a known trade-off.
	 */
	import { page } from '$app/stores';
	import Map from './Map.svelte';
	import { viewStore } from '$lib/stores/viewStore.svelte';
	import { scenarioState } from '$lib/stores/scenario.svelte';

	// Pull page-loader data from the shared store. Null until the user has
	// visited `/` at least once this session.
	const pageData = $derived(viewStore.pageData as any);
	const hasData = $derived(pageData !== null && pageData.geojson !== undefined);

	// Show on / only. The outer div stays mounted so the map's WebGL context
	// survives navigation; only its visibility toggles.
	const isHome = $derived($page.route.id === '/');

	// Mirror viewStore values into local $state so Map can bind two-way.
	// Initial values come from viewStore's defaults; subsequent changes inside
	// Map propagate back to viewStore via the effects below. This is the same
	// pattern +page.svelte previously used.
	// svelte-ignore state_referenced_locally
	let year = $state(viewStore.year);
	// svelte-ignore state_referenced_locally
	let geography = $state(viewStore.geography);
	// svelte-ignore state_referenced_locally
	let segments = $state<string[]>([...viewStore.segment]);

	$effect(() => {
		viewStore.year = year;
	});
	$effect(() => {
		viewStore.geography = geography;
	});
	$effect(() => {
		viewStore.segment = segments;
	});
</script>

<!--
  Fixed positioning + `hidden lg:block` means this slot is only visible at lg+
  viewports. `!hidden` overrides `lg:block` on non-home routes so the map is
  CSS-hidden (still mounted) when the user is on /charts, /reports, etc.
-->
<div
	class="fixed top-14 right-0 bottom-0 w-2/3 z-0 hidden lg:block"
	class:!hidden={!isHome}
	aria-hidden={!isHome}
>
	{#if hasData}
		<Map
			class="h-full"
			fadeLeft={true}
			geojsonData={pageData.geojson}
			{year}
			onYearChange={(newYear: number) => (year = newYear)}
			bind:geography
			bind:segments
			yearData={pageData.geoData}
			parameterData={pageData.parameters}
			scenario={pageData.scenario ?? scenarioState.currentScenario}
			lower_bound={pageData.globals?.lower_bound || 0}
			upper_bound={pageData.globals?.upper_bound || 30000000}
			controlsPosition="right"
		/>
	{/if}
</div>
