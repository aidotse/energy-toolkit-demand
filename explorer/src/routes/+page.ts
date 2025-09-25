import {
    fetchDemandData,
    fetchConfig,
    fetchScenarios,
    fetchParameters,
    fetchGlobals,
    fetchGeographies,
    type DemandRow
} from '$lib/dataService';
import { makeDemandQuery, makeGeographiesQuery } from '$lib/utilities';
import type { PageLoad } from './$types';

// Function to create histogram bins
export const load: PageLoad = async ({ fetch, params }) => {

    // Initial state
    const geography = 'all';
    const segment = 'all';

    try {
        // 1) Static endpoints using new API functions
        const [config, scenarios, parameters, globals, geojson] = await Promise.all([
            fetchConfig(),
            fetchScenarios(),
            fetchParameters(),
            fetchGlobals(),
            fetchGeographies('geojson'),
        ]);

        // Pick the default scenario and default year
        const scenario = scenarios.find((s: any) => s.default) || scenarios[0];
        const year = 2030;

        // Get scenario ID for API calls
        const scenarioId = scenario?.id || scenario?.scenario_id || 'default';

        // 2) Time-series calls using new API functions
        // Hourly mean for selected year
        const hourQuery = makeDemandQuery({
            start: `${year}-01-01`,
            end:   `${year + 1}-01-01`,
            resolution: '1h',
            aggregation:'mean',
            geography,
            segment,
            scenarioId,
            growth: scenario?.growth  // Legacy fallback
        });
        const hourData = await fetchDemandData(hourQuery);

        // Daily sum
        const dayQuery = makeDemandQuery({
            start: `${year}-01-01`,
            end:   `${year + 1}-01-01`,
            resolution: '1d',
            aggregation:'sum',
            geography,
            segment,
            scenarioId,
            growth: scenario?.growth  // Legacy fallback
        });
        const dayData = await fetchDemandData(dayQuery);

        // Annual for this one county/segment
        const yearQuery = makeDemandQuery({
            start: String(year),
            end:   String(year + 1),
            resolution: '1Y',
            aggregation:'sum',
            geography,
            segment,
            scenarioId,
            growth: scenario?.growth  // Legacy fallback
        });
        const yearData = await fetchDemandData(yearQuery);

        // Annual across all years for that geo/segment
        // Use config or parameters to determine year range
        const startYear = parameters?.filter?.year?.[0] || config?.start_year || 2025;
        const endYear = parameters?.filter?.year?.slice(-1)?.[0] || config?.end_year || 2050;

        const allYearsQuery = makeDemandQuery({
            start: String(startYear),
            end:   String(endYear + 1),
            resolution: '1Y',
            aggregation:'sum',
            geography,
            segment,
            scenarioId,
            growth: scenario?.growth  // Legacy fallback
        });
        const allYearsData = await fetchDemandData(allYearsQuery);
        
        // Return all data
        return {
            config,
            scenarios,
            parameters,
            globals,
            year,
            geography,
            segment,
            scenario,
            geojson,
            hourData,
            dayData,
            yearData,
            allYearsData
        };
    } catch (error: any) {
        console.error('Error loading data:', error?.message || error);
        // Return default fallback values in case of error
        return {
            config: null,
            scenarios: [],
            parameters: {},
            globals: {},
            year: 2030,
            geography: 'all',
            segment: 'all',
            scenario: null,
            geojson: { type: 'FeatureCollection', features: [] },
            hourData: [],
            dayData: [],
            yearData: [],
            allYearsData: []
        };
    }
}
