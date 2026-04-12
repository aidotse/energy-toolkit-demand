import { building } from '$app/environment';
import {
	fetchConfig,
	fetchGlobals,
	fetchGeographies,
	fetchDemandData
} from '$lib/dataService';
import { makeDemandQuery } from '$lib/utilities';
import type { PageLoad } from './$types';

const FALLBACK = {
	config: null,
	scenarios: [],
	parameters: {},
	globals: {},
	geographies: [],
	geojson: { type: 'FeatureCollection' as const, features: [] },
	geoData: [],
	year: 2030,
	geography: 'total',
	segment: 'total'
};

export const load: PageLoad = async ({ fetch, parent }) => {
	if (building) return FALLBACK;
	try {
		// Scenarios + parameters come from the layout loader — don't refetch.
		const { scenarios, parameters } = await parent();

		// Fetch page-specific data in parallel
		const [
			configResult,
			globalsResult,
			geographiesResult,
			geojsonResult
		] = await Promise.all([
			fetchConfig(fetch),
			fetchGlobals(fetch),
			fetchGeographies('json', fetch),
			fetchGeographies('geojson', fetch)
		]);
		const config = configResult.data;
		const globals = globalsResult.data;
		const geographies = geographiesResult.data;
		const geojson = geojsonResult.data;

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
