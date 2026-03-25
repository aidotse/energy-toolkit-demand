<script lang="ts">
	import AreaChart from '$lib/components/AreaChart.svelte';
	import TimeLine from '$lib/components/TimeLine.svelte';
	import SegmentBars from '$lib/components/SegmentBars.svelte';
	import Histogram from '$lib/components/Histogram.svelte';
	import GeoBarChart from '$lib/components/GeoBarChart.svelte';
	import SectorPieChart from '$lib/components/SectorPieChart.svelte';
	import PeriodHeatmap from '$lib/components/PeriodHeatmap.svelte';
	import GeoSegmentChart from '$lib/components/GeoSegmentChart.svelte';
	import StackedSectorChart from '$lib/components/StackedSectorChart.svelte';
	import MonthlyWeekProfile from '$lib/components/MonthlyWeekProfile.svelte';
	import FlexImpactChart from '$lib/components/FlexImpactChart.svelte';
	import FlexPeakBars from '$lib/components/FlexPeakBars.svelte';
	import Map from '$lib/components/map/Map.svelte';
	import ChartFilterPanel from '$lib/components/controls/ChartFilterPanel.svelte';
	import LazyChart from '$lib/components/shared/LazyChart.svelte';
	import { chartParametersStore, chartsGlobalStore } from '$lib/stores/chartParameters.svelte';
	import { viewStore } from '$lib/stores/viewStore.svelte';
	import { scenarioState } from '$lib/stores/scenario.svelte';
	import { parameterStore } from '$lib/stores/parameterStore.svelte';
	import { getStrategy2Config } from '$lib/dataService';
	import { SlidersHorizontal, X, ArrowDownToLine } from 'lucide-svelte';
	import {
		buildScenarioSuffix,
		getGeoLabel,
		getSegmentSuffix,
		CHART_DESCRIPTIONS
	} from '$lib/utils/chartDescriptions';
	import { browser } from '$app/environment';
	import type { PageProps } from './$types';
	import type { ChartParameters, AvailableParameters } from '$lib/types/controls';

	let { data }: PageProps = $props();
	const { parameters, scenarios, geographies, geojson, globals, geoData } = data;

	// Initialize parameterStore with Strategy 2 config
	$effect(() => {
		const strategy2Config = getStrategy2Config(parameters);
		parameterStore.initialize(strategy2Config);
	});

	// Global parameters (defaults for all charts, persisted across navigation)
	let globalParameters = $state<ChartParameters>(
		chartsGlobalStore.initialized
			? chartsGlobalStore.params!
			: {
				geography: data.geography,
				year: data.year,
				segment: data.segment,
				resolution: '1h'
			}
	);

	// Sync global parameters back to store for persistence
	$effect(() => {
		chartsGlobalStore.params = { ...globalParameters };
	});

	// Import parameter selections from the frontpage (viewStore)
	// Sets per-chart overrides on all charts (same as "Tillämpa på alla")
	function importFromFrontpage() {
		const imported: ChartParameters = {
			year: viewStore.year,
			geography: viewStore.geography,
			segment: viewStore.activeSegment
		};
		for (const chartId of ALL_CHART_IDS) {
			chartParametersStore.clearChart(chartId);
			for (const [key, value] of Object.entries(imported)) {
				chartParametersStore.setParameter(chartId, key as keyof ChartParameters, value);
			}
		}
	}

	// Get default scenario if scenarioState is not initialized
	const scenario = $derived(
		scenarioState.currentScenario ||
		(scenarios && scenarios.length > 0
			? scenarios.find((s: any) => s.is_default) || scenarios[0]
			: null)
	);

	// Available parameters for selectors
	const availableParameters: AvailableParameters = $derived({
		geographies: ['total', ...((parameters as any)?.geographies || [])],
		years: (parameters as any)?.years || [2025, 2030, 2035, 2040, 2045, 2050],
		segments: ['total', 'housing', 'transport', 'industry', 'services', 'datacenters'],
		resolutions: ['1h', '1d', '1w', '1M', '1Y'],
		scenarios: scenarios?.map((s: any) => ({
			id: s.id || s.scenario_id,
			name: s.name,
			is_default: s.is_default
		})) || []
	});

	// Cast geographies for components that expect typed arrays
	const geographiesMeta = $derived((geographies || []) as Array<{ id: string; name: string; type?: string }>);

	// Chart IDs and titles
	const CHART_IDS = {
		AREA_CHART: 'area-chart',
		TIMELINE: 'timeline',
		HISTOGRAM: 'histogram',
		SEGMENT_ARC: 'segment-arc',
		SECTOR_PIE: 'sector-pie',
		PERIOD_HEATMAP: 'period-heatmap',
		GEO_BAR: 'geo-bar',
		GEO_SEGMENT: 'geo-segment',
		STACKED_SECTOR: 'stacked-sector',
		WEEKLY_PROFILE: 'weekly-profile',
		MAP: 'map',
		FLEX_IMPACT: 'flex-impact',
		FLEX_PEAK_BARS: 'flex-peak-bars'
	};

	const CHART_TITLES: Record<string, string> = {
		[CHART_IDS.AREA_CHART]: 'Årlig energiförbrukning',
		[CHART_IDS.TIMELINE]: 'Tidslinje',
		[CHART_IDS.HISTOGRAM]: 'Histogram över effektbehovet',
		[CHART_IDS.SEGMENT_ARC]: 'Energi per sektor',
		[CHART_IDS.SECTOR_PIE]: 'Sektoruppdelning',
		[CHART_IDS.PERIOD_HEATMAP]: 'Effektbehov per månad och tid på dygnet',
		[CHART_IDS.GEO_BAR]: 'Energiförbrukning per geografi',
		[CHART_IDS.GEO_SEGMENT]: 'Sektorernas andel per län',
		[CHART_IDS.STACKED_SECTOR]: 'Sektorer över tid',
		[CHART_IDS.WEEKLY_PROFILE]: 'Veckobelastning per månad',
		[CHART_IDS.MAP]: 'Karta',
		[CHART_IDS.FLEX_IMPACT]: 'Effekt av flexibilitet',
		[CHART_IDS.FLEX_PEAK_BARS]: 'Toppeffekt med flexibilitet'
	};

	const ALL_CHART_IDS = Object.values(CHART_IDS);

	// Single active filter (only one chart's filter open at a time)
	let activeFilterChart = $state<string | null>(null);

	function toggleFilter(chartId: string) {
		activeFilterChart = activeFilterChart === chartId ? null : chartId;
	}

	// Get effective parameters for each chart (global + overrides)
	function getEffectiveParams(chartId: string): ChartParameters {
		const overrides = chartParametersStore.getParameters(chartId);
		return { ...globalParameters, ...overrides };
	}

	// Derive segment string from segment (which may be string[])
	// Returns single segment, comma-separated list, or 'total'
	function getActiveSegment(chartId: string): string {
		const seg = getEffectiveParams(chartId).segment;
		if (Array.isArray(seg)) {
			if (seg.includes('total') || seg.length === 0) return 'total';
			if (seg.length === 1) return seg[0];
			return seg.join(',');
		}
		return seg || 'total';
	}

	// Generate dynamic description for a chart
	function getDescription(chartId: string): string {
		const params = getEffectiveParams(chartId);
		const geo = getGeoLabel(params.geography || 'total', geographiesMeta);
		const seg = getSegmentSuffix(getActiveSegment(chartId));
		const suffix = buildScenarioSuffix(
			params.scenarioId || parameterStore.baseScenario,
			parameterStore.baseScenarios,
			parameterStore.parameterValues,
			parameterStore.getParameter.bind(parameterStore)
		);
		return CHART_DESCRIPTIONS[chartId]?.(params.year || 2030, geo, seg, suffix) || '';
	}

	// Filter toggle button helpers
	function hasOverrides(chartId: string): boolean {
		return chartParametersStore.hasOverrides(chartId);
	}

	function overrideCount(chartId: string): number {
		return chartParametersStore.getOverrideCount(chartId);
	}

	// Apply current chart's overrides to all charts
	function handleApplyToAll() {
		if (!activeFilterChart) return;
		const overrides = chartParametersStore.getParameters(activeFilterChart);
		for (const chartId of ALL_CHART_IDS) {
			if (chartId === activeFilterChart) continue;
			chartParametersStore.clearChart(chartId);
			for (const [key, value] of Object.entries(overrides)) {
				chartParametersStore.setParameter(chartId, key as keyof ChartParameters, value);
			}
		}
	}

	// Mobile bottom sheet touch handling
	let sheetRef = $state<HTMLDivElement | undefined>();
	let startY = 0;
	let currentY = 0;
	let isDragging = false;

	function handleTouchStart(event: TouchEvent) {
		startY = event.touches[0].clientY;
		isDragging = true;
	}

	function handleTouchMove(event: TouchEvent) {
		if (!isDragging) return;
		currentY = event.touches[0].clientY;
		const deltaY = currentY - startY;
		if (deltaY > 0 && sheetRef) {
			sheetRef.style.transform = `translateY(${deltaY}px)`;
		}
	}

	function handleTouchEnd() {
		if (!isDragging) return;
		isDragging = false;
		const deltaY = currentY - startY;
		if (deltaY > 100) {
			activeFilterChart = null;
		}
		if (sheetRef) {
			sheetRef.style.transform = 'translateY(0)';
		}
	}

	// ESC to close filter
	$effect(() => {
		if (browser && activeFilterChart) {
			const handler = (e: KeyboardEvent) => {
				if (e.key === 'Escape') activeFilterChart = null;
			};
			document.addEventListener('keydown', handler);
			return () => document.removeEventListener('keydown', handler);
		}
	});

	// Filter button classes helper
	function filterBtnClass(chartId: string): string {
		if (activeFilterChart === chartId) {
			return 'bg-chart-700 text-white';
		}
		if (hasOverrides(chartId)) {
			return 'bg-chart-700/10 text-chart-900';
		}
		return 'bg-gray-100 text-gray-600 hover:bg-gray-200';
	}
