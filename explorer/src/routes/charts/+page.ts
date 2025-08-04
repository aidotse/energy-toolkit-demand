import { fetchJSON } from '$lib/dataService';
import { makeDemandQuery } from '$lib/utilities';
import type { PageLoad } from './$types';

// Function to create histogram bins
export const load: PageLoad = async ({ fetch, params }) => {

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

    // Initial state
    const geography = 'all';
    const segment = 'all';

    try {
        // 1) Static endpoints
        const [config, scenarios, parameters, globals, geojson] = await Promise.all([
            fetchJSON(`${API_BASE_URL}/config`),
            fetchJSON(`${API_BASE_URL}/scenarios`),
            fetchJSON(`${API_BASE_URL}/parameters`),
            fetchJSON(`${API_BASE_URL}/globals`),
            fetchJSON(`${API_BASE_URL}/geographies?format=geojson`),
        ]);

        // pick the default scenario and default year
        const scenario = scenarios.find((s: any) => s.default);
        const year = 2030;

        // 2) Time-series calls
        // Hourly mean for selected year
        const hourQuery = makeDemandQuery({
            start: `${year}-01-01`,
            end:   `${year + 1}-01-01`,
            resolution: '1h',
            aggregation:'mean',
            geography,
            segment,
            growth: scenario.growth
        });
        const hourData = await fetchJSON(`${API_BASE_URL}/demand?${hourQuery}`);

        // Daily sum
        const dayQuery = makeDemandQuery({
            start: `${year}-01-01`,
            end:   `${year + 1}-01-01`,
            resolution: '1d',
            aggregation:'sum',
            geography,
            segment,
            growth: scenario.growth
        });
        const dayData = await fetchJSON(`${API_BASE_URL}/demand?${dayQuery}`);

        // Annual for this one county/segment
        const yearQuery = makeDemandQuery({
            start: String(year),
            end:   String(year + 1),
            resolution: '1Y',
            aggregation:'sum',
            geography,
            segment,
            growth: scenario.growth
        });
        const yearData = await fetchJSON(`${API_BASE_URL}/demand?${yearQuery}`);

        // Annual across all years for that geo/segment
        const allYearsQuery = makeDemandQuery({
            start: String(parameters.filter.year[0]),
            end:   String(parameters.filter.year.slice(-1)[0] + 1),
            resolution: '1Y',
            aggregation:'sum',
            geography,
            segment,
            growth: scenario.growth
        });
        const allYearsData = await fetchJSON(`${API_BASE_URL}/demand?${allYearsQuery}`);
        
        // Return all data
        return {
            config,
            scenarios,
            parameters,
            globals,
            year,
            geography,
            segment,
            geojson,
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
            parameters: null,
            globals: null,
            year: 0,
            geography: null,
            segment: null,
            geojson: null,
            hourData: null,
            dayData: null,
            yearData: null,
            allYearsData: null
        };
    }
}
