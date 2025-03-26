<script lang="ts">
    import { BarChart, Tooltip } from 'layerchart';
    import { formatNumber } from '$lib/utilities';
    import { fetchYearly } from '$lib/dataService';

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

    let { yearData, parameterData, year, geography, scenario } = $props();

    $effect(async () => {
        fetchYearly(`${API_BASE_URL}/demand?geography=${'all'}&resolution=1YE&sector=all&aggregation=${'sum'}&year=${year}&growth=${scenario.growth}`)
        .then(data => { yearData = data; })
        .catch(error => console.error('Error fetching all years data:', error.message));
    });

    let chartData = $derived(yearData
        .filter(d => d.geography !== '00')
        .map(d => ({ ...d, name: parameterData.geographies.find(g => g.geo_id === d.geography).geo_name }))
        .sort((a, b) => b.total - a.total)
    );
    
</script>

<div class="h-[300px]">
    <span class="text-sm">Årlig energiförbrukning</span>
    <BarChart
        data={chartData}
        x="name"
        y="total"
        props={{
            xAxis: { tweened: true, tickLabelProps: { rotate: 315, textAnchor: 'end' } },
            yAxis: { format: "metric", tweened: true },
            bars: {tweened: true, radius: 2, stroke: 'none' },
            }}
    >
    </BarChart>
</div>