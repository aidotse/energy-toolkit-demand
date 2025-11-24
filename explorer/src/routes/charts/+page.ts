import {
	fetchConfig,
	fetchScenarios,
	fetchParameters,
	fetchGlobals,
	fetchGeographies,
	fetchDemandData
} from '$lib/dataService';
import { makeDemandQuery } from '$lib/utilities';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	try {
		// Fetch static configuration data
		const [config, scenarios, parameters, globals, geographies, geojson] = await Promise.all([
			fetchConfig(fetch),
			fetchScenarios(fetch),
			fetchParameters(fetch),
			fetchGlobals(fetch),
			fetchGeographies('json', fetch),
			fetchGeographies('geojson', fetch)
		]);

		// Set initial defaults for controls
		const year = 2030;
		const geography = 'total';
		const segment = 'total';

		// Get default scenario
		const scenario = scenarios.find((s: any) => s.is_default) || scenarios[0];
		const scenarioId = scenario?.id || scenario?.scenario_id || 'default';

		// Fetch geographic distribution data for the map (same as main page)
		const geoQuery = makeDemandQuery({
			start: String(year),
			end: String(year + 1),
			resolution: '1Y',
			aggregation: 'sum',
			geography: 'all', // All geographies separately
			segment: 'total', // Total across segments
			scenarioId
		});
		const geoData = await fetchDemandData(geoQuery, fetch);

		return {
			config,
			scenarios,
			parameters,
			globals,
			geographies,
			geojson,
			geoData,
			year,
			geography,
			segment
		};
	} catch (error: any) {
		console.error('Error loading chart library configuration:', error?.message || error);

		// Return minimal fallback values
		return {
			config: null,
			scenarios: [],
			parameters: {},
			globals: {},
			geographies: [],
			geojson: { type: 'FeatureCollection', features: [] },
			geoData: [],
			year: 2030,
			geography: 'total',
			segment: 'total'
		};
	}
};
