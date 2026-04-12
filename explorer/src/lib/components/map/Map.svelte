<script lang="ts">
	import MapBox from './MapBox.svelte';
	import Legend from './Legend.svelte';
	import YearSelect from './YearSelect.svelte';
	import SegmentSelect from './SegmentSelect.svelte';
	import ScenarioSelectorPill from '$lib/components/navigation/ScenarioSelectorPill.svelte';
	import ScenarioVariation from '$lib/components/navigation/ScenarioVariation.svelte';

	let {
		geojsonData,
		yearData,
		year,
		onYearChange,
		geography = $bindable(),
		segments = $bindable(['total']),
		scenario,
		lower_bound,
		upper_bound,
		parameterData,
		controlsPosition = 'left',
		fadeLeft = false,
		class: className = 'h-full'
	}: {
		geojsonData: any;
		yearData: any;
		year: number;
		onYearChange?: (year: number) => void;
		geography?: string;
		segments?: string[];
		scenario: any;
		lower_bound: number;
		upper_bound: number;
		parameterData: any;
		controlsPosition?: 'left' | 'right';
		fadeLeft?: boolean;
		class?: string;
	} = $props();

	// Local year state for the slider - synced with parent via callback
	// svelte-ignore state_referenced_locally
	let localYear = $state(year);

	// Sync local year when parent year changes
	$effect(() => {
		localYear = year;
	});

	// Handle year changes from the slider
	function handleYearChange(newYear: number) {
		localYear = newYear;
		onYearChange?.(newYear);
	}
</script>

<div class="relative w-full {className}">
	{#if controlsPosition === 'right'}
		<div class="absolute z-10 top-20 lg:top-8 left-[50%] right-4 max-w-2xl flex flex-col gap-2 items-start">
			<!-- Unified controls toolbar -->
			<div class="w-full flex flex-row items-center bg-white/90 backdrop-blur-sm rounded-lg shadow-sm">
				<div class="flex-1 min-w-0 border-r border-gray-200">
					<ScenarioSelectorPill embedded />
				</div>
				<div class="flex-1 min-w-0 border-r border-gray-200">
					<YearSelect embedded {parameterData} year={localYear} onYearChange={handleYearChange} />
				</div>
				<div class="flex-1 min-w-0">
					<SegmentSelect embedded bind:segments />
				</div>
			</div>
			<ScenarioVariation />
		</div>
	{:else}
		<div class="absolute z-10 top-14 lg:top-10 left-4 lg:left-6 flex flex-col gap-2">
			<YearSelect {parameterData} year={localYear} onYearChange={handleYearChange} />
			<SegmentSelect bind:segments />
		</div>

		<div class="absolute top-4 lg:top-10 right-4 lg:right-6 z-10 max-lg:max-w-[60%]">
			<ScenarioSelectorPill />
		</div>
	{/if}

	<MapBox
		{geojsonData}
		year={localYear}
		bind:geography
		{yearData}
		{scenario}
		{lower_bound}
		{upper_bound}
		{segments}
		{fadeLeft}
	/>

	<div class="absolute z-10 bottom-6 right-6 legend-overlay">
		<Legend {lower_bound} {upper_bound} />
	</div>
</div>
