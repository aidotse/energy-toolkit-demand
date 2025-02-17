<script lang="ts">
    import { AreaChart, LineChart, BarChart } from 'layerchart';
    import { ButtonGroup, Button } from 'svelte-ux';
    import { ChartLine, ChartArea, ChartColumn } from 'lucide-svelte';

    let { resolution, aggregation, timeseriesData, chartType = $bindable()} = $props();

</script>

<div class="h-[300px] ml-8 mb-14 mr-2 mt-1">
    <div class="flex justify-end mb-4">
        <!-- Chart Type Selector -->
        <ButtonGroup>
            <Button 
                class="mx-px text-xs"
                variant="fill-light"
                color="primary"
                on:click={() => (chartType = 'area')} 
                active={chartType === 'area'}
            >
                <ChartArea />
            </Button>
            <Button 
                class="mx-px text-xs"
                variant="fill-light"
                color="primary"
                on:click={() => (chartType = 'line')} 
                active={chartType === 'line'}
            >
                <ChartLine />
            </Button>
            <Button 
                class="mx-px text-xs"
                variant="fill-light"
                color="primary"
                on:click={() => (chartType = 'bar')} 
                active={chartType === 'bar'}
                disabled={resolution !== '1W' && resolution !== '1ME'}
            >
                <ChartColumn />
            </Button>
        </ButtonGroup>
    </div>
    {#if chartType === 'line'}
        <LineChart
            data={timeseriesData}
            series={[
                { name: "Total", key: "total", color: "#47B3FF" },
                { name: "Buildings", key: "buildings", color: "#EEB902" },
                { name: "Industry", key: "industry", color: "#07ED7A"},
                { name: "Transport", key: "transport", color: "#47B3FF"}
            ]}
            x="timestamp"
            y={["total", "buildings", "industry", "transport"]}
        />
    {:else if chartType === 'area'}
        <AreaChart
            data={timeseriesData}
            series={[
                { name: "Buildings", key: "buildings", color: "#EEB902" },
                { name: "Industry", key: "industry", color: "#07ED7A" },
                { name: "Transport", key: "transport", color: "#47B3FF" }
            ]}
            x="timestamp"
            seriesLayout="stack"
        />
    {:else if chartType === 'bar'}
        <BarChart
            data={timeseriesData}
            series={[
                { name: "Buildings", key: "buildings", color: "#EEB902" },
                { name: "Industry", key: "industry", color: "#07ED7A" },
                { name: "Transport", key: "transport", color: "#47B3FF" }
            ]}
            x="timestamp"
            seriesLayout="stack"
            props={{
                xAxis: { tweened: true },
                yAxis: { format: "metric", tweened: true },
                bars: {tweened: true, radius: 2, stroke: 'none' },
                }}    
        />
    {/if}
</div>