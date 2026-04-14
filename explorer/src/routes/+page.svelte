<script lang="ts">
	/**
	 * Home Page - Map Background Layout with Content Card
	 *
	 * Thin shell: initializes viewStore, renders Map and loads
	 * markdown content (home.md) which contains all text and chart directives.
	 *
	 * Mobile: two-panel layout (Content | Map) toggled via pull tabs.
	 * Desktop: fixed map background with overlaid content card.
	 */
	import Map from '$lib/components/map/Map.svelte';
	import { MapIcon, FileText } from 'lucide-svelte';
	import { fade } from 'svelte/transition';
	import { viewStore } from '$lib/stores/viewStore.svelte';
	import { loadLocalizedContentSync } from '$lib/contentLoader';
	import type { ContentFile } from '$lib/contentLoader';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// svelte-ignore state_referenced_locally
	let year = $state(data.year);
	// svelte-ignore state_referenced_locally
	let geography = $state(data.geography);
	let segments = $state<string[]>(['total']);

	// Restore from viewStore after initial render (allows MapBox to initialize with loader data)
	let restored = false;
	$effect(() => {
		if (!restored && viewStore.initialized) {
			restored = true;
			year = viewStore.year;
			geography = viewStore.geography;
			segments = [...viewStore.segment];
		}
	});

	// Sync to viewStore for chart components in markdown content
	$effect(() => { viewStore.year = year; });
	$effect(() => { viewStore.geography = geography; });
	$effect(() => { viewStore.segment = segments; });
	$effect(() => { viewStore.pageData = data; });

	// Load markdown content. Synchronous because contentLoader uses an eager
	// glob import — the modules are in memory at bundle time, so there's no
	// microtask gap where the skeleton would be visible.
	const content: ContentFile | null = loadLocalizedContentSync('pages/home');

	// Mobile panel toggle
	let showMap = $state(false);

	// Skip mounting the mobile <Map> on desktop viewports. Without this gate,
	// the mobile map (inside `lg:hidden`, so display:none on lg+) still goes
	// through full mapbox-gl init on every home-page mount — ~7 requests to
	// api.mapbox.com and seconds of JS parsing, even though nothing is ever
	// visible. The persistent desktop map already lives in +layout.svelte, so
	// we just need a flag that says "are we small enough to need the mobile
	// layout?" and only render <Map> there when true.
	let isMobileViewport = $state(false);
	$effect(() => {
		if (typeof window === 'undefined') return;
		const mql = window.matchMedia('(max-width: 1023px)');
		isMobileViewport = mql.matches;
		const onChange = (e: MediaQueryListEvent) => { isMobileViewport = e.matches; };
		mql.addEventListener('change', onChange);
		return () => mql.removeEventListener('change', onChange);
	});

	// Tab slide-out animation: tabs start hidden off-screen, then slide in
	let mapTabVisible = $state(false);
	let reportTabVisible = $state(false);

	// Slide out the map tab after page loads
	$effect(() => {
		if (content && !showMap) {
			const timer = setTimeout(() => { mapTabVisible = true; }, 800);
			return () => clearTimeout(timer);
		}
	});

	function switchToMap() {
		mapTabVisible = false;
		showMap = true;
		// Slide out report tab after panel transition completes
		setTimeout(() => { reportTabVisible = true; }, 400);
	}

	function switchToContent() {
		reportTabVisible = false;
		showMap = false;
		// Slide out map tab after panel transition completes
		setTimeout(() => { mapTabVisible = true; }, 400);
	}
</script>

<svelte:head>
	<title>Energy Toolkit — Demand</title>
	<meta name="description" content="Open framework for generating, serving, and visualizing energy demand forecasts." />
</svelte:head>

