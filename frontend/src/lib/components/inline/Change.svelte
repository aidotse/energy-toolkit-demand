<script lang="ts">
    import { fetchAllYears } from '$lib/dataService';
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

    let {geography, aggregation, scenario, startYear, year, allYearsData, percentage} = $props();

    const getByYear = (yr: number) => allYearsData.find(obj => obj.timestamp === yr).total

    $effect(async () => {
        fetchAllYears(`${API_BASE_URL}/demand?geography=${geography}&resolution=1YE&sector=all&aggregation=${aggregation}&year=all&growth=${scenario.growth}`)
        .then(data => { allYearsData = data; })
        .catch(error => console.error('Error fetching all years data:', error.message));
    });

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