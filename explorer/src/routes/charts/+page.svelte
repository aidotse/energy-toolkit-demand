<script lang="ts">
	import AreaChart from '$lib/components/AreaChart.svelte';
	import TimeLine from '$lib/components/TimeLine.svelte';
	import SegmentBars from '$lib/components/SegmentBars.svelte';
	import Histogram from '$lib/components/Histogram.svelte';
	import GeoBarChart from '$lib/components/GeoBarChart.svelte';
	import Map from '$lib/components/map/Map.svelte';
	import ChartParameterPill from '$lib/components/controls/ChartParameterPill.svelte';
	import ParameterPanel from '$lib/components/controls/ParameterPanel.svelte';
	import LazyChart from '$lib/components/shared/LazyChart.svelte';
	import SplitPageContainer from '$lib/components/layout/SplitPageContainer.svelte';
	import ContentCard from '$lib/components/layout/ContentCard.svelte';
	import { chartParametersStore } from '$lib/stores/chartParameters.svelte';
	import { scenarioState } from '$lib/stores/scenario.svelte';
	import { parameterStore } from '$lib/stores/parameterStore.svelte';
	import { getStrategy2Config } from '$lib/dataService';
	import { BarChart3, Settings, Layers, MapPin, Calendar, Grid3X3 } from 'lucide-svelte';
	import type { PageProps } from './$types';
	import type { ChartParameters, AvailableParameters } from '$lib/types/controls';

	let { data }: PageProps = $props();
	const { parameters, scenarios, geographies, geojson, globals, geoData } = data;

	// Initialize parameterStore with Strategy 2 config
	$effect(() => {
		const strategy2Config = getStrategy2Config(parameters);
		parameterStore.initialize(strategy2Config);
	});

	// Global parameters (defaults for all charts)
	let globalParameters = $state<ChartParameters>({
		geography: data.geography,
		year: data.year,
		segment: data.segment,
		resolution: '1h',
		aggregation: 'sum'
	});

	// Get default scenario if scenarioState is not initialized
	const scenario = $derived(
		scenarioState.currentScenario ||
		(scenarios && scenarios.length > 0
			? scenarios.find((s: any) => s.is_default) || scenarios[0]
			: null)
	);

	// Available parameters for selectors
	const availableParameters: AvailableParameters = $derived({
		geographies: ['total', ...(parameters?.geographies || [])],
		years: parameters?.years || [2025, 2030, 2035, 2040, 2045, 2050],
		segments: ['total', 'housing', 'transport', 'industry'],
		resolutions: ['1h', '1d', '1w', '1M', '1Y'],
		aggregations: ['sum', 'mean', 'max']
	});

	// Chart IDs
	const CHART_IDS = {
		AREA_CHART: 'area-chart',
		TIMELINE: 'timeline',
		HISTOGRAM: 'histogram',
		SEGMENT_ARC: 'segment-arc',
		GEO_BAR: 'geo-bar',
		MAP: 'map'
	};

	// Get effective parameters for each chart (global + overrides)
	function getEffectiveParams(chartId: string): ChartParameters {
		const overrides = chartParametersStore.getParameters(chartId);
		return { ...globalParameters, ...overrides };
	}

	// Handle chart parameter changes
	function handleChartParameterChange(chartId: string, overrides: ChartParameters) {
		// No-op: reactivity is handled by the store
	}
</script>

