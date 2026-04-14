<script lang="ts">
	/**
	 * GeoSegmentChart Component - 100% Stacked Column Chart
	 *
	 * Shows electricity demand composition by segment for each county.
	 * Each bar represents 100% of a county's demand, with segments showing proportions.
	 * Counties are ordered by county code (geo_id).
	 *
	 * In comparison mode, switches to grouped bars showing total demand
	 * per county per scenario, with ScenarioLegend and hover/click controls.
	 *
	 * @component
	 */
	import { BarChart } from 'layerchart';
	import { makeDemandQuery, formatNumber } from '$lib/utilities';
	import { getEnergyPrefix } from '$lib/stores/units.svelte';
	import { fetchDemandData } from '$lib/dataService';
	import LoadingSkeleton from '$lib/components/shared/LoadingSkeleton.svelte';
	import ErrorState from '$lib/components/shared/ErrorState.svelte';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import ChartContainer from '$lib/components/shared/ChartContainer.svelte';
	import ScenarioLegend from '$lib/components/shared/ScenarioLegend.svelte';
	import { parameterStore } from '$lib/stores/parameterStore.svelte';
	import { scenarioState } from '$lib/stores/scenario.svelte';
	import { viewStore } from '$lib/stores/viewStore.svelte';
	import {
		getNormalizedScenarios,
		assignScenarioColors,
		hexToRgba
	} from '$lib/comparisonUtils';
	import { getSegmentColor, getSegmentLabel, SEGMENT_ORDER, CHART_PADDING } from '$lib/chartConfig';
	import { viz } from '$lib/colors';
	import type { Snippet } from 'svelte';
	import type { ScenarioObject } from '$lib/types/ChartComponent.interface';

	let {
		year,
		segment = 'all',
		scenarios: scenariosProp,
		comparisonMode = false,
		exportable = true,
		description = '',
		headerControls,
		class: className = '',
		baseScenarioOverride,
		parameterValuesOverride,
		parameterData
	}: {
		year?: number;
		segment?: string;
		scenarios?: ScenarioObject[];
		comparisonMode?: boolean;
		exportable?: boolean;
		description?: string;
		headerControls?: Snippet;
		class?: string;
		baseScenarioOverride?: string;
		parameterValuesOverride?: Record<string, number>;
		parameterData?: { geographies?: any[] };
	} = $props();

	// Subscribe to global scenario state
	const currentScenario = $derived(scenarioState.currentScenario);

	// Normalize scenarios for comparison mode
	const normalizedScenarios = $derived(
		comparisonMode && scenariosProp
			? assignScenarioColors(scenariosProp)
			: assignScenarioColors(getNormalizedScenarios(currentScenario, scenariosProp))
	);

	// Parse which segments to display (always fetch all, filter display)
	const activeSegments = $derived.by(() => {
		if (!segment || segment === 'all' || segment === 'total') return SEGMENT_ORDER;
		return segment.split(',').map(s => s.trim()).filter(s => (SEGMENT_ORDER as readonly string[]).includes(s));
	});

	let loading = $state(true);
	let error = $state<string | null>(null);
	let fetchedData = $state<any[]>([]);
	let dataByScenario = $state<Record<string, any[]>>({});
	let hoveredScenarioId = $state<string | null>(null);
	let selectedScenarioId = $state<string | null>(null);

	// Per-chart scenario/parameter overrides (fall back to global store)
	const baseScenario = $derived(baseScenarioOverride || parameterStore.baseScenario);
	const parameterValues = $derived(
		parameterValuesOverride ?? (parameterStore.isDefaultScenario ? parameterStore.parameterValues : undefined)
	);

	// Geography lookup: prefer prop, fall back to viewStore (set by page loader)
	const geographies = $derived(parameterData?.geographies || (viewStore.pageData as any)?.geographies || []);

	let isComparisonActive = $derived(normalizedScenarios.length > 1 && Object.keys(dataByScenario).length > 0);

	function getScenarioOpacity(scenarioId: string): number {
		if (selectedScenarioId) {
			return selectedScenarioId === scenarioId ? 0.9 : 0.1;
		}
		if (hoveredScenarioId) {
			return hoveredScenarioId === scenarioId ? 0.9 : 0.1;
		}
		return 0.7;
	}

	function handleHover(scenarioId: string | null) {
		hoveredScenarioId = scenarioId;
	}

	function handleClick(scenarioId: string) {
		selectedScenarioId = selectedScenarioId === scenarioId ? null : scenarioId;
	}

	// Reactive data fetching when parameters change
	$effect(() => {
		if (year && normalizedScenarios.length > 0 && baseScenario) {
			const _params = parameterValues;
			fetchGeoSegmentData();
		}
	});

	async function fetchGeoSegmentData() {
		if (!year) {
			error = 'Year must be specified';
			return;
		}

		try {
			loading = true;
			error = null;

			if (normalizedScenarios.length === 1) {
				// Single scenario mode
				const query = makeDemandQuery({
					start: String(year),
					end: String(year + 1),
					resolution: '1Y',
					aggregation: 'sum',
					geography: 'all',
					segment: 'all',
					baseScenario,
					parameterValues
				});

				const data = await fetchDemandData(query);
				fetchedData = data;
			} else {
				// Comparison mode - fetch total demand per geo per scenario
				const fetchPromises = normalizedScenarios.map(async (scenario) => {
					const scenarioId = scenario.id || scenario.scenario_id || 'default';
					const query = makeDemandQuery({
						start: String(year),
						end: String(year + 1),
						resolution: '1Y',
						aggregation: 'sum',
						geography: 'all',
						segment: 'total',
						baseScenario: scenarioId
					});

					const data = await fetchDemandData(query);
					return { scenarioId, data };
				});

				const results = await Promise.all(fetchPromises);

				const newDataByScenario: Record<string, any[]> = {};
				for (const { scenarioId, data } of results) {
					newDataByScenario[scenarioId] = data;
				}
				dataByScenario = newDataByScenario;
			}
		} catch (err: any) {
			error = err?.message || 'An unexpected error occurred';
			console.error('Error fetching geo segment data:', err);
			fetchedData = [];
			dataByScenario = {};
		} finally {
			loading = false;
		}
	}

	// Helper to look up geography name
	function getGeoName(geoId: string): string {
		const geoLookup = geographies.find(
			(g: any) => g.geo_id === geoId || g.id === geoId
		);
		return (geoLookup?.geo_name || geoLookup?.name || geoId).replace(/s? län$/, '');
	}

	// Transform data into 100% stacked format (single scenario mode)
	let chartData = $derived.by(() => {
		if (!fetchedData || fetchedData.length === 0 || !geographies.length) {
			return [];
		}

		// Group data by geography
		const geoMap = new Map<string, { total: number; segments: Record<string, number> }>();

		for (const row of fetchedData) {
			// Skip 'total' geography and segment
			if (row.geography === '00' || row.geography === 'total' || row.segment === 'total') {
				continue;
			}
			// Skip segments not in the active filter
			if (!activeSegments.includes(row.segment)) continue;

			if (!geoMap.has(row.geography)) {
				geoMap.set(row.geography, { total: 0, segments: {} });
			}

			const geoData = geoMap.get(row.geography)!;
			geoData.segments[row.segment] = (geoData.segments[row.segment] || 0) + row.value;
			geoData.total += row.value;
		}

		// Transform to chart format with percentages
		const result: any[] = [];

		for (const [geoId, data] of geoMap.entries()) {
			const geoName = getGeoName(geoId);

			// Skip if no valid name or 'Sverige' (total)
			if (!geoName || geoName === 'Sverige') {
				continue;
			}

			const entry: any = {
				geo_id: geoId,
				name: geoName,
				total: data.total
			};

			// Calculate percentage for each active segment
			for (const seg of activeSegments) {
				const value = data.segments[seg] || 0;
				entry[seg] = data.total > 0 ? (value / data.total) * 100 : 0;
			}

			result.push(entry);
		}

		// Sort by geo_id (county code) ascending
		result.sort((a, b) => a.geo_id.localeCompare(b.geo_id));

		return result;
	});

	// Transform data for comparison mode: grouped bars showing total demand per county per scenario
	let comparisonChartData = $derived.by(() => {
		if (!isComparisonActive || !geographies.length) return [];

		// Collect all county total demands by geo
		const geoMap = new Map<string, any>();

		for (const scenario of normalizedScenarios) {
			const scenarioId = scenario.id || scenario.scenario_id || '';
			const data = dataByScenario[scenarioId] || [];

			for (const row of data) {
				if (row.geography === '00' || row.geography === 'total') continue;

				const geoName = getGeoName(row.geography);
				if (!geoName || geoName === 'Sverige') continue;

				if (!geoMap.has(row.geography)) {
					geoMap.set(row.geography, { geo_id: row.geography, name: geoName });
				}

				const entry = geoMap.get(row.geography)!;
				entry[scenarioId] = (entry[scenarioId] || 0) + (row.value || 0);
			}
		}

		return Array.from(geoMap.values()).sort((a, b) => a.geo_id.localeCompare(b.geo_id));
	});

	// Series config for comparison mode
	let comparisonSeries = $derived(
		normalizedScenarios.map(scenario => {
			const scenarioId = scenario.id || scenario.scenario_id || '';
			const opacity = getScenarioOpacity(scenarioId);
			return {
				key: scenarioId,
				color: hexToRgba(scenario.color || viz.scenario?.baseline || viz.fallback, opacity),
				label: scenario.name || `Scenario`
			};
		})
	);

	// Create series configuration for stacked bars (only active segments)
	let series = $derived(
		activeSegments.map(seg => ({
			key: seg,
			color: getSegmentColor(seg).bg,
			label: getSegmentLabel(seg)
		}))
	);

	// Comparison metadata for legend
	let comparisonMetadata = $derived.by(() => {
		if (!isComparisonActive) return null;
		return {
			scenarios: normalizedScenarios,
			colors: normalizedScenarios.map(s => s.color || '')
		};
	});

	// Prepare export metadata
	let exportMetadata = $derived({
		chartType: 'geo-segment-composition',
		year: year,
		scenarios: normalizedScenarios.length > 1
			? normalizedScenarios.map(s => s.id || s.scenario_id || 'unknown')
			: undefined
	});
