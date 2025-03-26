<script lang="ts">
    import { BarChart } from 'layerchart';
    import { fetchTimeseries, calculateHistogram } from '$lib/dataService';

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

    let { hourData, geography, resolution, sector, aggregation, year, scenario } = $props();

    $effect(async () => {
        try {
            hourData = await fetchTimeseries(`${API_BASE_URL}/demand_t?geography=${geography}&resolution=${resolution}&sector=${sector}&aggregation=${aggregation}&year=${year}&growth=${scenario.growth}`);
        } catch (error) {
            console.error('Error updating data:', error.message);
        }
    });

    let histogramData = $derived(calculateHistogram(hourData, 'total', 50));

</script>
<div class="flex flex-col">
    <span class="text-sm">Histogram över elbehovet</span>
    <div class="h-[300px] ml-8 mb-14 mr-2 mt-1">
        <BarChart
            data={histogramData}
            x="x0"
            y="length"
            bandPadding={0.2}
            props={{
            xAxis: { tweened: true },
            yAxis: { format: "metric", tweened: true },
            bars: {tweened: true, radius: 2, stroke: 'none' },
            }}    
        />
    </div>
</div>