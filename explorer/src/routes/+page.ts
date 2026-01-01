import {
	fetchDemandData,
	fetchConfig,
	fetchGlobals,
	fetchGeographies,
	calculateScenarioCount
} from '$lib/dataService';
import { makeDemandQuery } from '$lib/utilities';
import { loadContent } from '$lib/contentLoader';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, parent }) => {
	// Report page configuration
	const geography = 'total'; // National totals
	const segment = 'total'; // All segments combined initially
	const year = 2050; // Default year for report

	try {
		// Get data already loaded by layout (scenarios, parameters, defaultScenario)
		const parentData = await parent();
		const { scenarios, parameters, defaultScenario } = parentData;

		// Fetch only what we need that layout doesn't provide
		const [config, globals, geographies, geojson, contentSections] =
			await Promise.all([
				fetchConfig(fetch),
				fetchGlobals(fetch),
				fetchGeographies('json', fetch),
				fetchGeographies('geojson', fetch),
				// Load content sections (using Swedish for now, will add i18n later)
				Promise.all([
					loadContent('sv', 'executive-summary'),
					loadContent('sv', 'current-state'),
					loadContent('sv', 'future-scenarios'),
					loadContent('sv', 'key-insights')
				])
			]);

		// Get default scenario
		const scenario = defaultScenario || scenarios[0];
		const scenarioId = scenario?.id || scenario?.scenario_id || 'default';

		// Geographic distribution for selected year (for Map - needed for initial render)
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

		// Use map-specific bounds from globals
		const mapBounds = globals?.bounds?.map_yearly_geography || {
			lower_bound: globals?.lower_bound || 0,
			upper_bound: globals?.upper_bound || 30000000
		};

		// Organize content sections by section name
		const [executiveSummary, currentState, futureScenarios, keyInsights] = contentSections;
		const content = {
			executiveSummary,
			currentState,
			futureScenarios,
			keyInsights
		};

		return {
			config,
			scenarios,
			parameters,
			globals: {
				...globals,
				lower_bound: mapBounds.lower_bound,
				upper_bound: mapBounds.upper_bound
			},
			year,
			geography,
			segment,
			scenario,
			scenarioId,
			geographies,
			geojson,
			// Map data (fetched in loader, needed for initial render)
			geoData,
			// Scenario count for metrics
			scenarioCount: calculateScenarioCount(parameters, scenarios),
			// Content sections
			content
		};
	} catch (error: any) {
		console.error('Error loading report data:', error?.message || error);
		return {
			config: null,
			scenarios: [],
			parameters: {},
			globals: {},
			year: 2050,
			geography: 'total',
			segment: 'total',
			scenario: null,
			scenarioId: 'default',
			geographies: [],
			geojson: { type: 'FeatureCollection', features: [] },
			geoData: [],
			scenarioCount: 0,
			content: {
				executiveSummary: null,
				currentState: null,
				futureScenarios: null,
				keyInsights: null
			}
		};
	}
};