</script>

<ChartContainer
	title="Sektorernas andel per län"
	{description}
	sizeVariant="none"
	aspectRatio="auto"
	metadata={exportMetadata}
	chartData={isComparisonActive ? comparisonChartData : chartData}
	{exportable}
	{headerControls}
	exportPadding={{ left: 32, right: 32 }}
	class={className}
>
	<div>
		{#if loading}
			<LoadingSkeleton variant="chart" message="Laddar sektoruppdelning per län..." />
		{:else if error}
			<ErrorState
				message="Kunde inte ladda data"
				details={error}
				onRetry={fetchGeoSegmentData}
			/>
		{:else if !isComparisonActive && chartData.length === 0}
			<EmptyState
				message="Ingen data tillgänglig"
				description="Ingen data finns för valt år"
			/>
		{:else if isComparisonActive}
			<!-- Comparison mode: grouped bars showing total demand per county per scenario -->
			<div class="h-[280px] sm:h-[350px] lg:h-[400px] overflow-visible">
				<BarChart
					data={comparisonChartData}
					x="name"
					series={comparisonSeries}
					seriesLayout="group"
					padding={CHART_PADDING.rotatedX}
					props={{
						xAxis: {
							tweened: false,
							tickLabelProps: { rotate: 315, textAnchor: 'end', fontSize: 9 }
						},
						yAxis: {
							tweened: false,
							format: (v: number) => formatNumber(v, getEnergyPrefix(), 'Wh')
						},
						bars: { radius: 2, stroke: 'none' },
						highlight: {
							area: { fill: 'rgba(0,0,0,0.05)' }
						},
						tooltip: {
							root: {
								variant: 'none',
								contained: 'window',
								class: 'text-xs py-1 px-2 rounded shadow-lg bg-white/95 border border-gray-200 backdrop-blur-sm'
							},
							item: {
								format: (v: number) => formatNumber(v, getEnergyPrefix(), 'Wh')
							}
						}
					}}
				/>
			</div>

			<!-- Scenario Legend -->
			{#if comparisonMetadata}
				<ScenarioLegend
					scenarios={normalizedScenarios}
					metadata={comparisonMetadata}
					onHover={handleHover}
					onClick={handleClick}
					class="mt-2"
				/>
			{/if}
		{:else}
			<!-- Single scenario mode: 100% stacked composition -->
			<div class="h-[280px] sm:h-[350px] lg:h-[400px] overflow-visible">
				<BarChart
					data={chartData}
					x="name"
					{series}
					seriesLayout="stack"
					padding={CHART_PADDING.rotatedX}
					props={{
						xAxis: {
							tweened: false,
							tickLabelProps: { rotate: 315, textAnchor: 'end', fontSize: 9 }
						},
						yAxis: {
							tweened: false,
							format: (v: number) => `${Math.round(v)}%`
						},
						bars: { radius: 0, stroke: 'none' },
						highlight: {
							area: { fill: 'rgba(0,0,0,0.05)' }
						},
						tooltip: {
							hideTotal: true,
							root: {
								variant: 'none',
								contained: 'window',
								class: 'text-xs py-1 px-2 rounded shadow-lg bg-white/95 border border-gray-200 backdrop-blur-sm'
							},
							item: {
								format: (v: number) => `${Math.round(v)}%`
							}
						}
					}}
				/>
			</div>

			<!-- Segment Legend -->
			<div class="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2 text-sm">
				{#each activeSegments as seg}
					{@const colors = getSegmentColor(seg)}
					<div class="flex items-center gap-1.5">
						<div
							class="w-3 h-3 rounded-sm"
							style="background-color: {colors.bg};"
						></div>
						<span class="text-gray-700">{getSegmentLabel(seg)}</span>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</ChartContainer>
