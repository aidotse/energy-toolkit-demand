<script lang="ts">
	/**
	 * segmentBars Component - Segment/segment breakdown visualization
	 *
	 * Standardized chart component following ChartComponent interface patterns.
	 * Displays breakdown of electricity demand by segment (buildings, transport, industry).
	 *
	 * @component
	 */
	import { BarChart } from 'layerchart';
	import { formatNumber, makeDemandQuery } from '$lib/utilities';
	import { getEnergyPrefix } from '$lib/stores/units.svelte';
	import { fetchDemandData, calculateSegmentData } from '$lib/dataService';
	import LoadingSkeleton from '$lib/components/shared/LoadingSkeleton.svelte';
	import ErrorState from '$lib/components/shared/ErrorState.svelte';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import ScenarioLegend from '$lib/components/shared/ScenarioLegend.svelte';
	import ChartContainer from '$lib/components/shared/ChartContainer.svelte';
	import type { SegmentChartProps } from '$lib/types/ChartComponent.interface';
	import { scenarioState } from '$lib/stores/scenario.svelte';
	import { parameterStore } from '$lib/stores/parameterStore.svelte';
	import {
		getNormalizedScenarios,
		assignScenarioColors,
		createComparisonMetadata,
		hexToRgba
	} from '$lib/comparisonUtils';
	import { viz } from '$lib/colors';
	import { getSegmentLabel, CHART_PADDING } from '$lib/chartConfig';
	import type { Snippet } from 'svelte';

	let {
		data: yearDataProp = null,
		geography,
		year,
		scenarios: scenariosProp,
		comparisonMode = false,
		exportable = true,
		description = '',
		headerControls,
		baseScenarioOverride,
		parameterValuesOverride,
		class: className = ''
	}: SegmentChartProps & { exportable?: boolean; description?: string; headerControls?: Snippet; baseScenarioOverride?: string; parameterValuesOverride?: Record<string, number>; class?: string } = $props();

	// Subscribe to global scenario state
	const currentScenario = $derived(scenarioState.currentScenario);

	// Normalize scenarios for comparison mode
	const normalizedScenarios = $derived(
		comparisonMode && scenariosProp
			? assignScenarioColors(scenariosProp)
			: assignScenarioColors(getNormalizedScenarios(currentScenario, scenariosProp))
	);

	let loading = $state(true);
	let error = $state<string | null>(null);
	let fetchedYearData = $state<any[]>([]);
	let dataByScenario = $state<Record<string, any[]>>({});
	let hoveredScenarioId = $state<string | null>(null);
	let selectedScenarioId = $state<string | null>(null);

	function getScenarioOpacity(scenarioId: string): number {
		if (selectedScenarioId) {
			return selectedScenarioId === scenarioId ? 0.9 : 0.1;
		}
		if (hoveredScenarioId) {
			return hoveredScenarioId === scenarioId ? 0.9 : 0.1;
		}
		return 0.5; // Default 50% opacity to see through bars
	}

	function getOpacityClass(opacity: number): string {
		if (opacity >= 0.9) return 'opacity-90';
		if (opacity >= 0.5) return 'opacity-50';
		return 'opacity-10';
	}

	function handleHover(scenarioId: string | null) {
		hoveredScenarioId = scenarioId;
	}

	function handleClick(scenarioId: string) {
		selectedScenarioId = selectedScenarioId === scenarioId ? null : scenarioId;
	}

	// Use fetched data if available, otherwise use prop data
	const yearData = $derived(fetchedYearData.length > 0 ? fetchedYearData : yearDataProp);

	// Get current parameter state for reactive fetching (with per-chart overrides)
	const baseScenario = $derived(baseScenarioOverride || parameterStore.baseScenario);
	const parameterValues = $derived(parameterValuesOverride || parameterStore.parameterValues);

	// Reactive data fetching when scenarios or parameters change
	$effect(() => {
		// Include all dependencies to trigger refetch
		if (normalizedScenarios.length > 0 && year && baseScenario) {
			const _params = parameterValues;
			fetchSegmentData();
		} else {
			// No fetch possible — release the skeleton so empty/error states can render.
			loading = false;
		}
	});

	async function fetchSegmentData() {
		if (!year) {
			error = 'År måste anges';
			return;
		}

		try {
			loading = true;
			error = null;

			if (normalizedScenarios.length === 1) {
				// Single scenario mode - use Strategy 2 parameters
				const query = makeDemandQuery({
					start: String(year),
					end: String(year + 1),
					resolution: '1Y',
					aggregation: 'sum',
					geography: 'all', // Get all geographies for segment breakdown
					segment: 'all', // Get all segments for segment breakdown
					baseScenario: baseScenario,
					parameterValues: parameterValues
				});

				const data = await fetchDemandData(query);
				fetchedYearData = data;
			} else {
				// Comparison mode - fetch data for each scenario
				const fetchPromises = normalizedScenarios.map(async (scenario) => {
					const scenarioId = scenario.id || scenario.scenario_id || 'default';
					const query = makeDemandQuery({
						start: String(year),
						end: String(year + 1),
						resolution: '1Y',
						aggregation: 'sum',
						geography: 'all',
						segment: 'all',
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
			console.error('Error fetching segment data:', err);
			fetchedYearData = [];
			dataByScenario = {};
		} finally {
			loading = false;
		}
	}

	// For single scenario mode
	let segmentData = $derived(
		normalizedScenarios.length === 1 ? calculateSegmentData(yearData || [], geography || '01') : []
	);

	let chartData = $derived(
		!segmentData || segmentData.length === 0
			? []
			: segmentData.map((item) => ({
					segment: item.segment,
					value: item.value
				}))
	);

	// For comparison mode - merge segment data from multiple scenarios
	let comparisonSegmentData = $derived(
		normalizedScenarios.length > 1
			? (() => {
					// Calculate segment data for each scenario
					const segmentDataByScenario: Record<string, any[]> = {};
					for (const scenario of normalizedScenarios) {
						const scenarioId = scenario.id || scenario.scenario_id;
						if (!scenarioId) {
							console.warn('[segmentBars] Scenario missing ID:', scenario);
							continue;
						}
						const data = dataByScenario[scenarioId] || [];
						const calculatedData = calculateSegmentData(data, geography || '01');
						segmentDataByScenario[scenarioId] = calculatedData;
					}

					// First pass: collect all unique segments
					const allSegments = new Set<string>();
					for (const scenarioId in segmentDataByScenario) {
						for (const item of segmentDataByScenario[scenarioId]) {
							allSegments.add(item.segment);
						}
					}

					// Second pass: create data with all scenarios for each segment
					const segmentMap = new Map<string, any>();
					for (const segment of allSegments) {
						// Ensure segment is a valid string
						if (!segment || typeof segment !== 'string') {
							console.warn('[segmentBars] Invalid segment:', segment);
							continue;
						}

						const segmentData: any = {
							segment: segment || 'Unknown'
						};

						// Initialize all scenario values to 0
						for (const scenario of normalizedScenarios) {
							const scenarioId = scenario.id || scenario.scenario_id;
							if (scenarioId) {
								segmentData[scenarioId] = 0;
							} else {
								console.warn('[segmentBars] Scenario missing ID when initializing:', scenario);
							}
						}

						// Fill in actual values
						for (const scenario of normalizedScenarios) {
							const scenarioId = scenario.id || scenario.scenario_id;
							if (!scenarioId) {
								console.warn('[segmentBars] Skipping scenario with no ID:', scenario);
								continue;
							}

							const data = segmentDataByScenario[scenarioId] || [];
							const item = data.find((d) => d.segment === segment);
							if (item) {
								segmentData[scenarioId] = item.value || 0;
							}
						}

						// Final validation - ensure all required fields exist
						if (segmentData.segment && Object.keys(segmentData).length > 1) {
							segmentMap.set(segment, segmentData);
						} else {
							console.warn('[segmentBars] Skipping incomplete segment data:', segmentData);
						}
					}

					return Array.from(segmentMap.values());
				})()
			: []
	);

	// Create comparison metadata for legend
	let metadata = $derived(
		normalizedScenarios.length > 1 ? createComparisonMetadata(normalizedScenarios) : null
	);

	// Prepare export metadata
	let exportMetadata = $derived({
		chartType: 'segment-breakdown',
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
		normalizedScenarios.length === 1 ? chartData : comparisonSegmentData
	);

	// Shared tooltip: styled to match SectorPieChart's custom tooltip and
	// translates the x-axis segment key via getSegmentLabel. In single-scenario
	// mode we also show the percentage of the year's total.
	const singleTotal = $derived(
		chartData.reduce((sum, d) => sum + (d.value || 0), 0)
	);

	const tooltipProps: any = $derived({
		highlight: { area: { fill: 'rgba(0,0,0,0.05)' } },
		tooltip: {
			header: {
				format: (v: any) => getSegmentLabel(String(v)),
				class: 'font-semibold text-gray-900'
			},
			root: {
				variant: 'none' as const,
				contained: 'window' as const,
				class: 'text-xs py-1 px-2 rounded shadow-lg bg-white/95 border border-gray-200 backdrop-blur-sm'
			},
			item: {
				label: '',
				format: (v: number) => {
					const energy = formatNumber(v, getEnergyPrefix(), 'Wh');
					if (singleTotal > 0) {
						const pct = Math.round((v / singleTotal) * 100);
						return `${energy} · ${pct}%`;
					}
					return energy;
				}
			}
		}
	});
</script>

<ChartContainer
	title="Energi per sektor"
	{description}
	sizeVariant="none"
	aspectRatio="auto"
	metadata={exportMetadata}
	chartData={exportData}
	{exportable}
	{headerControls}
	exportPadding={{ top: 24, bottom: 64 }}
	class={className}
>
	<div class="h-[350px]">
	{#if loading}
		<LoadingSkeleton variant="chart" message="Laddar sektoruppdelning..." />
	{:else if error}
		<ErrorState
			message="Kunde inte ladda sektordata"
			details={error}
			onRetry={fetchSegmentData}
		/>
	{:else if chartData.length === 0 && comparisonSegmentData.length === 0}
		<EmptyState
			message="Ingen sektordata tillgänglig"
			description="Ingen data finns för valt år och geografi"
		/>
	{:else if normalizedScenarios.length === 1}
		<!-- Single scenario mode -->
		<div class="flex justify-end mb-2">
			<p class="text-sm text-gray-500">
				Totalt: {formatNumber(
					segmentData.reduce((sum, item) => sum + item.value, 0),
					getEnergyPrefix(),
					'Wh'
				)}
			</p>
		</div>
		<BarChart
			data={chartData}
			x="segment"
			y="value"
			padding={CHART_PADDING.standard}
			props={{
				xAxis: { format: (v: string) => getSegmentLabel(v), tickLabelProps: { fontSize: 11 } },
				yAxis: { format: (v: number) => formatNumber(v, getEnergyPrefix(), 'Wh').replace(/\.\d+/, ''), tickLabelProps: { fontSize: 11 } },
				bars: { tweened: true, radius: 2, stroke: 'none', fill: viz.teal[700] },
				...tooltipProps
			}}
		/>
	{:else if normalizedScenarios.length > 1}
		<!-- Comparison mode - overlayed bars with transparency -->
		{@const actualData = comparisonSegmentData}
		{@const hasRequiredFields = actualData.length > 0 &&
			actualData.every(d => d && d.segment) &&
			normalizedScenarios.every(s => {
				const sid = s.id || s.scenario_id;
				return sid && actualData.every(d => d && typeof d[sid] !== 'undefined');
			})}
		{#if hasRequiredFields}
			{@const series = normalizedScenarios.map(scenario => {
				const scenarioId = scenario.id || scenario.scenario_id || '';
				const opacity = getScenarioOpacity(scenarioId);
				const color = hexToRgba(scenario.color || viz.scenario.baseline, opacity);
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
				data={actualData}
				x="segment"
				{series}
				seriesLayout="group"
				padding={CHART_PADDING.standard}
				groupPadding={0.1}
				props={{
					xAxis: { format: (v: string) => getSegmentLabel(v), tweened: true, tickLabelProps: { fontSize: 11 } },
					yAxis: { format: (v: number) => formatNumber(v, getEnergyPrefix(), 'Wh'), tweened: true, tickLabelProps: { fontSize: 11 } },
					...tooltipProps
				}}
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