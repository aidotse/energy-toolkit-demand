<script lang="ts">
	/**
	 * AreaChart Component - Yearly time series area chart
	 *
	 * Standardized chart component following ChartComponent interface patterns.
	 * Displays yearly electricity demand trends.
	 *
	 * @component
	 */
	import { AreaChart, Tooltip } from 'layerchart';
	import { formatNumber, makeDemandQuery } from '$lib/utilities';
	import { getEnergyPrefix } from '$lib/stores/units.svelte';
	import { fetchDemandData } from '$lib/dataService';
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
	import { getTimeSeriesAxisConfig, CHART_PADDING } from '$lib/chartConfig';
	import { viz } from '$lib/colors';
	import type { Snippet } from 'svelte';
	import * as m from '$paraglide/messages';

	let {
		data: allYearsData = [],
		geography,
		segment = 'total',
		year,
		aggregation: aggregationInit = 'sum',
		scenarios: scenariosProp,
		comparisonMode = false,
		displayAxes = true,
		exportable = true,
		description = '',
		headerControls,
		baseScenarioOverride,
		parameterValuesOverride,
		class: className = '',
		contentClass = '',
		height = 'h-[350px]'
	}: TimeSeriesChartProps & {
		segment?: string;
		displayAxes?: boolean;
		exportable?: boolean;
		description?: string;
		headerControls?: Snippet;
		baseScenarioOverride?: string;
		parameterValuesOverride?: Record<string, number>;
		class?: string;
		contentClass?: string;
		height?: string;
	} = $props();

	// Subscribe to global scenario state
	const currentScenario = $derived(scenarioState.currentScenario);

	// Normalize scenarios for comparison mode
	const normalizedScenarios = $derived(
		comparisonMode && scenariosProp
			? assignScenarioColors(scenariosProp)
			: assignScenarioColors(getNormalizedScenarios(currentScenario, scenariosProp))
	);

	// svelte-ignore state_referenced_locally
	let aggregation = $state(aggregationInit);
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
		return 0.5; // Default 50% opacity to see through areas
	}

	function handleHover(scenarioId: string | null) {
		hoveredScenarioId = scenarioId;
	}

	function handleClick(scenarioId: string) {
		selectedScenarioId = selectedScenarioId === scenarioId ? null : scenarioId;
	}

	let titleMeasure = $derived(
		aggregation === 'sum' ? m.measure_energy() : aggregation === 'mean' ? m.measure_mean_power() : m.measure_max_power()
	);

	// For single scenario mode (backwards compatibility)
	let chartData = $derived(
		normalizedScenarios.length === 1
			? (allYearsData || []).map((d) => ({
					timestamp:
						typeof d.period === 'string'
							? new Date(d.period).getFullYear()
							: d.period instanceof Date
								? d.period.getFullYear()
								: d.period,
					total: d.value || d.total || 0
				}))
			: []
	);

	// For comparison mode - merge data from multiple scenarios
	let comparisonData = $derived(
		normalizedScenarios.length > 1
			? mergeScenarioData(
					Object.fromEntries(
						Object.entries(dataByScenario).map(([scenarioId, data]) => [
							scenarioId,
							data.map((d) => ({
								timestamp:
									typeof d.period === 'string'
										? new Date(d.period)
										: d.period instanceof Date
											? d.period
											: new Date(d.period),
								value: d.value || d.total || 0
							}))
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

	$effect(() => {
		// Trigger fetch when scenarios, parameters, or segment change
		// Include all dependencies to trigger refetch
		if (normalizedScenarios.length > 0 && geography && aggregation && baseScenario) {
			// Access parameterValues and segment to create dependency
			const _params = parameterValues;
			const _seg = segment;
			fetchChartData();
		}
	});

	async function fetchChartData() {
		if (!geography || !aggregation) {
			error = m.error_missing_params();
			return;
		}

		try {
			loading = true;
			error = null;

			const startYear = 2025;
			const endYear = 2050;

			if (normalizedScenarios.length === 1) {
				// Single scenario mode - use Strategy 2 parameters
				const query = makeDemandQuery({
					start: String(startYear),
					end: String(endYear + 1),
					resolution: '1Y',
					aggregation,
					geography,
					segment,
					baseScenario: baseScenario,
					parameterValues: parameterValues
				});

				const data = await fetchDemandData(query);
				allYearsData = data;
			} else {
				// Comparison mode - fetch data for each scenario (without parameters for now)
				const fetchPromises = normalizedScenarios.map(async (scenario) => {
					const scenarioId = scenario.id || scenario.scenario_id || 'default';
					const query = makeDemandQuery({
						start: String(startYear),
						end: String(endYear + 1),
						resolution: '1Y',
						aggregation,
						geography,
						segment,
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
			error = err?.message || m.error_unexpected();
			console.error('Error fetching chart data:', err);
			allYearsData = [];
			dataByScenario = {};
		} finally {
			loading = false;
		}
	}

	// Domain calculations for single scenario mode - always show full range 2025-2045
	let xMin = $derived(
		chartData.length > 0
			? Math.min(...chartData.map((d) => d.timestamp))
			: comparisonData.length > 0
				? Math.min(...comparisonData.map((d) => d.timestamp.getFullYear()))
				: 2025
	);
	let xMax = $derived(
		chartData.length > 0
			? Math.max(...chartData.map((d) => d.timestamp))
			: comparisonData.length > 0
				? Math.max(...comparisonData.map((d) => d.timestamp.getFullYear()))
				: 2045
	);
	let yMin = $derived(
		chartData.length > 0
			? Math.min(...chartData.map((d) => d.total))
			: comparisonData.length > 0
				? Math.min(...comparisonData.flatMap((d) => Object.values(d.values)))
				: 0
	);
	let yMax = $derived(
		chartData.length > 0
			? Math.max(...chartData.map((d) => d.total))
			: comparisonData.length > 0
				? Math.max(...comparisonData.flatMap((d) => Object.values(d.values)))
				: 1000
	);

	let defaultTooltipData = $derived(chartData.find((d) => d.timestamp === xMax));

	// Prepare export metadata
	let exportMetadata = $derived({
		chartType: 'area-timeseries',
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

</script>

<ChartContainer
	title={m.yearly_chart_title({ measure: titleMeasure })}
	{description}
	sizeVariant="none"
	aspectRatio="auto"
	metadata={exportMetadata}
	chartData={exportData}
	{exportable}
	{headerControls}
	exportPadding={{ top: 24, bottom: 16 }}
	class={className}
	{contentClass}
>
	<div class={height}>
	{#if loading}
		<LoadingSkeleton variant="chart" message={m.loading_timeseries()} />
	{:else if error}
		<ErrorState message={m.error_load_timeseries()} details={error} onRetry={fetchChartData} />
	{:else if chartData.length === 0 && comparisonData.length === 0}
		<EmptyState message={m.no_data_available()} description={m.no_yearly_data()} />
	{:else if normalizedScenarios.length === 1}
		<!-- Single scenario mode -->
        <AreaChart
            data={chartData}
            x="timestamp"
            y="total"
            padding={CHART_PADDING.standard}
            xDomain={xMin === xMax ? [xMin,xMax+1] : [xMin,xMax]}
            yDomain={xMin === xMax ? [yMin,yMax*1.1] : [yMin,yMax]}
            grid={false}
            props={({
				...getTimeSeriesAxisConfig(displayAxes, aggregation),
				line: { fill: 'none', stroke: viz.teal[900], strokeWidth: 2 },
				area: { fill: viz.teal[500], fillOpacity: 0.3 },
				highlight: {
					lines: { class: 'stroke-black [stroke-width:1.5px] [stroke-dasharray:6_4]' },
					axis: 'both',
					points: { class: '!fill-transparent !stroke-black ![stroke-width:1.5px]' }
				},
				rule: { class: 'stroke-black [stroke-width:1.5px]' }
			}) as any}
            {...(xMin === xMax ? { points: true } : {})}
        >
            <svelte:fragment slot="tooltip" let:x let:y let:height let:padding>
                <Tooltip.Root
                    x={padding.left}
                    y="data"
                    anchor="right"
                    contained={false}
                    class="text-[10px] font-semibold text-white bg-chart-900 mt-[2px] px-1 py-[2px] border border-chart-900 rounded whitespace-nowrap"
                    let:data
                >
                    {formatNumber(y(data ?? defaultTooltipData), getEnergyPrefix(), 'Wh')}
                </Tooltip.Root>
                <Tooltip.Root
                    x="data"
                    y={height}
                    anchor="top"
                    class="text-[10px] font-semibold text-white bg-chart-900 mt-[2px] px-2 py-[2px] border border-chart-900 rounded whitespace-nowrap"
                    contained={false}
                    let:data
                >
                    {x(data ?? defaultTooltipData)}
                </Tooltip.Root>
            </svelte:fragment>
        </AreaChart>
	{:else if normalizedScenarios.length > 1}
		<!-- Comparison mode - multiple scenarios -->
		{@const hasRequiredFields = comparisonData.length > 0 &&
			comparisonData.every(d => d && d.timestamp && d.values) &&
			normalizedScenarios.every(s => {
				const sid = s.id || s.scenario_id;
				return sid && comparisonData.every(d => d.values && typeof d.values[sid] !== 'undefined');
			})}
		{#if hasRequiredFields}
		{@const transformedData = comparisonData.map((d) => ({
				timestamp: d.timestamp.getFullYear(),
				...d.values
			}))}
		{@const series = normalizedScenarios.map(scenario => {
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
			data={transformedData}
			x="timestamp"
			{series}
			padding={CHART_PADDING.standard}
			xDomain={xMin === xMax ? [xMin, xMax + 1] : [xMin, xMax]}
			yDomain={xMin === xMax ? [yMin, yMax * 1.1] : [yMin, yMax]}
			grid={false}
			props={({
				...getTimeSeriesAxisConfig(displayAxes, aggregation),
				highlight: {
					lines: { class: 'stroke-black [stroke-width:1.5px] [stroke-dasharray:6_4]' },
					axis: 'both',
					points: { class: '!fill-transparent !stroke-black ![stroke-width:1.5px]' }
				},
				rule: { class: 'stroke-black [stroke-width:1.5px]' }
			}) as any}
			{...(xMin === xMax ? { points: true } : {})}
		>

			<svelte:fragment slot="tooltip" let:x let:y let:height let:padding let:data>
				{#if data}
				<Tooltip.Root
					x="data"
					y={height}
					anchor="top"
					class="text-[10px] font-semibold text-white bg-chart-900 mt-[2px] px-2 py-[2px] border border-chart-900 rounded whitespace-nowrap"
					contained={false}
				>
					{x(data)}
				</Tooltip.Root>
				{/if}
				{#each normalizedScenarios as scenario}
					{@const scenarioId = scenario.id || scenario.scenario_id || ''}
					{@const value = data?.[scenarioId]}
					{#if value !== undefined}
						<Tooltip.Root
							x={padding.left}
							y={y({ [scenarioId]: value })}
							anchor="right"
							contained={false}
							class="text-[10px] font-semibold text-white bg-chart-900 mt-[2px] px-1 py-[2px] border border-chart-900 rounded whitespace-nowrap"
						>
							{scenario.name}: {formatNumber(value, getEnergyPrefix(), 'Wh')}
						</Tooltip.Root>
					{/if}
				{/each}
			</svelte:fragment>
		</AreaChart>
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

