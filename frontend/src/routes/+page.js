import { fetchParameters, fetchGeoJSON, fetchCSV } from '$lib/dataService';

export async function load() {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
    const geography = '00';
    const resolution = '1d';
    const geo_resolution = '1YE';
    const sector = 'all';
    const aggregation = 'sum';
    const geo_aggregation = 'all';

    try {
        // Fetch parameter data and determine the initial year
        const parameterData = await fetchParameters();
        if (!parameterData || !parameterData.years || parameterData.years.length === 0) {
            throw new Error('Invalid parameter data or years array is empty');
        }

        const selectedYear = Math.min(...parameterData.years);

        // Construct API paths
        const geojsonPath = `${API_BASE_URL}/api/geojson?resolution=${geo_resolution}&sector=${sector}&aggregation=${geo_aggregation}&year=${selectedYear}`;
        const csvPath = `${API_BASE_URL}/api/demand_t?geography=${geography}&resolution=${resolution}&sector=${sector}&aggregation=${aggregation}&year=${selectedYear}`;

        // Fetch GeoJSON and CSV data
        const geojsonData = await fetchGeoJSON(geojsonPath);
        const chartData = await fetchCSV(csvPath);

        // Return all data
        return {
            parameterData, // Include the parameters for potential future use
            selectedYear,
            geography,
            resolution,
            sector,
            aggregation,
            geojsonData,
            chartData,
            minDemandValue: 35555.02,
            maxDemandValue: 15942725.69,
        };
    } catch (error) {
        console.error('Error loading data:', error.message);
        // Return default fallback values in case of error
        return {
            parameterData: null,
            selectedYear: 0,
            geography: null,
            resolution: null,
            sector: null,
            aggregation: null,
            geojsonData: null,
            chartData: null,
            minDemandValue: 0,
            maxDemandValue: 0,
        };
    }
}
