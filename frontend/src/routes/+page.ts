import { fetchJSON, fetchGeoJSON, fetchYearly, fetchAllYears, fetchTimeseries, calculateHistogram } from '$lib/dataService';
import type { PageLoad } from './$types';

// Function to create histogram bins
export const load: PageLoad = async ({ fetch, params }) => {

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

    // Initial state
    const geography = '00';
    const division = 'county';
    const sector = 'all';

    try {
        // Fetch config, scenarios, parameter data, globals, and determine the initial year
        const config = await fetchJSON(`${API_BASE_URL}/config`);
        if (!config) {
            throw new Error('Invalid config');
        }

        const scenarios = await fetchJSON(`${API_BASE_URL}/scenarios`);
        if (!scenarios || scenarios.length === 0) {
            throw new Error('Invalid scenarios data');
        }

        const scenario = scenarios.find((s: any) => s.default);

        const parameterData = await fetchJSON(`${API_BASE_URL}/parameters`);
        if (!parameterData || !parameterData.years || parameterData.years.length === 0) {
            throw new Error('Invalid parameter data or years array is empty');
        }

        const globalsData = await fetchJSON(`${API_BASE_URL}/globals`);
        if (!globalsData) {
            throw new Error('Invalid parameter data or years array is empty');
        }

        const year = Math.max(...parameterData.years);

        // Fetch GeoJSON and CSV data
        const geojsonData = await fetchGeoJSON(`${API_BASE_URL}/geo?division=${division}`);
        if (!geojsonData || geojsonData.length === 0) {
            throw new Error('Failed to fetch geojsonData or data is empty');
        }

        const hourData = await fetchTimeseries(`${API_BASE_URL}/demand_t?geography=${geography}&resolution=1h&sector=${sector}&aggregation=mean&year=${year}&growth=${scenario.growth}`);
        if (!hourData || hourData.length === 0) {
            throw new Error('Failed to fetch hourData or data is empty');
        }

        const dayData = await fetchTimeseries(`${API_BASE_URL}/demand_t?geography=${geography}&resolution=1d&sector=${sector}&aggregation=mean&year=${year}&growth=${scenario.growth}`);
        if (!dayData || dayData.length === 0) {
            throw new Error('Failed to fetch dayData or data is empty');
        }

        const yearData = await fetchYearly(`${API_BASE_URL}/demand?geography=all&resolution=1YE&sector=all&aggregation=sum&year=${year}&growth=${scenario.growth}`);
        if (!yearData || yearData.length === 0) {
            throw new Error('Failed to fetch yearData or data is empty');
        }

        const allYearsData = await fetchAllYears(`${API_BASE_URL}/demand?geography=${geography}&resolution=1YE&sector=all&aggregation=sum&year=all&growth=${scenario.growth}`);
        if (!allYearsData || allYearsData.length === 0) {
            throw new Error('Failed to fetch allYearsData or data is empty');
        }
        
        // Return all data
        return {
            config,
            scenarios,
            parameterData,
            globalsData,
            year,
            geography,
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
            config: null,
            scenarios: null,
            parameterData: null,
            globalsData: null,
            year: 0,
            geography: null,
            sector: null,
            geojsonData: null,
            hourData: null,
            dayData: null,
            yearData: null,
            allYearsData: null
        };
    }
}