</script>

<svelte:head>
	<title>Grafer — Behovskartan</title>
</svelte:head>

<!-- Custom layout — sidebar positioned outside the content card flow -->
<div class="min-h-screen bg-white lg:bg-page-bg overflow-x-clip">
	<div class="max-w-6xl mx-auto px-0 lg:px-8 pt-12 lg:py-12 relative">

		<!-- Page header card -->
		<div class="bg-white lg:rounded-xl lg:shadow-sm px-4 py-4 sm:p-8 mb-4 lg:mb-6">
			<h1 class="text-3xl font-bold text-gray-900 mb-2">Grafer</h1>
			<p class="text-base text-gray-600">Utforska prognosdata genom interaktiva diagram. Filtrera, jämför och exportera för användning i rapporter och presentationer.</p>
			<p class="lg:hidden text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-3">Den här sidan fungerar bäst på en större skärm.</p>
			{#if viewStore.initialized}
				<button
					onclick={importFromFrontpage}
					class="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-lg bg-chart-700/10 text-chart-900 hover:bg-chart-700/20 text-sm font-medium transition-colors"
				>
					<ArrowDownToLine class="w-4 h-4" />
					Importera val från startsidan ({viewStore.geographyName}, {viewStore.year})
				</button>
			{/if}
		</div>

				<!-- Dashboard Grid -->
				<div class="space-y-6">

					<!-- Row 1: AreaChart (3/5) + SegmentBars (2/5) -->
					<div class="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
						<div class="lg:col-span-3 bg-white rounded-xl shadow-sm p-6">
							<LazyChart height="350px">
								<AreaChart
									geography={getEffectiveParams(CHART_IDS.AREA_CHART).geography}
									year={getEffectiveParams(CHART_IDS.AREA_CHART).year}
									segment={getActiveSegment(CHART_IDS.AREA_CHART)}
									baseScenarioOverride={getEffectiveParams(CHART_IDS.AREA_CHART).scenarioId}
									parameterValuesOverride={getEffectiveParams(CHART_IDS.AREA_CHART).parameterValues}
									scenarios={scenarioState.comparisonScenarios}
									comparisonMode={scenarioState.comparisonMode}
									description={getDescription(CHART_IDS.AREA_CHART)}
									class="w-full"
								>
									{#snippet headerControls()}
										<button
											onclick={() => toggleFilter(CHART_IDS.AREA_CHART)}
											class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors {filterBtnClass(CHART_IDS.AREA_CHART)}"
										>
											<SlidersHorizontal class="w-3.5 h-3.5" />
											{#if hasOverrides(CHART_IDS.AREA_CHART)}
												<span>{overrideCount(CHART_IDS.AREA_CHART)}</span>
											{/if}
										</button>
									{/snippet}
								</AreaChart>
							</LazyChart>
						</div>
						<div class="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
							<LazyChart height="350px">
								<SegmentBars
									geography={getEffectiveParams(CHART_IDS.SEGMENT_ARC).geography}
									year={getEffectiveParams(CHART_IDS.SEGMENT_ARC).year}
									baseScenarioOverride={getEffectiveParams(CHART_IDS.SEGMENT_ARC).scenarioId}
									parameterValuesOverride={getEffectiveParams(CHART_IDS.SEGMENT_ARC).parameterValues}
									scenarios={scenarioState.comparisonScenarios}
									comparisonMode={scenarioState.comparisonMode}
									description={getDescription(CHART_IDS.SEGMENT_ARC)}
									class="w-full"
								>
									{#snippet headerControls()}
										<button
											onclick={() => toggleFilter(CHART_IDS.SEGMENT_ARC)}
											class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors {filterBtnClass(CHART_IDS.SEGMENT_ARC)}"
										>
											<SlidersHorizontal class="w-3.5 h-3.5" />
											{#if hasOverrides(CHART_IDS.SEGMENT_ARC)}
												<span>{overrideCount(CHART_IDS.SEGMENT_ARC)}</span>
											{/if}
										</button>
									{/snippet}
								</SegmentBars>
							</LazyChart>
						</div>
					</div>

					<!-- Row 1b: Stacked Sector Chart (full width) -->
					<div class="bg-white rounded-xl shadow-sm p-6">
					<LazyChart height="350px">
						<StackedSectorChart
							geography={getEffectiveParams(CHART_IDS.STACKED_SECTOR).geography}
							baseScenarioOverride={getEffectiveParams(CHART_IDS.STACKED_SECTOR).scenarioId}
							parameterValuesOverride={getEffectiveParams(CHART_IDS.STACKED_SECTOR).parameterValues}
							description={getDescription(CHART_IDS.STACKED_SECTOR)}
							class="w-full"
						>
							{#snippet headerControls()}
								<button
									onclick={() => toggleFilter(CHART_IDS.STACKED_SECTOR)}
									class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors {filterBtnClass(CHART_IDS.STACKED_SECTOR)}"
								>
									<SlidersHorizontal class="w-3.5 h-3.5" />
									{#if hasOverrides(CHART_IDS.STACKED_SECTOR)}
										<span>{overrideCount(CHART_IDS.STACKED_SECTOR)}</span>
									{/if}
								</button>
							{/snippet}
						</StackedSectorChart>
					</LazyChart>
					</div>

					<!-- Row 2: SectorPieChart (1/2) + PeriodHeatmap (1/2) -->
					<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
						<div class="bg-white rounded-xl shadow-sm p-6">
							<LazyChart height="500px">
								<SectorPieChart
									geography={getEffectiveParams(CHART_IDS.SECTOR_PIE).geography}
									year={getEffectiveParams(CHART_IDS.SECTOR_PIE).year}
									baseScenarioOverride={getEffectiveParams(CHART_IDS.SECTOR_PIE).scenarioId}
									parameterValuesOverride={getEffectiveParams(CHART_IDS.SECTOR_PIE).parameterValues}
									description={getDescription(CHART_IDS.SECTOR_PIE)}
									class="w-full"
								>
									{#snippet headerControls()}
										<button
											onclick={() => toggleFilter(CHART_IDS.SECTOR_PIE)}
											class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors {filterBtnClass(CHART_IDS.SECTOR_PIE)}"
										>
											<SlidersHorizontal class="w-3.5 h-3.5" />
											{#if hasOverrides(CHART_IDS.SECTOR_PIE)}
												<span>{overrideCount(CHART_IDS.SECTOR_PIE)}</span>
											{/if}
										</button>
									{/snippet}
								</SectorPieChart>
							</LazyChart>
						</div>
						<div class="bg-white rounded-xl shadow-sm p-6">
							<LazyChart height="500px">
								<PeriodHeatmap
									geography={getEffectiveParams(CHART_IDS.PERIOD_HEATMAP).geography}
									year={getEffectiveParams(CHART_IDS.PERIOD_HEATMAP).year}
									segment={getActiveSegment(CHART_IDS.PERIOD_HEATMAP)}
									baseScenarioOverride={getEffectiveParams(CHART_IDS.PERIOD_HEATMAP).scenarioId}
									parameterValuesOverride={getEffectiveParams(CHART_IDS.PERIOD_HEATMAP).parameterValues}
									description={getDescription(CHART_IDS.PERIOD_HEATMAP)}
									class="w-full"
								>
									{#snippet headerControls()}
										<button
											onclick={() => toggleFilter(CHART_IDS.PERIOD_HEATMAP)}
											class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors {filterBtnClass(CHART_IDS.PERIOD_HEATMAP)}"
										>
											<SlidersHorizontal class="w-3.5 h-3.5" />
											{#if hasOverrides(CHART_IDS.PERIOD_HEATMAP)}
												<span>{overrideCount(CHART_IDS.PERIOD_HEATMAP)}</span>
											{/if}
										</button>
									{/snippet}
								</PeriodHeatmap>
							</LazyChart>
						</div>
					</div>

					<!-- Row 2b: MonthlyWeekProfile (full width) -->
					<div class="bg-white rounded-xl shadow-sm p-6">
					<LazyChart height="400px">
						<MonthlyWeekProfile
							geography={getEffectiveParams(CHART_IDS.WEEKLY_PROFILE).geography}
							year={getEffectiveParams(CHART_IDS.WEEKLY_PROFILE).year}
							segment={getActiveSegment(CHART_IDS.WEEKLY_PROFILE)}
							baseScenarioOverride={getEffectiveParams(CHART_IDS.WEEKLY_PROFILE).scenarioId}
							parameterValuesOverride={getEffectiveParams(CHART_IDS.WEEKLY_PROFILE).parameterValues}
							description={getDescription(CHART_IDS.WEEKLY_PROFILE)}
							class="w-full"
						>
							{#snippet headerControls()}
								<button
									onclick={() => toggleFilter(CHART_IDS.WEEKLY_PROFILE)}
									class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors {filterBtnClass(CHART_IDS.WEEKLY_PROFILE)}"
								>
									<SlidersHorizontal class="w-3.5 h-3.5" />
									{#if hasOverrides(CHART_IDS.WEEKLY_PROFILE)}
										<span>{overrideCount(CHART_IDS.WEEKLY_PROFILE)}</span>
									{/if}
								</button>
							{/snippet}
						</MonthlyWeekProfile>
					</LazyChart>
					</div>

					<!-- Row 3: TimeLine (full width) -->
					<div class="bg-white rounded-xl shadow-sm p-6">
					<LazyChart height="350px">
						<TimeLine
							geography={getEffectiveParams(CHART_IDS.TIMELINE).geography}
							year={getEffectiveParams(CHART_IDS.TIMELINE).year}
							segments={getActiveSegment(CHART_IDS.TIMELINE).split(',')}
							resolution={(getEffectiveParams(CHART_IDS.TIMELINE).resolution || '1d') as '1h' | '1d' | '1w' | '1M' | '1Y'}
							baseScenarioOverride={getEffectiveParams(CHART_IDS.TIMELINE).scenarioId}
							parameterValuesOverride={getEffectiveParams(CHART_IDS.TIMELINE).parameterValues}
							scenarios={scenarioState.comparisonScenarios}
							comparisonMode={scenarioState.comparisonMode}
							description={getDescription(CHART_IDS.TIMELINE)}
							brushable={true}
							class="w-full"
						>
							{#snippet headerControls()}
								<button
									onclick={() => toggleFilter(CHART_IDS.TIMELINE)}
									class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors {filterBtnClass(CHART_IDS.TIMELINE)}"
								>
									<SlidersHorizontal class="w-3.5 h-3.5" />
									{#if hasOverrides(CHART_IDS.TIMELINE)}
										<span>{overrideCount(CHART_IDS.TIMELINE)}</span>
									{/if}
								</button>
							{/snippet}
						</TimeLine>
					</LazyChart>
					</div>

					<!-- Row 4: Histogram (full width) -->
					<div class="bg-white rounded-xl shadow-sm p-6">
					<LazyChart height="350px">
						<Histogram
							geography={getEffectiveParams(CHART_IDS.HISTOGRAM).geography}
							year={getEffectiveParams(CHART_IDS.HISTOGRAM).year}
							segment={getActiveSegment(CHART_IDS.HISTOGRAM)}
							resolution="1h"
							aggregation="mean"
							baseScenarioOverride={getEffectiveParams(CHART_IDS.HISTOGRAM).scenarioId}
							parameterValuesOverride={getEffectiveParams(CHART_IDS.HISTOGRAM).parameterValues}
							scenarios={scenarioState.comparisonScenarios}
							comparisonMode={scenarioState.comparisonMode}
							description={getDescription(CHART_IDS.HISTOGRAM)}
							class="w-full"
						>
							{#snippet headerControls()}
								<button
									onclick={() => toggleFilter(CHART_IDS.HISTOGRAM)}
									class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors {filterBtnClass(CHART_IDS.HISTOGRAM)}"
								>
									<SlidersHorizontal class="w-3.5 h-3.5" />
									{#if hasOverrides(CHART_IDS.HISTOGRAM)}
										<span>{overrideCount(CHART_IDS.HISTOGRAM)}</span>
									{/if}
								</button>
							{/snippet}
						</Histogram>
					</LazyChart>
					</div>

					<!-- Row 5: Map (half) -->
					<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
						<div class="bg-white rounded-xl shadow-sm p-6">
							<div class="rounded overflow-hidden">
								<div class="h-[500px]">
									<Map
										geojsonData={geojson}
										yearData={geoData}
										year={getEffectiveParams(CHART_IDS.MAP).year || 2030}
										geography={getEffectiveParams(CHART_IDS.MAP).geography}
										scenario={scenario}
										lower_bound={(globals as any)?.bounds?.map_yearly_geography?.lower_bound || (globals as any)?.lower_bound || 0}
										upper_bound={(globals as any)?.bounds?.map_yearly_geography?.upper_bound || (globals as any)?.upper_bound || 1000000}
										parameterData={parameters}
									/>
								</div>
							</div>
						</div>
					</div>

					<!-- Row 6: GeoBarChart (full width) -->
					<div class="bg-white rounded-xl shadow-sm p-6">
					<LazyChart height="350px">
								<GeoBarChart
									year={getEffectiveParams(CHART_IDS.GEO_BAR).year || 2030}
									segment={getActiveSegment(CHART_IDS.GEO_BAR)}
									parameterData={{ geographies }}
									baseScenarioOverride={getEffectiveParams(CHART_IDS.GEO_BAR).scenarioId}
									parameterValuesOverride={getEffectiveParams(CHART_IDS.GEO_BAR).parameterValues}
									scenarios={scenarioState.comparisonScenarios}
									comparisonMode={scenarioState.comparisonMode}
									description={getDescription(CHART_IDS.GEO_BAR)}
									class="w-full"
								>
									{#snippet headerControls()}
										<button
											onclick={() => toggleFilter(CHART_IDS.GEO_BAR)}
											class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors {filterBtnClass(CHART_IDS.GEO_BAR)}"
										>
											<SlidersHorizontal class="w-3.5 h-3.5" />
											{#if hasOverrides(CHART_IDS.GEO_BAR)}
												<span>{overrideCount(CHART_IDS.GEO_BAR)}</span>
											{/if}
										</button>
									{/snippet}
								</GeoBarChart>
					</LazyChart>
					</div>

					<!-- Row 7: GeoSegmentChart (full width) -->
					<div class="bg-white rounded-xl shadow-sm p-6">
					<LazyChart height="450px">
						<GeoSegmentChart
							year={getEffectiveParams(CHART_IDS.GEO_SEGMENT).year}
							segment={getActiveSegment(CHART_IDS.GEO_SEGMENT)}
							baseScenarioOverride={getEffectiveParams(CHART_IDS.GEO_SEGMENT).scenarioId}
							parameterValuesOverride={getEffectiveParams(CHART_IDS.GEO_SEGMENT).parameterValues}
							parameterData={{ geographies }}
							description={getDescription(CHART_IDS.GEO_SEGMENT)}
							class="w-full"
						>
							{#snippet headerControls()}
								<button
									onclick={() => toggleFilter(CHART_IDS.GEO_SEGMENT)}
									class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors {filterBtnClass(CHART_IDS.GEO_SEGMENT)}"
								>
									<SlidersHorizontal class="w-3.5 h-3.5" />
									{#if hasOverrides(CHART_IDS.GEO_SEGMENT)}
										<span>{overrideCount(CHART_IDS.GEO_SEGMENT)}</span>
									{/if}
								</button>
							{/snippet}
						</GeoSegmentChart>
					</LazyChart>
					</div>

					<!-- Row 8: Flex charts side by side -->
					<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
						<div class="bg-white rounded-xl shadow-sm p-6 pb-12">
							<LazyChart height="400px">
								<FlexImpactChart
									geography={getEffectiveParams(CHART_IDS.FLEX_IMPACT).geography}
									year={getEffectiveParams(CHART_IDS.FLEX_IMPACT).year}
									segment={getActiveSegment(CHART_IDS.FLEX_IMPACT)}
									baseScenarioOverride={getEffectiveParams(CHART_IDS.FLEX_IMPACT).scenarioId}
									parameterValuesOverride={getEffectiveParams(CHART_IDS.FLEX_IMPACT).parameterValues}
									description={getDescription(CHART_IDS.FLEX_IMPACT)}
									class="w-full"
								>
									{#snippet headerControls()}
										<button
											onclick={() => toggleFilter(CHART_IDS.FLEX_IMPACT)}
											class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors {filterBtnClass(CHART_IDS.FLEX_IMPACT)}"
										>
											<SlidersHorizontal class="w-3.5 h-3.5" />
											{#if hasOverrides(CHART_IDS.FLEX_IMPACT)}
												<span>{overrideCount(CHART_IDS.FLEX_IMPACT)}</span>
											{/if}
										</button>
									{/snippet}
								</FlexImpactChart>
							</LazyChart>
						</div>
						<div class="bg-white rounded-xl shadow-sm p-6 pb-12">
							<LazyChart height="400px">
								<FlexPeakBars
									geography={getEffectiveParams(CHART_IDS.FLEX_PEAK_BARS).geography}
									year={getEffectiveParams(CHART_IDS.FLEX_PEAK_BARS).year}
									segment={getActiveSegment(CHART_IDS.FLEX_PEAK_BARS)}
									baseScenarioOverride={getEffectiveParams(CHART_IDS.FLEX_PEAK_BARS).scenarioId}
									parameterValuesOverride={getEffectiveParams(CHART_IDS.FLEX_PEAK_BARS).parameterValues}
									description={getDescription(CHART_IDS.FLEX_PEAK_BARS)}
									class="w-full"
								>
									{#snippet headerControls()}
										<button
											onclick={() => toggleFilter(CHART_IDS.FLEX_PEAK_BARS)}
											class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors {filterBtnClass(CHART_IDS.FLEX_PEAK_BARS)}"
										>
											<SlidersHorizontal class="w-3.5 h-3.5" />
											{#if hasOverrides(CHART_IDS.FLEX_PEAK_BARS)}
												<span>{overrideCount(CHART_IDS.FLEX_PEAK_BARS)}</span>
											{/if}
										</button>
									{/snippet}
								</FlexPeakBars>
							</LazyChart>
						</div>
					</div>

				</div>

		<!-- Filter Sidebar (desktop) — fixed to viewport, aligned with content card top -->
		{#if activeFilterChart}
			<aside class="hidden lg:block fixed top-[6.5rem] right-6 2xl:right-auto 2xl:left-[calc(50%+37rem)] w-80 z-40 animate-slide-in">
				<div class="bg-white rounded-2xl shadow-lg p-6 max-h-[calc(100vh-8rem)] overflow-y-auto">
					<ChartFilterPanel
						chartId={activeFilterChart}
						chartTitle={CHART_TITLES[activeFilterChart] || 'Filter'}
						{globalParameters}
						{availableParameters}
						geographiesMetadata={geographiesMeta}
						allChartIds={ALL_CHART_IDS}
						onClose={() => activeFilterChart = null}
						onApplyToAll={handleApplyToAll}
					/>
				</div>
			</aside>
		{/if}

	</div>
</div>

<!-- Mobile Bottom Sheet -->
{#if activeFilterChart}
	<button
		onclick={() => activeFilterChart = null}
		class="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-50 cursor-default"
		aria-label="Stäng filter"
	></button>

	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		bind:this={sheetRef}
		ontouchstart={handleTouchStart}
		ontouchmove={handleTouchMove}
		ontouchend={handleTouchEnd}
		role="dialog"
		aria-label="Filter"
		tabindex="-1"
		class="lg:hidden fixed bottom-0 left-0 right-0 max-h-[85vh] bg-white rounded-t-3xl shadow-2xl z-50 overflow-hidden flex flex-col animate-slide-up"
	>
		<!-- Drag Handle -->
		<div class="flex items-center justify-center py-3 cursor-grab active:cursor-grabbing">
			<div class="w-12 h-1.5 bg-gray-300 rounded-full"></div>
		</div>

		<!-- Header -->
		<div class="flex items-center justify-between px-6 py-3 border-b border-gray-200">
			<div>
				<h3 class="text-lg font-semibold text-gray-900">Filter</h3>
				<p class="text-sm text-gray-500 mt-0.5">
					{CHART_TITLES[activeFilterChart] || ''}
				</p>
			</div>
			<button
				onclick={() => activeFilterChart = null}
				class="p-2 -mr-2 rounded-lg hover:bg-gray-100 transition-colors"
				aria-label="Stäng"
			>
				<X class="w-6 h-6" />
			</button>
		</div>

		<!-- Scrollable Content -->
		<div class="flex-1 overflow-y-auto px-6 py-4">
			<ChartFilterPanel
				chartId={activeFilterChart}
				chartTitle={CHART_TITLES[activeFilterChart] || 'Filter'}
				{globalParameters}
				{availableParameters}
				geographiesMetadata={geographiesMeta}
				allChartIds={ALL_CHART_IDS}
				onClose={() => activeFilterChart = null}
				onApplyToAll={handleApplyToAll}
			/>
		</div>
	</div>
{/if}

<style>
	@keyframes slide-in {
		from { transform: translateX(100%); opacity: 0; }
		to { transform: translateX(0); opacity: 1; }
	}
	.animate-slide-in {
		animation: slide-in 0.2s ease-out;
	}
	@keyframes slide-up {
		from { transform: translateY(100%); }
		to { transform: translateY(0); }
	}
	.animate-slide-up {
		animation: slide-up 0.3s ease-out;
	}
</style>
