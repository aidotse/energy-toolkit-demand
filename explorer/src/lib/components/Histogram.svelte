<script lang="ts">
	/**
	 * Histogram Component - Distribution visualization of hourly demand data
	 *
	 * Standardized chart component following ChartComponent interface patterns.
	 * Displays frequency distribution of hourly electricity demand values.
	 *
	 * @component
	 */
	import { BarChart } from 'layerchart';
	import { fetchDemandData, calculateHistogram } from '$lib/dataService';
	import { makeDemandQuery } from '$lib/utilities';
	import LoadingSkeleton from '$lib/components/shared/LoadingSkeleton.svelte';
	import ErrorState from '$lib/components/shared/ErrorState.svelte';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import ScenarioLegend from '$lib/components/shared/ScenarioLegend.svelte';
	import ChartContainer from '$lib/components/shared/ChartContainer.svelte';
	import type { TimeSeriesChartProps } from '$lib/types/ChartComponent.interface';
	import { scenarioState } from '$lib/stores/scenario.svelte';
	import { parameterStore } from '$lib/stores/parameterStore.svelte';
	import {
		getNormalizedScenarios,
		assignScenarioColors,
		createComparisonMetadata,
		hexToRgba
	} from '$lib/comparisonUtils';
	import { getDistributionAxisConfig } from '$lib/chartConfig';
	import type { Snippet } from 'svelte';

	let {
		data: hourDataProp = [],
		geography,
		resolution = '1h',
		segment,
		aggregation = 'mean',
		year,
		scenarios: scenariosProp,
		comparisonMode = false,
		exportable = true,
		description = '',
		headerControls,
		class: className = ''
	}: TimeSeriesChartProps & { segment?: string; exportable?: boolean; description?: string; headerControls?: Snippet; class?: string } = $props();

	// Subscribe to global scenario state
	const currentScenario = $derived(scenarioState.currentScenario);

	// Normalize scenarios for comparison mode
	const normalizedScenarios = $derived(
		comparisonMode && scenariosProp
			? assignScenarioColors(scenariosProp)
			: assignScenarioColors(getNormalizedScenarios(currentScenario, scenariosProp))
	);

	let loading = $state(false);
	let error = $state<string | null>(null);
	let hourData = $state<any[]>([]);
	let dataByScenario = $state<Record<string, any[]>>({});
	let hoveredScenarioId = $state<string | null>(null);
	let selectedScenarioId = $state<string | null>(null);

	// Helper to determine opacity based on hover/select state
	function getScenarioOpacity(scenarioId: string): number {
		// If something is selected, only show selected at full opacity
		if (selectedScenarioId) {
			return selectedScenarioId === scenarioId ? 0.9 : 0.1;
		}
		// If something is hovered, only show hovered at full opacity
		if (hoveredScenarioId) {
			return hoveredScenarioId === scenarioId ? 0.9 : 0.1;
		}
		// Default: all visible with transparency for overlay
		return 0.5; // Default 50% opacity to see through bars
	}

	function handleHover(scenarioId: string | null) {
		hoveredScenarioId = scenarioId;
	}

	function handleClick(scenarioId: string) {
		// Toggle selection
		selectedScenarioId = selectedScenarioId === scenarioId ? null : scenarioId;
	}

	// Get current parameter state for reactive fetching
	const baseScenario = $derived(parameterStore.baseScenario);
	const parameterValues = $derived(parameterStore.parameterValues);

	// Use prop data if provided (hybrid pattern)
	$effect(() => {
		if (hourDataProp && hourDataProp.length > 0) {
			hourData = hourDataProp;
			return;
		}
		// Only fetch if no prop data provided
		// Include parameter dependencies for reactivity
		if (normalizedScenarios.length > 0 && geography && year && aggregation && baseScenario) {
			const _params = parameterValues;
			fetchHistogramData();
		}
	});

	async function fetchHistogramData() {
		if (!year || !aggregation || !geography) {
			error = 'Saknar obligatoriska parametrar (år, aggregering, geografi)';
			return;
		}

		try {
			loading = true;
			error = null;

			if (normalizedScenarios.length === 1) {
				// Single scenario mode - use Strategy 2 parameters
				const query = makeDemandQuery({
					start: `${year}-01-01`,
					end: `${year + 1}-01-01`,
					resolution: '1h',
					aggregation,
					geography,
					segment: segment || 'housing',
					baseScenario: parameterStore.baseScenario,
					parameterValues: parameterStore.isDefaultScenario ? parameterStore.parameterValues : undefined
				});

				const data = await fetchDemandData(query);
				hourData = data;
			} else {
				// Comparison mode - fetch data for each scenario
				const fetchPromises = normalizedScenarios.map(async (scenario) => {
					const scenarioId = scenario.id || scenario.scenario_id || 'default';
					const query = makeDemandQuery({
						start: `${year}-01-01`,
						end: `${year + 1}-01-01`,
						resolution: '1h',
						aggregation,
						geography,
						segment: segment || 'housing',
						baseScenario: scenarioId
					});

					const data = await fetchDemandData(query);
					return { scenarioId, data };
				});

				const results = await Promise.all(fetchPromises);

				// Store data by scenario
				const newDataByScenario: Record<string, any[]> = {};
				for (const { scenarioId, data } of results) {
					newDataByScenario[scenarioId] = data;
				}
				dataByScenario = newDataByScenario;
			}
		} catch (err: any) {
			error = err?.message || 'Ett oväntat fel inträffade';
			console.error('Error fetching histogram data:', err);
			hourData = [];
			dataByScenario = {};
		} finally {
			loading = false;
		}
	}

	// For single scenario mode
	let histogramData = $derived(
		normalizedScenarios.length === 1 ? calculateHistogram(hourData || [], 'value', 50) : []
	);

	// Calculate x-axis domain (min/max power values) for tick placement
	let xDomain = $derived.by(() => {
		if (normalizedScenarios.length === 1 && histogramData.length > 0) {
			const min = histogramData[0].x0;
			const max = histogramData[histogramData.length - 1].x1;
			return [min, max] as [number, number];
		} else if (normalizedScenarios.length > 1 && comparisonHistogramData.length > 0) {
			const min = comparisonHistogramData[0].x0;
			const max = comparisonHistogramData[comparisonHistogramData.length - 1].x1;
			return [min, max] as [number, number];
		}
		return undefined;
	});

	// For comparison mode - calculate histogram for each scenario then merge
	let comparisonHistogramData = $derived(
		normalizedScenarios.length > 1
			? (() => {
					// First, find the global min/max across all scenarios to ensure consistent bins
					let globalMin = Infinity;
					let globalMax = -Infinity;

					for (const scenario of normalizedScenarios) {
						const scenarioId = scenario.id || scenario.scenario_id || '';
						const data = dataByScenario[scenarioId] || [];
						for (const item of data) {
							const value = item.value || 0;
							if (value < globalMin) globalMin = value;
							if (value > globalMax) globalMax = value;
						}
					}

					// Calculate bin width for consistent bins across all scenarios
					const binCount = 50;
					const binWidth = (globalMax - globalMin) / binCount;

					// Calculate histogram for each scenario using the same bin boundaries
					const histogramsByScenario: Record<string, any[]> = {};
					for (const scenario of normalizedScenarios) {
						const scenarioId = scenario.id || scenario.scenario_id || '';
						const data = dataByScenario[scenarioId] || [];

						// Initialize bins
						const bins: any[] = [];
						for (let i = 0; i < binCount; i++) {
							bins.push({
								x0: globalMin + i * binWidth,
								x1: globalMin + (i + 1) * binWidth,
								length: 0
							});
						}

						// Fill bins with data
						for (const item of data) {
							const value = item.value || 0;
							const binIndex = Math.min(
								Math.floor((value - globalMin) / binWidth),
								binCount - 1
							);
							if (binIndex >= 0 && binIndex < binCount) {
								bins[binIndex].length++;
							}
						}

						histogramsByScenario[scenarioId] = bins;
					}

					// Merge histograms: combine bins by x0 (bin start)
					const binMap = new Map<number, any>();
					for (const scenario of normalizedScenarios) {
						const scenarioId = scenario.id || scenario.scenario_id || '';
						const histogram = histogramsByScenario[scenarioId] || [];

						for (const bin of histogram) {
							if (!binMap.has(bin.x0)) {
								binMap.set(bin.x0, { x0: bin.x0, x1: bin.x1 });
								// Initialize all scenario values to 0
								for (const s of normalizedScenarios) {
									const sid = s.id || s.scenario_id || '';
									binMap.get(bin.x0)![sid] = 0;
								}
							}
							binMap.get(bin.x0)![scenarioId] = bin.length;
						}
					}

					return Array.from(binMap.values()).sort((a, b) => a.x0 - b.x0);
				})()
			: []
	);

	// Create comparison metadata for legend
	let metadata = $derived(
		normalizedScenarios.length > 1 ? createComparisonMetadata(normalizedScenarios) : null
	);

	// Prepare export metadata
	let exportMetadata = $derived({
		chartType: 'histogram',
		geography: geography,
		year: year,
		scenario: normalizedScenarios.length === 1
			? (normalizedScenarios[0].id || normalizedScenarios[0].scenario_id)
			: undefined,
		scenarios: normalizedScenarios.length > 1
			? normalizedScenarios.map(s => s.id || s.scenario_id || 'unknown')
			: undefined
	});

	// Prepare data for export
	let exportData = $derived(
		normalizedScenarios.length === 1 ? histogramData : comparisonHistogramData
	);
