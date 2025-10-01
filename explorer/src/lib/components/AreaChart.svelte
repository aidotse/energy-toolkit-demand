<script lang="ts">
    import { Button, ButtonGroup, ToggleGroup, ToggleOption, Radio } from 'svelte-ux';
    import { AreaChart, Tooltip } from 'layerchart';
    import { Sigma, UnfoldVertical, ArrowUpToLine } from 'lucide-svelte';
    import { formatNumber, makeDemandQuery } from '$lib/utilities';
    import { fetchDemandData } from '$lib/dataService';

    let { geography, year, aggregationInit, allYearsData = [], scenario, displayAxes = true, showAggregations = true } = $props();

    let aggregation = $state(aggregationInit);
    let loading = $state(false);
    let error = $state(null);

    let titleMeasure = $derived(
        aggregation === "sum"
            ? "energi"
            : aggregation === "mean"
            ? "medeleffekt"
            : "maxeffekt"
    );

    // Transform API data to expected format (already aggregated by server)
    let chartData = $derived(
        (allYearsData || []).map(d => ({
            timestamp: typeof d.period === 'string' ? new Date(d.period).getFullYear() :
                      d.period instanceof Date ? d.period.getFullYear() :
                      d.timestamp?.getFullYear?.() || d.timestamp || d.period,
            total: d.value || d.total || 0
        }))
    );

    // Reactive data fetching when parameters change
    $effect(() => {
        if (!allYearsData || allYearsData.length === 0) { // Only fetch if no data provided
            fetchChartData();
        }
    });

    async function fetchChartData() {
        try {
            loading = true;
            error = null;

            const startYear = 2025;
            const endYear = 2035; // Reduced range for performance

            const query = makeDemandQuery({
                start: String(startYear),
                end: String(endYear + 1),
                resolution: '1Y',
                aggregation,
                geography,
                segment: 'housing', // Default segment
                scenarioId: scenario?.id || scenario?.scenario_id || 'default'
            });

            const data = await fetchDemandData(query);
            allYearsData = data;
        } catch (err: any) {
            error = err?.message || 'Unknown error';
            console.error('Error fetching chart data:', err);
            allYearsData = []; // Fallback to empty array
        } finally {
            loading = false;
        }
    }

    let xMin = $derived(chartData.length > 0 ? Math.min(...chartData.filter(d => d.timestamp <= year).map(d => d.timestamp)) : year);
    let xMax = $derived(chartData.length > 0 ? Math.max(...chartData.filter(d => d.timestamp <= year).map(d => d.timestamp)) : year);
    let yMin = $derived(chartData.length > 0 ? Math.min(...chartData.filter(d => d.timestamp <= year).map(d => d.total)) : 0);
    let yMax = $derived(chartData.length > 0 ? Math.max(...chartData.filter(d => d.timestamp <= year).map(d => d.total)) : 1000);

    let defaultTooltipData = $derived(chartData.find(d => d.timestamp === xMax));
    
</script>

<div class="flex flex-col h-full">
    <div class="mb-4">
        <span class="text-sm">Årlig {titleMeasure} 2025-2045</span>
        {#if loading}
            <span class="text-xs text-gray-500 ml-2">Laddar...</span>
        {/if}
        {#if error}
            <span class="text-xs text-red-500 ml-2">Fel: {error}</span>
        {/if}
    </div>

    {#if loading}
        <div class="flex items-center justify-center h-64 bg-gray-50 rounded">
            <span class="text-gray-500">Laddar data...</span>
        </div>
    {:else if error}
        <div class="flex items-center justify-center h-64 bg-red-50 rounded">
            <span class="text-red-600">Kunde inte ladda data</span>
        </div>
    {:else if chartData.length === 0}
        <div class="flex items-center justify-center h-64 bg-gray-50 rounded">
            <span class="text-gray-500">Ingen data tillgänglig</span>
        </div>
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

