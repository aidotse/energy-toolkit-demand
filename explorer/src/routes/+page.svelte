<script lang="ts">
	/**
	 * Home Page - Map Background Layout with Content Card
	 *
	 * Thin shell: initializes viewStore, renders Map and loads
	 * markdown content (home.md) which contains all text and chart directives.
	 */
	import Map from '$lib/components/map/Map.svelte';
	import { viewStore } from '$lib/stores/viewStore.svelte';
	import { loadLocalizedContent } from '$lib/contentLoader';
	import type { ContentFile } from '$lib/contentLoader';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let year = $state(data.year);
	let geography = $state(data.geography);

	// Sync to viewStore for chart components in markdown content
	$effect(() => { viewStore.year = year; });
	$effect(() => { viewStore.geography = geography; });
	$effect(() => { viewStore.pageData = data; });

	// Load markdown content
	let content = $state<ContentFile | null>(null);
	$effect(() => {
		loadLocalizedContent('pages/home').then((r) => (content = r));
	});
</script>

<div class="relative min-h-screen dark:bg-gray-900" style="background-color: #ededed;">
	<!-- Map: fixed right-half background (hidden on mobile) -->
	<div class="hidden lg:block fixed top-14 right-0 bottom-0 w-2/3 z-0">
		<Map
			fadeLeft={true}
			geojsonData={data.geojson}
			year={year}
			onYearChange={(newYear: number) => year = newYear}
			bind:geography
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
			<div class="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-3xl shadow-lg px-8 py-6 sm:px-14 sm:py-8 xl:px-20">
			<!-- Title Section -->
			<div class="mb-12">
				<!-- Partner logos - right-aligned, at top -->
				<div class="flex justify-end mb-6">
					<div class="flex flex-col items-start gap-2">
						<p class="text-sm text-gray-900 dark:text-gray-100">
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
					<h1 class="text-3xl font-bold text-gray-900 dark:text-gray-50 mt-10 mb-6">
						{content.metadata.title}
					</h1>
					<p class="text-base text-gray-600 dark:text-gray-400">
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
