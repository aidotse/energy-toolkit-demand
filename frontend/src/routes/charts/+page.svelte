<script lang="ts">
    import Mapbox from '$lib/components/MapBox.svelte';
    import Controls from '$lib/components/Controls.svelte';
    import Legend from '$lib/components/Legend.svelte';
    import AreaChart from '$lib/components/AreaChart.svelte';
    import TimeLine from '$lib/components/TimeLine.svelte';
    import SectorArc from '$lib/components/SectorArc.svelte';
    import Histogram from '$lib/components/Histogram.svelte';
    import { fetchTimeseries, fetchYearly, fetchAllYears, calculateSectorData, calculateHistogram } from '$lib/dataService';
	import type { PageProps } from './$types';

    let { data }: PageProps = $props();
    const { API_BASE_URL, parameterData, geojsonData, minDemandValue, maxDemandValue }  = data;
	let { year, geography, resolution, sector, aggregation, timeseriesData, yearlyData, allYearsData, sectorData, histogramData } = $state(data);
    let chartType: 'line' | 'area' | 'bar' = $state('area');
    let toggleControls = $state(true);

    $effect(async () => {
        try {
            timeseriesData = await fetchTimeseries(`${API_BASE_URL}/demand_t?geography=${geography}&resolution=${resolution}&sector=${sector}&aggregation=${aggregation}&year=${year}`);
        } catch (error) {
            console.error('Error updating data:', error.message);
        }
    });

    $effect(async () => {
        try {
            yearlyData = await fetchYearly(`${API_BASE_URL}/demand?geography=${'all'}&resolution=1YE&sector=all&aggregation=${'sum'}&year=${year}`);
        } catch (error) {
            console.error('Error updating data:', error.message);
        }
    });

    $effect(async () => {
        fetchAllYears(`${API_BASE_URL}/demand?geography=${geography}&resolution=${resolution}&sector=${sector}&aggregation=${aggregation}&year=all`)
        .then(data => { allYearsData = data; })
        .catch(error => console.error('Error fetching all years data:', error.message));
    });

    $effect(async () => {
        const yrlData = await yearlyData;
        sectorData = calculateSectorData(yrlData, geography)
    });
    
    $effect(async () => {
        const tsData = await timeseriesData;
        histogramData = calculateHistogram(tsData, 'total', 50)
    })

</script>

<div class="max-w-7xl mx-auto pt-16">
    <h1 class="text-3xl font-bold pt-8 pb-4">Data & visualiseringar</h1>
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
            <AreaChart {allYearsData} />
        </div>
        <SectorArc {sectorData} />
        <TimeLine {resolution} {aggregation} {timeseriesData} bind:chartType />
        <Histogram {histogramData} />


    </div>
</div>
