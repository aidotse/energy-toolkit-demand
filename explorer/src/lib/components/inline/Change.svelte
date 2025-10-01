<script lang="ts">
    import { fetchDemandData } from '$lib/dataService';
    import { makeDemandQuery } from '$lib/utilities';

    let {geography, aggregation, scenario, startYear, year, allYearsData = [], percentage} = $props();
    let loading = $state(false);
    let error = $state(null);
    let hasFetched = $state(false);

    // Transform data to expected format (already aggregated by server)
    let transformedData = $derived(
        (allYearsData || []).map(d => ({
            timestamp: typeof d.period === 'string' ? new Date(d.period).getFullYear() :
                      d.period instanceof Date ? d.period.getFullYear() :
                      d.timestamp?.getFullYear?.() || d.timestamp || d.period,
            total: d.value || d.total || 0
        }))
    );

    const getByYear = (yr: number) => transformedData.find(obj => obj.timestamp === yr)?.total || 0;

    $effect(() => {
        if ((!allYearsData || allYearsData.length === 0) && geography && scenario && !hasFetched) { // Only fetch if no data provided and haven't fetched before
            fetchChangeData();
        }
    });

    async function fetchChangeData() {
        try {
            loading = true;
            error = null;
            hasFetched = true; // Mark as fetched to prevent retries

            const query = makeDemandQuery({
                start: '2025',
                end: '2050',
                resolution: '1Y',
                aggregation,
                geography,
                segment: 'housing', // Default segment
                scenarioId: scenario?.id || scenario?.scenario_id || 'default'
            });

            const data = await fetchDemandData(query);
            allYearsData = data;
        } catch (err) {
            error = err.message;
            console.error('Error fetching change data:', err);
            allYearsData = []; // Fallback to empty array
        } finally {
            loading = false;
        }
    }

    let output = $derived(() => {
        if (!allYearsData || allYearsData.length === 0) return '';
        
        const yearData = getByYear(year);
        const startData = getByYear(startYear);
        
        if (!yearData || !startData) return '';

        return percentage
            ? ((yearData - startData) / startData * 100).toFixed(2) + '%'
            : (yearData - startData).toFixed(2);
    });

</script>

<span>
    {output()}
</span>