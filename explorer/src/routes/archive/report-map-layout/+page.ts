import { building } from '$app/environment';
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

const FALLBACK = {
	config: null,
	scenarios: [],
	parameters: {},
	globals: {},
	year: 2045,
	geography: 'total',
	segment: 'total',
	scenario: null,
	scenarioId: 'default',
	geographies: [],
	geojson: { type: 'FeatureCollection' as const, features: [] },
	timeSeriesData: [],
	hourlyData: [],
	dailyData: [],
	segmentData: [],
	geoData: [],
	totalEnergy2050: 0,
	totalEnergy2025: 0,
	growthRate: 0,
	peakPower: 0,
	scenarioCount: 0
};

export const load: PageLoad = async ({ fetch }) => {
	if (building) return FALLBACK;
	// Report page configuration
	const geography = 'total'; // National totals
	const segment = 'total'; // All segments combined initially
	const year = 2050; // Default year for report
	const startYear = 2025;
	const endYear = 2050;

	try {
		// 1) Fetch static configuration data
		const [
			configResult,
			scenariosResult,
			parametersResult,
			globalsResult,
			geographiesResult,
			geojsonResult
		] = await Promise.all([
			fetchConfig(fetch),
			fetchScenarios(fetch),
			fetchParameters(fetch),
			fetchGlobals(fetch),
			fetchGeographies('json', fetch),
			fetchGeographies('geojson', fetch)
		]);
		const config = configResult.data;
		const scenarios = scenariosResult.data;
		const parameters = parametersResult.data;
		const globals = globalsResult.data;
		const geographies = geographiesResult.data;
		const geojson = geojsonResult.data;

		// Get default scenario
		const scenario = scenarios.find((s: any) => s.is_default) || scenarios[0];
		const scenarioId = scenario?.id || scenario?.scenario_id || 'default';

		// 2) Fetch time series data for different visualizations

		// Full time range annual data for AreaChart (2025-2050)
		const timeSeriesQuery = makeDemandQuery({
			start: String(startYear),
			end: String(endYear + 1),
			resolution: '1Y',
			aggregation: 'sum',
			geography,
			segment,
			scenarioId
		});
		const timeSeriesData = await fetchDemandData(timeSeriesQuery, fetch);

		// Hourly data for selected year (for Histogram distribution)
		const hourlyQuery = makeDemandQuery({
			start: `${year}-01-01`,
			end: `${year + 1}-01-01`,
			resolution: '1h',
			aggregation: 'mean',
			geography,
			segment,
			scenarioId
		});
		const hourlyData = await fetchDemandData(hourlyQuery, fetch);

		// Daily data for selected year (for TimeLine daily patterns)
		const dailyQuery = makeDemandQuery({
			start: `${year}-01-01`,
			end: `${year + 1}-01-01`,
			resolution: '1d',
			aggregation: 'sum',
			geography,
			segment,
			scenarioId
		});
		const dailyData = await fetchDemandData(dailyQuery, fetch);

		// Segment breakdown for selected year (for segmentBars)
		const segmentQuery = makeDemandQuery({
			start: String(year),
			end: String(year + 1),
			resolution: '1Y',
			aggregation: 'sum',
			geography: 'total', // National total
			segment: 'all', // All segments separately
			scenarioId
		});
		const segmentData = await fetchDemandData(segmentQuery, fetch);

		// Geographic distribution for selected year (for Map and GeoBarChart)
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

		// Calculate key metrics from the data
		const latestYearData = timeSeriesData[timeSeriesData.length - 1];
		const firstYearData = timeSeriesData[0];

		const totalEnergy2050 = latestYearData?.value || 0;
		const totalEnergy2025 = firstYearData?.value || 0;
		const growthRate =
			totalEnergy2025 > 0 ? ((totalEnergy2050 - totalEnergy2025) / totalEnergy2025) * 100 : 0;

		// Calculate peak power from hourly data
		const peakPower = hourlyData.reduce((max, d) => Math.max(max, d.value || 0), 0);

		// Use map-specific bounds from globals
		const mapBounds = globals?.bounds?.map_yearly_geography || {
			lower_bound: globals?.lower_bound || 0,
			upper_bound: globals?.upper_bound || 30000000
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
			// Chart data
			timeSeriesData,
			hourlyData,
			dailyData,
			segmentData,
			geoData,
			// Metrics
			totalEnergy2050,
			totalEnergy2025,
			growthRate,
			peakPower,
			scenarioCount: scenarios.length
		};
	} catch (error: any) {
		console.error('Error loading report data:', error?.message || error);
		return {
			config: null,
			scenarios: [],
			parameters: {},
			globals: {},
			year: 2045,
			geography: 'total',
			segment: 'total',
			scenario: null,
			scenarioId: 'default',
			geographies: [],
			geojson: { type: 'FeatureCollection', features: [] },
			timeSeriesData: [],
			hourlyData: [],
			dailyData: [],
			segmentData: [],
			geoData: [],
			totalEnergy2050: 0,
			totalEnergy2025: 0,
			growthRate: 0,
			peakPower: 0,
			scenarioCount: 0
		};
	}
};
