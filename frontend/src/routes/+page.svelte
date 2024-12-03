<script lang="ts">
    import Mapbox from '$lib/components/MapBox.svelte';
    import TimeLine from '$lib/components/TimeLine.svelte';
    import { fetchGeoJSON, fetchCSV } from '$lib/dataService';
    import { Card, RangeField, SelectField, ButtonGroup, Button } from 'svelte-ux';
    import Legend from '$lib/components/Legend.svelte'; // Import Legend component

    export let data;

    // Initialize variables with preloaded data
    let { parameterData, selectedYear, geography, resolution, geojsonData, chartData, minDemandValue, maxDemandValue } = data;

    const options = parameterData.geographies.map((geo) => ({
        label: geo.name, // The text displayed in the dropdown
        value: geo.id,   // The value associated with the option
    })).sort((a, b) => a.label.localeCompare(b.label, 'sv')); // Sort alphabetically by label

    // Set first and last year in range
    const minYear:number = Math.min(...parameterData.years);
    const maxYear:number = Math.max(...parameterData.years);

    // Set available resolutions
    const resolutions = parameterData.resolutions;

    // Fetch updated data locally when inputs change
    async function updateData() {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

        const geojsonPath = `${API_BASE_URL}/api/geojson?year=${selectedYear}`;
        const csvPath = `${API_BASE_URL}/api/demand_t?geography=${geography}&resolution=${resolution}&year=${selectedYear}`;

        try {
            geojsonData = await fetchGeoJSON(geojsonPath);
            chartData = await fetchCSV(csvPath);
        } catch (error) {
            console.error('Error updating data:', error.message);
        }
    }

    // Watch for changes in `selectedYear` and trigger data updates
    $: if (selectedYear && geography && resolution) {
        updateData();
    }
</script>

<div class="flex h-full">
    <!-- Left Column -->
    <div class="flex flex-col w-1/2 space-y-4 pl-8 p-4 bg-surface-100 text-surface-content drop-shadow-lg shadow-black">
        <Card class="p-4">
            <TimeLine {chartData} />
        </Card>
    </div>

    <!-- Right Column -->
    <div class="flex-grow relative">
        <div class="absolute z-10 top-4 left-4">
            <Card class="p-4">
                <RangeField class="my-1" value={selectedYear} on:change={(e) => selectedYear = e.detail.value} min={minYear} max={maxYear} step={1} />
                <SelectField class="my-1" {options} bind:value={geography} clearable={false} />
                <ButtonGroup class="my-1">
                    {#each resolutions as res}
                        <Button class="mx-px" variant="fill-light" color="primary" on:click={() => resolution = res} active={resolution === res}>{res}</Button>
                    {/each}
                </ButtonGroup>        
            </Card>
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
