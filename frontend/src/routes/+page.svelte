<script lang="ts">
    import Mapbox from '$lib/components/MapBox.svelte';
    import Controls from '$lib/components/Controls.svelte';
    import Legend from '$lib/components/Legend.svelte';
    import TimeLine from '$lib/components/TimeLine.svelte';
    import { fetchGeoJSON, fetchCSV } from '$lib/dataService';
    import { Card } from 'svelte-ux';

    export let data;

    // Initialize variables with preloaded data
    let { parameterData, selectedYear, geography, resolution, sector, aggregation, geojsonData, chartData, minDemandValue, maxDemandValue } = data;
    let chartType: 'line' | 'area' | 'bar' = 'area'; // Initialize chartType with a default value

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

    // Fetch updated data locally when inputs change
    async function updateChartdata() {
        try {
            chartData = await fetchCSV(`${API_BASE_URL}/demand_t?geography=${geography}&resolution=${resolution}&sector=${sector}&aggregation=${aggregation}&year=${selectedYear}`);
        } catch (error) {
            console.error('Error updating data:', error.message);
        }
    }

    async function updateMapdata() {
        try {
            geojsonData = await fetchGeoJSON(`${API_BASE_URL}/geojson?resolution=1YE&sector=${sector}&aggregation=all&year=${selectedYear}`);
        } catch (error) {
            console.error('Error updating data:', error.message);
        }

    }

    // Watch for changes and trigger data updates
    $: if (selectedYear) {
        updateMapdata();
    }
    $: if (selectedYear && geography && resolution && aggregation) {
        updateChartdata();
    }

</script>

<div class="flex h-full">
    <!-- Left Column -->
    <div class="flex flex-col w-1/2 space-y-4 pl-8 p-4 pt-0 bg-surface-100 text-surface-content drop-shadow-lg shadow-black">
        <Card class="p-4 rounded-sm">
            <TimeLine {resolution} {aggregation} {chartData} bind:chartType />
        </Card>
    </div>

    <!-- Right Column -->
    <div class="flex-grow relative rounded-sm">
        <div class="absolute rounded-sm z-10 top-4 left-4">
            <Controls
                {parameterData}
                bind:selectedYear
                bind:chartType
                bind:geography
                bind:resolution
                bind:aggregation
            />
        </div>
        <div class="absolute z-10 bottom-8 right-4 legend-overlay">
            <Legend {minDemandValue} {maxDemandValue} />
        </div> 
        <Mapbox 
            geojsonData={geojsonData} 
            minDemandValue={minDemandValue} 
            maxDemandValue={maxDemandValue}
        />
    </div>
</div>
