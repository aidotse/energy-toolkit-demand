<script lang="ts">
    import AreaChart from '$lib/components/AreaChart.svelte';
    import TimeLine from '$lib/components/TimeLine.svelte';
    import SectorArc from '$lib/components/SectorArc.svelte';
    import Histogram from '$lib/components/Histogram.svelte';
	import type { PageProps } from './$types';
    import Sidebar from '$lib/components/sidebar/Sidebar.svelte';
    import Scenario from '$lib/components/sidebar/Scenario.svelte';
    import * as m from '$paraglide/messages';

    let { data }: PageProps = $props();
    const { config, scenarios, parameterData, globalsData, geojsonData }  = data;
	let { year, geography, sector, hourData, dayData, yearData, allYearsData } = $state(data);

    let toggleControls = $state(true);
    let scenario = $state(scenarios.find((s: any) => s.default));
</script>

<div class="max-w-7xl mx-auto pt-16">
    <Sidebar {toggleControls}>
        <svelte:fragment slot="scenario">
            <Scenario {config} bind:scenario {scenarios} />
        </svelte:fragment>
    </Sidebar>
    <h1 class="text-3xl font-bold pt-8 pb-4">{m['graphs_page']()}</h1>
    <div class="flex flex-row gap-16">
        <p class="w-[60%]">
            Här har vi samlat alla visualiseringar i en dashboard för att göra det enkelt att kopiera grafer och förklaringar till presentationer andra sammanhang
            där dessa scenarior är användbara.
        </p>
        <div class="w-[40%] p-4 border">
            <h3 class="font-bold">Attribuering</h3>
            <p>Something something something mention the project...</p>
        </div>
    </div>
    <div class="grid grid-cols-2 gap-16 my-8">
        <div class="min-w-[300px] aspect-square">
            <AreaChart {geography} {year} {scenario} aggregationInit='sum' {allYearsData} />
        </div>
        <SectorArc {yearData} {geography} {year} {scenario} />
        <TimeLine {dayData} {geography} resolution='1d' {sector} aggregation='sum' {year} {scenario} />
        <Histogram {hourData} {geography} resolution='1h' {sector} aggregation='mean' {year} {scenario} />
    </div>
</div>
