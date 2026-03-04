<script lang="ts">
	/**
	 * TimeLine Component - Time series area chart visualization
	 *
	 * Standardized chart component following ChartComponent interface patterns.
	 * Displays electricity demand over time as an area chart.
	 *
	 * @component
	 */
	import { AreaChart } from 'layerchart';
	import { fetchDemandData } from '$lib/dataService';
	import { makeDemandQuery, formatNumber } from '$lib/utilities';
	import { getPowerPrefix } from '$lib/stores/units.svelte';
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
		mergeScenarioData,
		createComparisonMetadata,
		hexToRgba
	} from '$lib/comparisonUtils';
	import { viz } from '$lib/colors';
	import { CHART_PADDING } from '$lib/chartConfig';
	import type { Snippet } from 'svelte';

	let {
		data: dayDataProp = [],
		geography,
		resolution = '1d',
		segment,
		aggregation = 'sum',
		year,
		scenarios: scenariosProp,
		comparisonMode = false,
		exportable = true,
		description = '',
		headerControls,
		baseScenarioOverride,
		parameterValuesOverride,
		class: className = ''
	}: TimeSeriesChartProps & { segment?: string; exportable?: boolean; description?: string; headerControls?: Snippet; baseScenarioOverride?: string; parameterValuesOverride?: Record<string, number>; class?: string } = $props();

	// Separate state for fetched data
	let dayData = $state<any[]>([]);

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

	function handleHover(scenarioId: string | null) {
		hoveredScenarioId = scenarioId;
	}

	function handleClick(scenarioId: string) {
		selectedScenarioId = selectedScenarioId === scenarioId ? null : scenarioId;
	}

	// For single scenario mode (backwards compatibility)
	// Handle both 'timestamp' (legacy) and 'period' (new API) field names
	let chartData = $derived(
		normalizedScenarios.length === 1
			? (dayData || []).map((d) => ({
					timestamp: d.period || d.timestamp,
					total: d.value || d.total || 0
				}))
			: []
	);

	// For comparison mode - merge data from multiple scenarios
	// Handle both 'timestamp' (legacy) and 'period' (new API) field names
	let comparisonData = $derived(
		normalizedScenarios.length > 1
			? mergeScenarioData(
					Object.fromEntries(
						Object.entries(dataByScenario).map(([scenarioId, data]) => [
							scenarioId,
							data.map((d) => {
								const dateField = d.period || d.timestamp;
								return {
									timestamp: dateField instanceof Date ? dateField : new Date(dateField),
									value: d.value || d.total || 0
								};
							})
						])
					),
					normalizedScenarios
				)
			: []
	);

	// Create comparison metadata for legend
	let metadata = $derived(
		normalizedScenarios.length > 1 ? createComparisonMetadata(normalizedScenarios, comparisonData) : null
	);

	// Get current parameter state for reactive fetching (with per-chart overrides)
	const baseScenario = $derived(baseScenarioOverride || parameterStore.baseScenario);
	const parameterValues = $derived(parameterValuesOverride || parameterStore.parameterValues);

	// Use prop data if provided (hybrid pattern)
	$effect(() => {
		if (dayDataProp && dayDataProp.length > 0) {
			dayData = dayDataProp;
			return;
		}
		// Only fetch if no prop data provided
		// Include parameter dependencies for reactivity
		if (normalizedScenarios.length > 0 && geography && year && resolution && segment && baseScenario) {
			const _params = parameterValues;
			fetchTimelineData();
		}
	});

	async function fetchTimelineData() {
		if (!year || !geography || !resolution || !segment) {
			error = 'Saknar obligatoriska parametrar (år, geografi, upplösning, segment)';
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
					resolution,
					aggregation,
					geography,
					segment: segment || 'housing',
					baseScenario: baseScenario,
					parameterValues: parameterValues
				});

				const data = await fetchDemandData(query);
				dayData = data;
			} else {
				// Comparison mode - fetch data for each scenario
				const fetchPromises = normalizedScenarios.map(async (scenario) => {
					const scenarioId = scenario.id || scenario.scenario_id || 'default';
					const query = makeDemandQuery({
						start: `${year}-01-01`,
						end: `${year + 1}-01-01`,
						resolution,
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
			console.error('Error fetching timeline data:', err);
			dayData = [];
			dataByScenario = {};
		} finally {
			loading = false;
		}
	}

	// Prepare export metadata
	let exportMetadata = $derived({
		chartType: 'timeline',
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
		normalizedScenarios.length === 1 ? chartData : comparisonData
	);

	// Shared tooltip and highlight props
	const tooltipProps = {
		highlight: { area: { fill: 'rgba(0,0,0,0.05)' } },
		tooltip: {
			root: {
				variant: 'none' as const,
				contained: 'window' as const,
				class: 'text-xs py-1 px-2 rounded shadow-lg bg-white/95 dark:bg-gray-800/95 border border-gray-200 dark:border-gray-700 backdrop-blur-sm'
			},
			item: {
				label: '',
				format: (v: number) => formatNumber(v, getPowerPrefix(), 'W')
			}
		}
	};
</script>

<ChartContainer
	title="Tidslinje"
	{description}
	sizeVariant="none"
	aspectRatio="auto"
	metadata={exportMetadata}
	chartData={exportData}
	{exportable}
	{headerControls}
	class={className}
>
	<div class="h-[300px]">
	{#if loading}
		<LoadingSkeleton variant="chart" message="Laddar tidsserie..." />
	{:else if error}
		<ErrorState message="Kunde inte ladda tidsserie" details={error} onRetry={fetchTimelineData} />
	{:else if chartData.length === 0 && comparisonData.length === 0}
		<EmptyState
			message="Ingen data tillgänglig"
			description="Ingen data finns för vald tidsperiod"
		/>
	{:else if normalizedScenarios.length === 1}
		<!-- Single scenario mode -->
		<AreaChart
			data={chartData}
			x="timestamp"
			y="total"
			padding={CHART_PADDING.standard}
			props={{
				line: { fill: 'none', stroke: viz.teal[900], strokeWidth: 2 },
				area: { fill: viz.teal[500], fillOpacity: 0.3 },
				yAxis: { format: (v: number) => formatNumber(v, getPowerPrefix(), 'W').replace(/\.\d+/, ''), tickLabelProps: { fontSize: 11 } },
				xAxis: { tickLabelProps: { fontSize: 11 } },
				...tooltipProps
			}}
		/>
	{:else if normalizedScenarios.length > 1}
		<!-- Comparison mode - multiple scenarios with transparency and highlighting -->
		{@const hasRequiredFields = comparisonData.length > 0 &&
			comparisonData.every(d => d && d.timestamp && d.values) &&
			normalizedScenarios.every(s => {
				const sid = s.id || s.scenario_id;
				return sid && comparisonData.every(d => d.values && typeof d.values[sid] !== 'undefined');
			})}
		{#if hasRequiredFields}
			{@const areaSeries = normalizedScenarios.map(scenario => {
				const scenarioId = scenario.id || scenario.scenario_id || '';
				const opacity = getScenarioOpacity(scenarioId);
				return {
					key: scenarioId,
					value: scenarioId,
					color: hexToRgba(scenario.color || viz.scenario.baseline, opacity * 0.4),
					props: {
						line: {
							fill: 'none',
							stroke: hexToRgba(scenario.color || viz.scenario.baseline, opacity),
							strokeWidth: 2
						}
					}
				};
			})}
			<AreaChart
				data={comparisonData.map((d) => ({ timestamp: d.timestamp, ...d.values }))}
				x="timestamp"
				series={areaSeries}
				padding={CHART_PADDING.standard}
				props={{
					yAxis: { format: (v: number) => formatNumber(v, getPowerPrefix(), 'W').replace(/\.\d+/, ''), tickLabelProps: { fontSize: 11 } },
					xAxis: { tickLabelProps: { fontSize: 11 } },
					...tooltipProps
				}}
			/>
		{/if}

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
	{/if}
	</div>
</ChartContainer>