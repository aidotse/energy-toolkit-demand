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
	import PageContainer from '$lib/components/layout/PageContainer.svelte';
	import ContentCard from '$lib/components/layout/ContentCard.svelte';
	import { chartParametersStore } from '$lib/stores/chartParameters.svelte';
	import { scenarioState } from '$lib/stores/scenario.svelte';
	import { parameterStore } from '$lib/stores/parameterStore.svelte';
	import { getStrategy2Config } from '$lib/dataService';
	import { ChevronDown, ChevronUp, Sliders } from 'lucide-svelte';
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

	// Collapsible parameter panel state
	let parameterPanelOpen = $state(false);
</script>

<PageContainer>
	<h1 class="text-3xl font-bold text-gray-900 dark:text-gray-50 mb-3">Chart Library</h1>
	<p class="text-base text-gray-600 dark:text-gray-400 mb-8">Explore all available visualizations</p>

	<!-- Collapsible Parameter Panel -->
	<ContentCard class="mb-6">
		{#snippet children()}
			<button
				onclick={() => parameterPanelOpen = !parameterPanelOpen}
				class="w-full flex items-center justify-between"
			>
				<span class="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
					<Sliders class="w-4 h-4" />
					Scenarioparametrar
					{#if parameterStore.hasActiveParameters}
						<span class="px-1.5 py-0.5 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded text-xs">
							{parameterStore.activeParameterCount} aktiva
						</span>
					{/if}
				</span>
				{#if parameterPanelOpen}
					<ChevronUp class="w-4 h-4 text-gray-400" />
				{:else}
					<ChevronDown class="w-4 h-4 text-gray-400" />
				{/if}
			</button>
			{#if parameterPanelOpen}
				<div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
					<ParameterPanel />
				</div>
			{/if}
		{/snippet}
	</ContentCard>

	<!-- Chart Grid -->
	<div class="space-y-6">
		<!-- Map Section -->
		<div class="@container">
			<div class="rounded overflow-hidden">
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
</PageContainer>
