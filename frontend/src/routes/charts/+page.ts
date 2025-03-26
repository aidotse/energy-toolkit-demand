import { fetchParameters, fetchGlobals, fetchGeoJSON, fetchYearly, fetchAllYears, fetchTimeseries, calculateHistogram } from '$lib/dataService';
import type { PageLoad } from './$types';

// Function to create histogram bins
export const load: PageLoad = async ({ fetch, params }) => {

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

    // Initial state
    const geography = '00';
    const scenario = {
        growth: 2,
        flex: 1,
        transport: 1,
        population: 1
    }
    const division = 'county';
    const sector = 'all';

    try {
        // Fetch parameter data, globals, and determine the initial year
        const parameterData = await fetchParameters();
        if (!parameterData || !parameterData.years || parameterData.years.length === 0) {
            throw new Error('Invalid parameter data or years array is empty');
        }

        const globalsData = await fetchGlobals();
        if (!globalsData) {
            throw new Error('Invalid parameter data or years array is empty');
        }

        const year = Math.max(...parameterData.years);

        // Fetch GeoJSON and CSV data
        const geojsonData = await fetchGeoJSON(`${API_BASE_URL}/geo?division=${division}`);
        const hourData = await fetchTimeseries(`${API_BASE_URL}/demand_t?geography=${geography}&resolution=1h&sector=${sector}&aggregation=mean&year=${year}&growth=${scenario.growth}`);
        const dayData = await fetchTimeseries(`${API_BASE_URL}/demand_t?geography=${geography}&resolution=1d&sector=${sector}&aggregation=mean&year=${year}&growth=${scenario.growth}`);
        const yearData = await fetchYearly(`${API_BASE_URL}/demand?geography=all&resolution=1YE&sector=all&aggregation=sum&year=${year}&growth=${scenario.growth}`);
        const allYearsData = await fetchAllYears(`${API_BASE_URL}/demand?geography=${geography}&resolution=1YE&sector=all&aggregation=sum&year=all&growth=${scenario.growth}`);

        // Return all data
        return {
            parameterData,
            globalsData,
            year,
            geography,
            scenario,
            sector,
            geojsonData,
            hourData,
            dayData,
            yearData,
            allYearsData
        };
    } catch (error) {
        console.error('Error loading data:', error.message);
        // Return default fallback values in case of error
        return {
            parameterData: null,
            globalsData: null,
            year: 0,
            geography: null,
            scenario: null,
            sector: null,
            geojsonData: null,
            hourData: null,
            dayData: null,
            yearData: null,
            allYearsData: null
        };
    }
}
