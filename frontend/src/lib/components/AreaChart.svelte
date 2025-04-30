<script lang="ts">
    import { Button, ButtonGroup, ToggleGroup, ToggleOption, Radio } from 'svelte-ux';
    import { AreaChart, Tooltip } from 'layerchart';
    import { Sigma, UnfoldVertical, ArrowUpToLine } from 'lucide-svelte';
    import { formatNumber } from '$lib/utilities';
    import { fetchAllYears } from '$lib/dataService';

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

    let { geography, year, aggregationInit, allYearsData, scenario, displayAxes = true, showAggregations = true } = $props();

    let aggregation = $state(aggregationInit);

    let titleMeasure = $derived(
        aggregation === "sum"
            ? "energi"
            : aggregation === "mean"
            ? "medeleffekt"
            : "maxeffekt"
    );

    $effect(async () => {
        fetchAllYears(`${API_BASE_URL}/demand?geography=${geography}&resolution=1YE&sector=all&aggregation=${aggregation}&year=all&growth=${scenario.growth}`)
        .then(data => { allYearsData = data; })
        .catch(error => console.error('Error fetching all years data:', error.message));
    });

    let xMin = $derived(Math.min(...allYearsData.filter(d => d.timestamp <= year).map(d => d.timestamp)));
    let xMax = $derived(Math.max(...allYearsData.filter(d => d.timestamp <= year).map(d => d.timestamp)));
    let yMin = $derived(Math.min(...allYearsData.filter(d => d.timestamp <= year).map(d => d.total)));
    let yMax = $derived(Math.max(...allYearsData.filter(d => d.timestamp <= year).map(d => d.total)));

    let defaultTooltipData = $derived(allYearsData.find(d => d.timestamp === xMax));
    
</script>

<div class="flex flex-col h-full">
    <div class="mb-4">
        <span class="text-sm">Årlig {titleMeasure} 2025-2045</span>
    </div>
    <AreaChart
        data={allYearsData.filter(d => d.timestamp <= year)}
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

