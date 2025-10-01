import {
    fetchDemandData,
    fetchConfig,
    fetchScenarios,
    fetchParameters,
    fetchGlobals,
    fetchGeographies
} from '$lib/dataService';
import { makeDemandQuery } from '$lib/utilities';
import type { PageLoad } from './$types';
export const load: PageLoad = async () => {

    // Initial state - use aggregated values for overview
    const geography = 'total'; // Total across all geographies (server-side aggregated)
    const segment = 'total'; // Total across all segments (server-side aggregated)

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
        const scenario = scenarios.find((s: any) => s.is_default) || scenarios[0];
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
            scenarioId
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
            scenarioId
        });
        const dayData = await fetchDemandData(dayQuery);

        // Annual for map (all geographies, aggregated segments)
        const yearQuery = makeDemandQuery({
            start: String(year),
            end:   String(year + 1),
            resolution: '1Y',
            aggregation:'sum',
            geography: 'all',
            segment: 'total',
            scenarioId
        });
        const yearData = await fetchDemandData(yearQuery);

        // Annual sector data for SectorArc (all geographies, all segments separately)
        const sectorQuery = makeDemandQuery({
            start: String(year),
            end:   String(year + 1),
            resolution: '1Y',
            aggregation:'sum',
            geography: 'all',
            segment: 'all', // Get all segments separately
            scenarioId
        });
        const sectorData = await fetchDemandData(sectorQuery);

        // Annual across limited years for performance
        // Use a smaller year range initially
        const startYear = 2025;
        const endYear = 2035; // Reduced from 2050 to limit data load

        const allYearsQuery = makeDemandQuery({
            start: String(startYear),
            end:   String(endYear + 1),
            resolution: '1Y',
            aggregation:'sum',
            geography,
            segment,
            scenarioId
        });
        const allYearsData = await fetchDemandData(allYearsQuery);

        // Use appropriate bounds from globals endpoint
        // If the new bounds structure exists, use map-specific bounds, otherwise fallback
        const mapBounds = globals?.bounds?.map_yearly_geography || {
            lower_bound: globals?.lower_bound || 0,
            upper_bound: globals?.upper_bound || 30000000
        };

        // Return all data
        return {
            config,
            scenarios,
            parameters,
            globals: {
                ...globals,
                // Override with map-specific bounds for the Map component
                lower_bound: mapBounds.lower_bound,
                upper_bound: mapBounds.upper_bound
            },
            year,
            geography,
            segment,
            scenario,
            geojson,
            hourData,
            dayData,
            yearData,
            sectorData,
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
            sectorData: [],
            allYearsData: []
        };
    }
}