</script>

<ChartContainer
	title="Histogram över elbehovet"
	{description}
	sizeVariant="standard"
	aspectRatio="auto"
	metadata={exportMetadata}
	chartData={exportData}
	{exportable}
	{headerControls}
	class={className}
>
	<div class="h-[300px] ml-8 mb-14 mr-2 mt-1">
		{#if loading}
			<LoadingSkeleton variant="chart" message="Laddar histogram..." />
		{:else if error}
			<ErrorState message="Kunde inte ladda histogram" details={error} onRetry={fetchHistogramData} />
		{:else if histogramData.length === 0 && comparisonHistogramData.length === 0}
			<EmptyState
				message="Ingen data tillgänglig"
				description="Ingen data finns för vald tidsperiod och geografi"
			/>
		{:else if normalizedScenarios.length === 1}
			<!-- Single scenario mode -->
			<BarChart
				data={histogramData}
				x="x0"
				y="length"
				bandPadding={0.2}
				props={{
					...getDistributionAxisConfig(true, xDomain),
					bars: { tweened: true, radius: 2, stroke: 'none' }
				}}
			/>
		{:else if normalizedScenarios.length > 1}
			<!-- Comparison mode - overlayed bars with transparency -->
			{@const hasRequiredFields = comparisonHistogramData.length > 0 &&
				comparisonHistogramData.every(d => d && typeof d.x0 !== 'undefined') &&
				normalizedScenarios.every(s => {
					const sid = s.id || s.scenario_id;
					return sid && comparisonHistogramData.every(d => d && typeof d[sid] !== 'undefined');
				})}
			{#if hasRequiredFields}
				{@const series = normalizedScenarios.map(scenario => {
					const scenarioId = scenario.id || scenario.scenario_id || '';
					const opacity = getScenarioOpacity(scenarioId);
					const color = hexToRgba(scenario.color || '#6b7280', opacity);
					return {
						key: scenarioId,
						color,
						props: {
							radius: 2,
							stroke: 'none'
						}
					};
				})}
				<BarChart
					data={comparisonHistogramData}
					x="x0"
					{series}
					seriesLayout="group"
					bandPadding={0.2}
					groupPadding={0.1}
					props={getDistributionAxisConfig(true, xDomain)}
				/>

				<!-- Scenario Legend -->
				{#if metadata}
					<ScenarioLegend
						scenarios={normalizedScenarios}
						{metadata}
						onHover={handleHover}
						onClick={handleClick}
						class="mt-4"
					/>
				{/if}
			{:else}
				<EmptyState
					message="Väntar på data"
					description="Laddar jämförelsedata..."
				/>
			{/if}
		{/if}
	</div>
</ChartContainer>