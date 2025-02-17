<script lang="ts">
    import { Button, ButtonGroup } from 'svelte-ux';
    import { AreaChart, Tooltip } from 'layerchart';
    import { Sigma, UnfoldVertical, ArrowUpToLine } from 'lucide-svelte';
    import { formatNumber } from '$lib/utilities';
    import { fetchAllYears } from '$lib/dataService';

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

    let { geography, aggregationInit, allYearsData } = $props();

    let aggregation = $state(aggregationInit);

    let titleMeasure = $derived(
        aggregation === "sum"
            ? "energi"
            : aggregation === "mean"
            ? "medeleffekt"
            : "maxeffekt"
    );

    $effect(async () => {
        fetchAllYears(`${API_BASE_URL}/demand?geography=${geography}&resolution=1YE&sector=all&aggregation=${aggregation}&year=all`)
        .then(data => { allYearsData = data; })
        .catch(error => console.error('Error fetching all years data:', error.message));
    });



</script>

<div class="h-full">
    <div class="flex flex-row justify-between mb-4">
        <span class="text-sm">Årlig {titleMeasure} 2025-2045</span>
        <!-- Aggregation selector -->
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
                on:click={() => (aggregation = 'mean')} 
                active={aggregation === 'mean'}
            >
                <UnfoldVertical size={20} />
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
    <AreaChart
        data={allYearsData}
        x="year"
        y="total"
        yDomain={[Math.min(...allYearsData.map(d => d.total)), Math.max(...allYearsData.map(d => d.total))]}
        props={{
            xAxis: { format: value => String(value), ticks: (scale) => scale.domain() },
            yAxis: { format: num => formatNumber(num, 'M', aggregation === 'sum' ? 'Wh' : 'W'), ticks: (scale) => scale.domain() }
        }}
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
            {formatNumber(y(data),'M','Wh')}
            </Tooltip.Root>
    
            <Tooltip.Root
            x="data"
            y={height}
            anchor="top"
            class="text-[10px] font-semibold text-primary bg-surface-100 mt-[2px] px-2 py-[2px] border border-primary rounded whitespace-nowrap"
            contained={false}
            let:data
            >
            {x(data)}
            </Tooltip.Root>
        </svelte:fragment>  
    </AreaChart>
</div>

