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
	import { viewStore } from '$lib/stores/viewStore.svelte';
	import { loadLocalizedContent } from '$lib/contentLoader';
	import type { ContentFile } from '$lib/contentLoader';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let year = $state(data.year);
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

	// Load markdown content
	let content = $state<ContentFile | null>(null);
	$effect(() => {
		loadLocalizedContent('pages/home').then((r) => (content = r));
	});

	// Mobile panel toggle
	let showMap = $state(false);

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
	<title>Sveriges framtida elbehov — Behovskartan</title>
	<meta name="description" content="Utforska scenarier för Sveriges framtida elanvändning uppdelat på regioner, sektorer och tid." />
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
				<div class="flex justify-end mb-4">
					<div class="flex flex-col items-start gap-1">
						<p class="text-xs text-gray-900">Utvecklat med stöd av</p>
						<a href="https://www.energimyndigheten.se/" target="_blank" rel="noopener noreferrer" class="transition-opacity hover:opacity-80">
							<img
								src="/SV Primär Energimyndigheten logo EM-SVART png (RGB).png"
								alt="Energimyndigheten"
								class="h-6 w-auto"
							/>
						</a>
					</div>
				</div>
				{#if content}
					<h1 class="text-2xl font-bold text-gray-900 mt-4 mb-3">
						{content.metadata.title}
					</h1>
					<p class="text-sm text-gray-600">
						{content.metadata.description}
					</p>
				{/if}
			</div>

			{#if content}
				{@const ContentComponent = content.default}
				<ContentComponent />
			{/if}
		</div>
	</div>

	<!-- Map panel -->
	<div
		class="absolute inset-0 transition-transform duration-300 ease-out {showMap ? 'translate-x-0' : 'translate-x-full'}"
	>
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

<!-- Desktop: original layout (unchanged) -->
<div class="hidden lg:block relative min-h-screen bg-page-bg">
	<!-- Map: fixed right-half background -->
	<div class="fixed top-14 right-0 bottom-0 w-2/3 z-0">
		<Map
			fadeLeft={true}
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
			controlsPosition="right"
		/>
	</div>

	<!-- Card: scrollable overlay, positioned left -->
	<main class="relative z-10 pointer-events-none">
		<div class="max-w-5xl lg:w-3/5 ml-0 lg:ml-[6%] p-4 sm:p-6 lg:py-8 pointer-events-auto">
			<div class="bg-white/95 backdrop-blur-sm rounded-3xl shadow-lg px-8 py-6 sm:px-14 sm:py-8 xl:px-20">
			<!-- Title Section -->
			<div class="mb-12">
				<!-- Partner logos - right-aligned, at top -->
				<div class="flex justify-end mb-6">
					<div class="flex flex-col items-start gap-2">
						<p class="text-sm text-gray-900">
							Utvecklat med stöd av
						</p>
						<a href="https://www.energimyndigheten.se/" target="_blank" rel="noopener noreferrer" class="transition-opacity hover:opacity-80">
							<img
								src="/SV Primär Energimyndigheten logo EM-SVART png (RGB).png"
								alt="Energimyndigheten"
								class="h-8 w-auto"
							/>
						</a>
					</div>
				</div>
				{#if content}
					<h1 class="text-3xl font-bold text-gray-900 mt-10 mb-6">
						{content.metadata.title}
					</h1>
					<p class="text-base text-gray-600">
						{content.metadata.description}
					</p>
				{/if}
			</div>

			<!-- Content from home.md (metrics, charts, text, InsightBox) -->
			{#if content}
				{@const ContentComponent = content.default}
				<ContentComponent />
			{/if}

			</div>
		</div>
	</main>
</div>