<!-- Mobile: two-panel layout with pull tabs -->
<div class="lg:hidden fixed top-0 left-0 right-0 bottom-0 overflow-hidden">
	<!-- Content panel -->
	<div
		class="absolute inset-0 transition-transform duration-300 ease-out overflow-y-auto {showMap ? '-translate-x-full' : 'translate-x-0'}"
	>
		<div class="bg-white px-4 py-4 sm:px-6 sm:py-6">
			<!-- Title Section -->
			<div class="mb-6">
				{#if content}
					<div in:fade={{ duration: 200 }}>
						<h1 class="text-2xl font-bold text-gray-900 mt-4 mb-3">
							{content.metadata.title}
						</h1>
						<p class="text-sm text-gray-600">
							{content.metadata.description}
						</p>
					</div>
				{:else}
					<div class="mt-4 mb-3 space-y-3 animate-pulse" aria-hidden="true">
						<div class="h-7 bg-gray-200 rounded w-5/6"></div>
						<div class="h-4 bg-gray-200 rounded w-full"></div>
						<div class="h-4 bg-gray-200 rounded w-4/5"></div>
					</div>
				{/if}
			</div>

			{#if content}
				{@const ContentComponent = content.default}
				<div in:fade={{ duration: 200 }}>
					<ContentComponent />
				</div>
			{:else}
				<div class="min-h-[60vh] space-y-6 animate-pulse" aria-hidden="true">
					<div class="h-3 bg-gray-200 rounded w-full"></div>
					<div class="h-3 bg-gray-200 rounded w-11/12"></div>
					<div class="h-3 bg-gray-200 rounded w-10/12"></div>
					<div class="h-48 bg-gray-100 rounded-lg mt-6"></div>
				</div>
			{/if}
		</div>
	</div>

	<!-- Map panel — only mount the <Map> instance on actual mobile viewports
	     so desktop users don't pay the mapbox-gl init cost for a hidden panel -->
	<div
		class="absolute inset-0 transition-transform duration-300 ease-out {showMap ? 'translate-x-0' : 'translate-x-full'}"
	>
		{#if isMobileViewport}
			<Map
				geojsonData={data.geojson}
				year={year}
				onYearChange={(newYear: number) => year = newYear}
				bind:geography
				bind:segments
				yearData={data.geoData}
				parameterData={data.parameters}
				scenario={data.scenario}
				lower_bound={data.globals?.lower_bound || 0}
				upper_bound={data.globals?.upper_bound || 30000000}
				controlsPosition="left"
			/>
		{/if}
	</div>

	<!-- Tab: show map (right edge, on content panel) -->
	{#if !showMap}
		<button
			class="fixed top-1/2 -translate-y-1/2 z-30 flex items-center justify-center
				w-8 h-16 shadow-lg
				rounded-l-full
				text-white
				transition-all duration-300 ease-out
				{mapTabVisible ? 'right-0' : '-right-8'}"
			style="background-color: #1690b8;"
			onclick={switchToMap}
			aria-label="Visa karta"
		>
			<MapIcon size={16} />
		</button>
	{/if}

	<!-- Tab: show report (left edge, center, on map panel) -->
	{#if showMap}
		<button
			class="fixed top-1/2 -translate-y-1/2 z-30 flex items-center justify-center
				w-8 h-16 shadow-lg
				rounded-r-full
				text-white
				transition-all duration-300 ease-out
				{reportTabVisible ? 'left-0' : '-left-8'}"
			style="background-color: #1690b8;"
			onclick={switchToContent}
			aria-label="Visa rapport"
		>
			<FileText size={16} />
		</button>
	{/if}
</div>

<!--
	Desktop layout. The map itself lives in +layout.svelte as
	<PersistentDesktopMap /> so it survives /charts ↔ / nav without rebuilding
	its WebGL context. This page owns only the content card that overlays it.
	The card still uses pointer-events-none so click-through to the map works.

	No bg-page-bg / relative on this wrapper: they would paint an opaque layer
	on top of the layout-level fixed map (both at effective z-index 0, DOM
	order puts the page div on top). Let the layout background show through;
	the card has its own white backdrop.
-->
<div class="hidden lg:block min-h-screen">
	<!-- Card: scrollable overlay, positioned left -->
	<main class="relative z-10 pointer-events-none">
		<div class="max-w-5xl lg:w-3/5 ml-0 lg:ml-[6%] p-4 sm:p-6 lg:py-8 pointer-events-auto">
			<div class="bg-white/95 backdrop-blur-sm rounded-3xl shadow-lg px-8 py-6 sm:px-14 sm:py-8 xl:px-20">
			<!-- Title Section -->
			<div class="mb-12">
				{#if content}
					<div in:fade={{ duration: 200 }}>
						<h1 class="text-3xl font-bold text-gray-900 mt-10 mb-6">
							{content.metadata.title}
						</h1>
						<p class="text-base text-gray-600">
							{content.metadata.description}
						</p>
					</div>
				{:else}
					<div class="mt-10 mb-6 space-y-4 animate-pulse" aria-hidden="true">
						<div class="h-10 bg-gray-200 rounded w-4/5"></div>
						<div class="h-5 bg-gray-200 rounded w-full"></div>
						<div class="h-5 bg-gray-200 rounded w-5/6"></div>
					</div>
				{/if}
			</div>

			<!-- Content from home.md (metrics, charts, text, InsightBox) -->
			{#if content}
				{@const ContentComponent = content.default}
				<div in:fade={{ duration: 200 }}>
					<ContentComponent />
				</div>
			{:else}
				<div class="min-h-[70vh] space-y-6 animate-pulse" aria-hidden="true">
					<!-- Metrics row placeholder -->
					<div class="grid grid-cols-3 gap-4">
						<div class="h-28 bg-gray-100 rounded-xl"></div>
						<div class="h-28 bg-gray-100 rounded-xl"></div>
						<div class="h-28 bg-gray-100 rounded-xl"></div>
					</div>
					<!-- Text block placeholder -->
					<div class="space-y-3">
						<div class="h-4 bg-gray-200 rounded w-full"></div>
						<div class="h-4 bg-gray-200 rounded w-11/12"></div>
						<div class="h-4 bg-gray-200 rounded w-10/12"></div>
					</div>
					<!-- Chart placeholder -->
					<div class="h-80 bg-gray-100 rounded-lg"></div>
				</div>
			{/if}

			</div>
		</div>
	</main>
</div>
