<script lang="ts">
	/**
	 * AreaChart Component - Yearly time series area chart
	 *
	 * Standardized chart component following ChartComponent interface patterns.
	 * Displays yearly electricity demand trends with aggregation switching.
	 *
	 * @component
	 */
	import { Button, ButtonGroup } from 'svelte-ux';
	import { AreaChart, Tooltip } from 'layerchart';
	import { Sigma, ArrowUpToLine } from 'lucide-svelte';
	import { formatNumber, makeDemandQuery } from '$lib/utilities';
	import { fetchDemandData } from '$lib/dataService';
	import LoadingSkeleton from '$lib/components/shared/LoadingSkeleton.svelte';
	import ErrorState from '$lib/components/shared/ErrorState.svelte';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import type { TimeSeriesChartProps } from '$lib/types/ChartComponent.interface';

	let {
		data: allYearsData = [],
		geography,
		year,
		aggregation: aggregationInit = 'sum',
		scenario,
		displayAxes = true,
		showAggregations = true,
		class: className = ''
	}: TimeSeriesChartProps & {
		displayAxes?: boolean;
		showAggregations?: boolean;
		class?: string;
	} = $props();

	let aggregation = $state(aggregationInit);
	let loading = $state(false);
	let error = $state<string | null>(null);

	let titleMeasure = $derived(
		aggregation === 'sum' ? 'energi' : aggregation === 'mean' ? 'medeleffekt' : 'maxeffekt'
	);

	let chartData = $derived(
		(allYearsData || []).map((d) => ({
			timestamp:
				typeof d.period === 'string'
					? new Date(d.period).getFullYear()
					: d.period instanceof Date
						? d.period.getFullYear()
						: d.timestamp?.getFullYear?.() || d.timestamp || d.period,
			total: d.value || d.total || 0
		}))
	);

	$effect(() => {
		if (!allYearsData || allYearsData.length === 0) {
			fetchChartData();
		}
	});

	async function fetchChartData() {
		try {
			loading = true;
			error = null;

			const startYear = 2025;
			const endYear = 2035;

			const query = makeDemandQuery({
				start: String(startYear),
				end: String(endYear + 1),
				resolution: '1Y',
				aggregation,
				geography,
				segment: 'housing',
				scenarioId: scenario?.id || scenario?.scenario_id || 'default'
			});

			const data = await fetchDemandData(query);
			allYearsData = data;
		} catch (err: any) {
			error = err?.message || 'Ett oväntat fel inträffade';
			console.error('Error fetching chart data:', err);
			allYearsData = [];
		} finally {
			loading = false;
		}
	}

	let xMin = $derived(
		chartData.length > 0
			? Math.min(...chartData.filter((d) => d.timestamp <= (year || 2045)).map((d) => d.timestamp))
			: year || 2025
	);
	let xMax = $derived(
		chartData.length > 0
			? Math.max(...chartData.filter((d) => d.timestamp <= (year || 2045)).map((d) => d.timestamp))
			: year || 2045
	);
	let yMin = $derived(
		chartData.length > 0
			? Math.min(...chartData.filter((d) => d.timestamp <= (year || 2045)).map((d) => d.total))
			: 0
	);
	let yMax = $derived(
		chartData.length > 0
			? Math.max(...chartData.filter((d) => d.timestamp <= (year || 2045)).map((d) => d.total))
			: 1000
	);

	let defaultTooltipData = $derived(chartData.find((d) => d.timestamp === xMax));
</script>

<div class="flex flex-col h-full @container {className}">
	<div class="mb-4">
		<span class="text-sm font-medium">Årlig {titleMeasure} 2025-2045</span>
	</div>

	{#if loading}
		<LoadingSkeleton variant="chart" message="Laddar tidsseriedata..." />
	{:else if error}
		<ErrorState message="Kunde inte ladda tidsserie" details={error} onRetry={fetchChartData} />
	{:else if chartData.length === 0}
		<EmptyState message="Ingen data tillgänglig" description="Ingen årsdata finns tillgänglig" />
	{:else}
        <AreaChart
            data={chartData.filter(d => d.timestamp <= year)}
            x="timestamp"
            y="total"
            xDomain={xMin === xMax ? [xMin,xMax+1] : [xMin,xMax]}
            yDomain={xMin === xMax ? [yMin,yMax*1.1] : [yMin,yMax]}
            props={{
                xAxis: displayAxes ? { format: value => String(value), ticks: (scale) => scale.domain() } : { ticks: [], labels: false, line: false },
                yAxis: displayAxes ? { format: num => formatNumber(num, 'M', aggregation === 'sum' ? 'Wh' : 'W'), ticks: (scale) => scale.domain() } : { ticks: [], labels: false, line: false },
                grid: { x: false, y: displayAxes ? true : false }
            }}
            {...(xMin === xMax ? { points: true } : {})}
        >

            <svelte:fragment slot="tooltip" let:x let:y let:height let:padding>
                <Tooltip.Root
                    x={padding.left}
                    y="data"
                    anchor="right"
                    contained={false}
                    class="text-[10px] font-semibold text-primary bg-surface-100 mt-[2px] px-1 py-[2px] border border-primary rounded whitespace-nowrap"
                    let:data
                >
                    {formatNumber(y(data ?? defaultTooltipData), 'M', 'Wh')}
                </Tooltip.Root>
                <Tooltip.Root
                    x="data"
                    y={height}
                    anchor="top"
                    class="text-[10px] font-semibold text-primary bg-surface-100 mt-[2px] px-2 py-[2px] border border-primary rounded whitespace-nowrap"
                    contained={false}
                    let:data
                >
                    {x(data ?? defaultTooltipData)}
                </Tooltip.Root>
            </svelte:fragment>
        </AreaChart>
    {/if}
    {#if showAggregations}
        <div class="mt-4">
            <ButtonGroup>
                <Button 
                    class="mx-px"
                    variant="fill-light"
                    color="primary"
                    on:click={() => (aggregation = 'sum')} 
                    active={aggregation === 'sum'}
                >
                    <Sigma size={20} />
                </Button>
                <Button 
                    class="mx-px"
                    variant="fill-light"
                    color="primary"
                    on:click={() => (aggregation = 'max')} 
                    active={aggregation === 'max'}
                >
                    <ArrowUpToLine size={20} />
                </Button>
            </ButtonGroup>            
        </div>
    {/if}

</div>