<SplitPageContainer>
	{#snippet children()}
		<!-- Hero Section -->
		<div class="bg-gradient-to-br from-primary-600 to-primary-800 dark:from-primary-800 dark:to-primary-950 text-white rounded shadow-sm p-6 sm:p-8 mb-6">
			<h1 class="text-4xl md:text-5xl font-bold mb-4">
				Chart Library
			</h1>
			<p class="text-xl md:text-2xl text-primary-100 dark:text-primary-200">
				Explore all available visualizations
			</p>
		</div>

		<!-- Chart Grid -->
		<div class="space-y-6">
			<!-- Map Section -->
			<div class="@container">
				<div class="bg-white dark:bg-gray-800 rounded shadow-sm overflow-hidden">
					<div class="h-[400px]">
						<Map
							geojsonData={geojson}
							yearData={geoData}
							year={getEffectiveParams(CHART_IDS.MAP).year}
							geography={getEffectiveParams(CHART_IDS.MAP).geography}
							scenario={scenario}
							lower_bound={(globals as any)?.bounds?.map_yearly_geography?.lower_bound || (globals as any)?.lower_bound || 0}
							upper_bound={(globals as any)?.bounds?.map_yearly_geography?.upper_bound || (globals as any)?.upper_bound || 1000000}
							parameterData={parameters}
						/>
					</div>
				</div>
			</div>

			<!-- Featured Chart: Yearly Time Series -->
			<div class="@container">
				<LazyChart height="400px">
					<AreaChart
						geography={getEffectiveParams(CHART_IDS.AREA_CHART).geography}
						year={getEffectiveParams(CHART_IDS.AREA_CHART).year}
						aggregation={getEffectiveParams(CHART_IDS.AREA_CHART).aggregation}
						scenarios={scenarioState.comparisonScenarios}
						comparisonMode={scenarioState.comparisonMode}
						class="w-full"
					>
						{#snippet headerControls()}
							<ChartParameterPill
								chartId={CHART_IDS.AREA_CHART}
								globalParameters={globalParameters}
								availableParameters={availableParameters}
								geographiesMetadata={geographies}
								supportedParameters={['year', 'aggregation']}
								onChange={(params) => handleChartParameterChange(CHART_IDS.AREA_CHART, params)}
							/>
						{/snippet}
					</AreaChart>
				</LazyChart>
			</div>

			<!-- Time Series Charts -->
			<div class="grid grid-cols-1 gap-6">
				<div class="@container">
					<LazyChart height="350px">
						<TimeLine
							geography={getEffectiveParams(CHART_IDS.TIMELINE).geography}
							year={getEffectiveParams(CHART_IDS.TIMELINE).year}
							segment={getEffectiveParams(CHART_IDS.TIMELINE).segment}
							resolution={getEffectiveParams(CHART_IDS.TIMELINE).resolution || '1d'}
							aggregation={getEffectiveParams(CHART_IDS.TIMELINE).aggregation}
							scenarios={scenarioState.comparisonScenarios}
							comparisonMode={scenarioState.comparisonMode}
							class="w-full"
						>
							{#snippet headerControls()}
								<ChartParameterPill
									chartId={CHART_IDS.TIMELINE}
									globalParameters={globalParameters}
									availableParameters={availableParameters}
									geographiesMetadata={geographies}
									supportedParameters={['year', 'segment', 'resolution', 'aggregation']}
									onChange={(params) => handleChartParameterChange(CHART_IDS.TIMELINE, params)}
								/>
							{/snippet}
						</TimeLine>
					</LazyChart>
				</div>

				<div class="@container">
					<LazyChart height="350px">
						<Histogram
							geography={getEffectiveParams(CHART_IDS.HISTOGRAM).geography}
							year={getEffectiveParams(CHART_IDS.HISTOGRAM).year}
							segment={getEffectiveParams(CHART_IDS.HISTOGRAM).segment}
							resolution="1h"
							aggregation={getEffectiveParams(CHART_IDS.HISTOGRAM).aggregation || 'mean'}
							scenarios={scenarioState.comparisonScenarios}
							comparisonMode={scenarioState.comparisonMode}
							class="w-full"
						>
							{#snippet headerControls()}
								<ChartParameterPill
									chartId={CHART_IDS.HISTOGRAM}
									globalParameters={globalParameters}
									availableParameters={availableParameters}
									geographiesMetadata={geographies}
									supportedParameters={['year', 'segment', 'aggregation']}
									onChange={(params) => handleChartParameterChange(CHART_IDS.HISTOGRAM, params)}
								/>
							{/snippet}
						</Histogram>
					</LazyChart>
				</div>
			</div>

			<!-- Analysis Charts -->
			<div class="grid grid-cols-1 gap-6">
				<div class="@container">
					<LazyChart height="350px">
						<SegmentBars
							geography={getEffectiveParams(CHART_IDS.SEGMENT_ARC).geography}
							year={getEffectiveParams(CHART_IDS.SEGMENT_ARC).year}
							scenarios={scenarioState.comparisonScenarios}
							comparisonMode={scenarioState.comparisonMode}
							class="w-full"
						>
							{#snippet headerControls()}
								<ChartParameterPill
									chartId={CHART_IDS.SEGMENT_ARC}
									globalParameters={globalParameters}
									availableParameters={availableParameters}
									geographiesMetadata={geographies}
									supportedParameters={['year']}
									onChange={(params) => handleChartParameterChange(CHART_IDS.SEGMENT_ARC, params)}
								/>
							{/snippet}
						</SegmentBars>
					</LazyChart>
				</div>

				<div class="@container">
					<LazyChart height="350px">
						<GeoBarChart
							year={getEffectiveParams(CHART_IDS.GEO_BAR).year}
							parameterData={{ geographies }}
							scenarios={scenarioState.comparisonScenarios}
							comparisonMode={scenarioState.comparisonMode}
							class="w-full"
						>
							{#snippet headerControls()}
								<ChartParameterPill
									chartId={CHART_IDS.GEO_BAR}
									globalParameters={globalParameters}
									availableParameters={availableParameters}
									geographiesMetadata={geographies}
									supportedParameters={['year']}
									onChange={(params) => handleChartParameterChange(CHART_IDS.GEO_BAR, params)}
								/>
							{/snippet}
						</GeoBarChart>
					</LazyChart>
				</div>
			</div>

			<!-- Attribution Footer -->
			<ContentCard title="Attribution" class="mt-6">
				{#snippet children()}
					<p class="text-sm text-gray-600 dark:text-gray-400">
						All visualizations generated by Energy Toolkit: Demand. Data sources and methodology
						are documented in the project repository. When using these charts in presentations or
						publications, please cite the source appropriately.
					</p>
				{/snippet}
			</ContentCard>
		</div>
	{/snippet}

	{#snippet rightPanel()}
		<!-- Controls and Info Panel -->
		<div class="h-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 p-6 overflow-y-auto">
			<div class="max-w-xs space-y-6">
				<!-- Strategy 2 Parameter Panel -->
				<div class="bg-white dark:bg-gray-800 rounded shadow-sm p-4">
					<ParameterPanel />
				</div>

				<!-- Available Charts -->
				<div class="bg-white dark:bg-gray-800 rounded shadow-sm p-4">
					<h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
						<BarChart3 class="w-4 h-4" />
						Tillgängliga grafer
					</h3>
					<ul class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
						<li class="flex items-center gap-2">
							<MapPin class="w-3 h-3 text-primary-600" />
							Geografisk karta
						</li>
						<li class="flex items-center gap-2">
							<BarChart3 class="w-3 h-3 text-primary-600" />
							Årlig utveckling (area)
						</li>
						<li class="flex items-center gap-2">
							<BarChart3 class="w-3 h-3 text-primary-600" />
							Tidsserie (linje)
						</li>
						<li class="flex items-center gap-2">
							<Grid3X3 class="w-3 h-3 text-primary-600" />
							Histogram
						</li>
						<li class="flex items-center gap-2">
							<BarChart3 class="w-3 h-3 text-primary-600" />
							Sektorsfördelning
						</li>
						<li class="flex items-center gap-2">
							<BarChart3 class="w-3 h-3 text-primary-600" />
							Regional jämförelse
						</li>
					</ul>
				</div>

				<!-- How to Use -->
				<div class="bg-white dark:bg-gray-800 rounded shadow-sm p-4">
					<h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
						<Settings class="w-4 h-4" />
						Så här använder du
					</h3>
					<div class="space-y-3 text-sm text-gray-600 dark:text-gray-400">
						<p>
							<strong class="text-gray-900 dark:text-gray-100">Anpassa grafer:</strong> Klicka på kugghjulet på varje graf för att ändra parametrar.
						</p>
						<p>
							<strong class="text-gray-900 dark:text-gray-100">Jämför scenarier:</strong> Välj flera scenarier i toppmenyn för att se dem i samma graf.
						</p>
						<p>
							<strong class="text-gray-900 dark:text-gray-100">Interagera:</strong> Hovra över datapunkter för detaljer.
						</p>
					</div>
				</div>

				<!-- Parameters Info -->
				<div class="bg-white dark:bg-gray-800 rounded shadow-sm p-4">
					<h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
						<Calendar class="w-4 h-4" />
						Parametrar
					</h3>
					<div class="space-y-2 text-sm">
						<div class="flex justify-between">
							<span class="text-gray-600 dark:text-gray-400">År</span>
							<span class="font-medium text-gray-900 dark:text-gray-100">{globalParameters.year}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-gray-600 dark:text-gray-400">Geografi</span>
							<span class="font-medium text-gray-900 dark:text-gray-100">{globalParameters.geography === 'total' ? 'Sverige' : globalParameters.geography}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-gray-600 dark:text-gray-400">Segment</span>
							<span class="font-medium text-gray-900 dark:text-gray-100">{globalParameters.segment === 'total' ? 'Alla' : globalParameters.segment}</span>
						</div>
					</div>
				</div>

				<!-- Scenario Comparison Info -->
				<div class="bg-white dark:bg-gray-800 rounded shadow-sm p-4">
					<h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
						<Layers class="w-4 h-4" />
						Scenariojämförelse
					</h3>
					<p class="text-sm text-gray-600 dark:text-gray-400">
						{#if scenarioState.comparisonMode}
							<span class="text-green-600 dark:text-green-400 font-medium">Aktiv</span> - {scenarioState.comparisonScenarios?.length || 0} scenarier valda
						{:else}
							<span class="text-gray-500">Inaktiv</span> - Välj scenarier i toppmenyn
						{/if}
					</p>
				</div>
			</div>
		</div>
	{/snippet}
</SplitPageContainer>
