import { fetchParameters, fetchGlobals, fetchGeoJSON, fetchYearly, fetchAllYears, fetchTimeseries, calculateSectorData, calculateHistogram } from '$lib/dataService';
import type { PageLoad } from './$types';

// Function to create histogram bins
export const load: PageLoad = async ({ fetch, params }) => {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
    const geography = '00';
    const growth = 2;
    const resolution = '1d';
    const division = 'county';
    const sector = 'all';
    const aggregation = 'sum';
    const numBins = 50;

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

        const year = Math.min(...parameterData.years);

        // Fetch GeoJSON and CSV data
        const geojsonData = await fetchGeoJSON(`${API_BASE_URL}/geo?division=${division}`);
        const yearlyData = await fetchYearly(`${API_BASE_URL}/demand?geography=all&resolution=1YE&sector=all&aggregation=${'sum'}&year=${year}&growth=${growth}`);
        const timeseriesData = await fetchTimeseries(`${API_BASE_URL}/demand_t?geography=${geography}&resolution=${resolution}&sector=${sector}&aggregation=${aggregation}&year=${year}&growth=${growth}`);
        const sectorData = calculateSectorData(yearlyData, geography);
        const histogramData = calculateHistogram(timeseriesData, 'total', numBins)
        const allYearsData = await fetchAllYears(`${API_BASE_URL}/demand?geography=${geography}&resolution=1YE&sector=all&aggregation=${aggregation}&year=all&growth=${growth}`);

        // Return all data
        return {
            parameterData,
            globalsData,
            year,
            geography,
            growth,
            resolution,
            sector,
            aggregation,
            geojsonData,
            yearlyData,
            sectorData,
            timeseriesData,
            histogramData,
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
            growth: null,
            resolution: null,
            sector: null,
            aggregation: null,
            geojsonData: null,
            yearlyData: null,
            sectorData: null,
            timeseriesData: null,
            histogramData: null,
            allYearsData: null
        };
    }
}
