<script lang="ts">
    import { BarChart, Tooltip } from 'layerchart';
    import { formatNumber, makeDemandQuery } from '$lib/utilities';
    import { fetchDemandData } from '$lib/dataService';

    let { yearData = [], parameterData, year, geography, scenario } = $props();
    let loading = $state(false);
    let error = $state(null);

    $effect(() => {
        if ((!yearData || yearData.length === 0) && year && scenario) { // Only fetch if no data provided
            fetchGeoData();
        }
    });

    async function fetchGeoData() {
        try {
            loading = true;
            error = null;

            const query = makeDemandQuery({
                start: String(year),
                end: String(year + 1),
                resolution: '1Y',
                aggregation: 'sum',
                geography: 'all', // Get all geographies
                segment: 'housing', // Default segment
                scenarioId: scenario?.id || scenario?.scenario_id || 'default'
            });

            const data = await fetchDemandData(query);
            yearData = data;
        } catch (err) {
            error = err.message;
            console.error('Error fetching geo data:', err);
            yearData = []; // Fallback to empty array
        } finally {
            loading = false;
        }
    }

    let chartData = $derived(
        (yearData || [])
            .filter(d => d.geography !== '00')
            .map(d => ({
                ...d,
                total: d.value || d.total || 0,
                name: parameterData?.geographies?.find(g => g.geo_id === d.geography)?.geo_name || d.geography
            }))
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