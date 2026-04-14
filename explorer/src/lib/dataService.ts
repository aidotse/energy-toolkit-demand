/**
 * Data service for the Demand Toolkit Explorer
 * Handles API communication with the OpenAPI 3.1 compliant backend
 */

import type {
	DemandRow,
	ApiConfig,
	Scenario,
	Parameters,
	Globals,
	GeoJsonFeatureCollection,
	ApiError,
	Strategy2Config,
	ParameterValues
} from '../types/api';
import { unitsState } from './stores/units.svelte';

/**
 * Result type for fetch operations that may fail
 * Components can check `error` to distinguish between "no data" and "fetch failed"
 */
export interface FetchResult<T> {
	data: T;
	error?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * Request cache for demand data
 * Prevents duplicate requests and caches results with TTL
 */
interface CacheEntry {
	data: unknown;
	timestamp: number;
	promise?: Promise<unknown>;
}

const requestCache = new Map<string, CacheEntry>();

// TTL for different types of data (in milliseconds)
const CACHE_TTL = {
	demand: 5 * 60 * 1000, // 5 minutes for demand data
	demand_yearly: 15 * 60 * 1000, // 15 minutes for yearly resolution data
	static: 60 * 60 * 1000 // 1 hour for static config
};

/**
 * Get cached data or in-flight promise
 */
function getCached(key: string, ttl: number): CacheEntry | null {
	const entry = requestCache.get(key);
	if (!entry) return null;

	// If there's an in-flight promise, return it
	if (entry.promise) return entry;

	// Check if cached data is still valid
	const age = Date.now() - entry.timestamp;
	if (age < ttl) return entry;

	// Cache expired
	requestCache.delete(key);
	return null;
}

/**
 * Set cache entry
 */
function setCache(key: string, data: unknown): void {
	requestCache.set(key, {
		data,
		timestamp: Date.now()
	});
}

/**
 * Set in-flight promise to dedup concurrent requests
 */
function setInflight(key: string, promise: Promise<unknown>): void {
	requestCache.set(key, {
		data: null,
		timestamp: Date.now(),
		promise
	});
}

/**
 * Clear in-flight status after request completes
 */
function clearInflight(key: string, data: unknown): void {
	setCache(key, data);
}

/**
 * Create an API error with additional context
 */
const createApiError = (
	message: string,
	url?: string,
	status?: number,
	statusText?: string
): ApiError => {
	const error = new Error(message) as ApiError;
	error.url = url;
	error.status = status;
	error.statusText = statusText;
	return error;
};

/**
 * Basic JSON fetch with enhanced error handling
 * @param url - URL to fetch
 * @param customFetch - Optional fetch function (for SvelteKit SSR compatibility)
 */
export const fetchJSON = async (url: string, customFetch?: typeof fetch): Promise<unknown> => {
	// Use provided fetch or fall back to global fetch
	const fetchFn = customFetch || fetch;

	try {
		const response = await fetchFn(url);
		if (!response.ok) {
			throw createApiError(
				`API request failed: ${response.status} ${response.statusText}`,
				url,
				response.status,
				response.statusText
			);
		}
		return await response.json();
	} catch (error) {
		if (error instanceof TypeError && error.message.includes('fetch')) {
			throw createApiError(`Network error: Unable to connect to API at ${url}`, url);
		}
		throw error;
	}
};

/**
 * Fetch demand timeseries data from the /demand endpoint
 * Returns array of DemandRow objects with timestamp, value, geography, segment, scenario_id
 * Uses caching to prevent duplicate requests
 * @param queryParams - Query parameters for the demand endpoint
 * @param customFetch - Optional fetch function (for SvelteKit SSR compatibility)
 */
export const fetchDemandData = async (
	queryParams: URLSearchParams,
	customFetch?: typeof fetch
): Promise<DemandRow[]> => {
	const queryString = queryParams.toString();
	const cacheKey = `demand:${queryString}`;
	const url = `${API_BASE_URL}/demand?${queryString}`;

	// Use longer TTL for yearly resolution data (changes less frequently)
	const resolution = queryParams.get('period[resolution]');
	const ttl = resolution === '1Y' ? CACHE_TTL.demand_yearly : CACHE_TTL.demand;

	// Check the cache regardless of whether a customFetch was supplied. The
	// customFetch comes from SvelteKit's load() and we're on @sveltejs/adapter-
	// static, so there is no SSR correctness concern — just skip the round-
	// trip if the query string matches something we already have in memory.
	// Previously this branch was guarded by `if (!customFetch)` which meant
	// every page-loader call bypassed the cache and issued a fresh request on
	// each navigation.
	const cached = getCached(cacheKey, ttl);
	if (cached) {
		// Return cached data or wait for in-flight request
		if (cached.promise) {
			return cached.promise as Promise<DemandRow[]>;
		}
		return cached.data as DemandRow[];
	}

	// Create the fetch promise
	const fetchPromise = (async () => {
		try {
			const data = (await fetchJSON(url, customFetch)) as Record<string, unknown>[];

			// Validate and transform the data
			const result = data
				.filter(
					(row: Record<string, unknown>) =>
						row.period && row.value !== undefined && row.geography && row.segment
				)
				.map((row: Record<string, unknown>) => ({
					period: new Date(row.period as string),
					value: parseFloat(row.value as string),
					geography: row.geography as string,
					segment: row.segment as string,
					scenario_id: row.scenario_id as string,
					timestamp_year:
						(row.timestamp_year as number) ||
						new Date(row.period as string).getFullYear()
				}));

			// Cache the result — see note above, no SSR correctness concern.
			clearInflight(cacheKey, result);

			return result;
		} catch (error) {
			requestCache.delete(cacheKey);
			console.warn('Failed to fetch demand data, returning empty array:', error);
			return [];
		}
	})();

	// Set in-flight promise so concurrent callers share the same round-trip.
	setInflight(cacheKey, fetchPromise);

	return fetchPromise;
};

/**
 * Fetch configuration from /config endpoint
 * Also initializes the units configuration store
 * @param customFetch - Optional fetch function (for SvelteKit SSR compatibility)
 */
export const fetchConfig = async (customFetch?: typeof fetch): Promise<FetchResult<ApiConfig>> => {
	try {
		const config = (await fetchJSON(`${API_BASE_URL}/config`, customFetch)) as ApiConfig;
		// Initialize units store with loaded configuration
		if (config.units) {
			unitsState.initialize(config.units);
		}
		return { data: config };
	} catch (error) {
		console.warn('Failed to fetch config, using fallback:', error);
		return {
			data: {
				name: 'Energy Demand Toolkit',
				access: 'public',
				start_year: 2025,
				end_year: 2050,
				resolution: '1h'
			},
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
};

/**
 * Fetch available scenarios from /scenarios endpoint
 * @param customFetch - Optional fetch function (for SvelteKit SSR compatibility)
 */
export const fetchScenarios = async (
	customFetch?: typeof fetch
): Promise<FetchResult<Scenario[]>> => {
	try {
		const scenarios = (await fetchJSON(`${API_BASE_URL}/scenarios`, customFetch)) as Scenario[];
		return { data: scenarios };
	} catch (error) {
		console.warn('Failed to fetch scenarios, using fallback:', error);
		return {
			data: [
				{
					id: 'default',
					scenario_id: 'default',
					name: 'Default Scenario',
					default: true,
					growth: 1.0
				}
			],
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
};

/**
 * Fetch parameter definitions from /parameters endpoint
 * @param customFetch - Optional fetch function (for SvelteKit SSR compatibility)
 */
export const fetchParameters = async (
	customFetch?: typeof fetch
): Promise<FetchResult<Parameters>> => {
	try {
		const parameters = (await fetchJSON(`${API_BASE_URL}/parameters`, customFetch)) as Parameters;
		return { data: parameters };
	} catch (error) {
		console.warn('Failed to fetch parameters, using fallback:', error);
		return {
			data: {
				geographies: [],
				scenarios: [],
				segments: ['total'],
				years: [2025, 2030, 2035, 2040, 2045, 2050],
				filter: {
					year: [2025, 2050]
				}
			},
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
};

/**
 * Fetch global statistics from /globals endpoint
 * @param customFetch - Optional fetch function (for SvelteKit SSR compatibility)
 */
export const fetchGlobals = async (customFetch?: typeof fetch): Promise<FetchResult<Globals>> => {
	try {
		const globals = (await fetchJSON(`${API_BASE_URL}/globals`, customFetch)) as Globals;
		return { data: globals };
	} catch (error) {
		console.warn('Failed to fetch globals, using fallback:', error);
		return {
			data: {
				lower_bound: 0,
				upper_bound: 1000000
			},
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
};

/**
 * Fetch geographic data from /geographies endpoint
 * @param format - 'json' for metadata or 'geojson' for spatial data
 * @param customFetch - Optional fetch function (for SvelteKit SSR compatibility)
 */
export const fetchGeographies = async (
	format: 'json' | 'geojson' = 'json',
	customFetch?: typeof fetch
): Promise<FetchResult<GeoJsonFeatureCollection | unknown[]>> => {
	// The geojson ships as a static asset in explorer/static/data/ so it's served
	// from the same CloudFront distribution as the rest of the site — no API
	// round-trip, no DuckDB spin-up, global edge cache. Try the static path
	// first and fall back to the API handler if the file is missing (which
	// happens in local dev with a fresh clone before the first build).
	if (format === 'geojson') {
		try {
			const staticFetch = customFetch || fetch;
			const res = await staticFetch('/data/geographies.geojson');
			if (res.ok) {
				const geojson = (await res.json()) as GeoJsonFeatureCollection;
				return { data: geojson };
			}
		} catch {
			// Fall through to API fetch below
		}
	}

	try {
		const geographies = (await fetchJSON(
			`${API_BASE_URL}/geographies?format=${format}`,
			customFetch
		)) as GeoJsonFeatureCollection | unknown[];
		return { data: geographies };
	} catch (error) {
		console.warn('Failed to fetch geographies, using fallback:', error);
		const fallbackData =
			format === 'geojson'
				? ({ type: 'FeatureCollection', features: [] } as GeoJsonFeatureCollection)
				: [];
		return {
			data: fallbackData,
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
};

/**
 * Fetch available aggregations from /aggregations endpoint
 * @param customFetch - Optional fetch function (for SvelteKit SSR compatibility)
 */
export const fetchAggregations = async (
	customFetch?: typeof fetch
): Promise<FetchResult<{ resolution: string; aggregation: string[] }[]>> => {
	try {
		const aggregations = (await fetchJSON(`${API_BASE_URL}/aggregations`, customFetch)) as {
			resolution: string;
			aggregation: string[];
		}[];
		return { data: aggregations };
	} catch (error) {
		console.warn('Failed to fetch aggregations, using fallback:', error);
		return {
			data: [
				{ resolution: '1h', aggregation: ['mean', 'sum'] },
				{ resolution: '1d', aggregation: ['sum'] },
				{ resolution: '1Y', aggregation: ['sum'] }
			],
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
};

/**
 * Extract Strategy 2 configuration from Parameters
 * @param parameters - Parameters object from API
 * @returns Strategy2Config or null if not available
 */
export const getStrategy2Config = (parameters: Parameters): Strategy2Config | null => {
	return parameters.strategy2 || null;
};

/**
 * Get default parameter values from Strategy 2 config
 * @param config - Strategy2Config
 * @returns ParameterValues with all defaults (index 0)
 */
export const getDefaultParameterValues = (config: Strategy2Config | null): ParameterValues => {
	if (!config?.defaults) {
		return {};
	}
	return { ...config.defaults };
};

/**
 * Calculate total scenario count for Strategy 2
 * Total = base scenarios + parameter combinations (applied to default base scenario only)
 * @param parameters - Parameters object from API
 * @param scenarios - Array of base scenarios
 * @returns Total scenario count
 */
export const calculateScenarioCount = (parameters: Parameters, scenarios: Scenario[]): number => {
	const baseScenarioCount = scenarios?.length || 0;
	const strategy2Config = getStrategy2Config(parameters);

	if (!strategy2Config?.parameters) {
		return baseScenarioCount;
	}

	// Calculate parameter combinations (product of all parameter value counts)
	let parameterCombinations = 1;
	for (const paramDef of Object.values(strategy2Config.parameters)) {
		const valueCount = paramDef.values?.length || 1;
		parameterCombinations *= valueCount;
	}

	// Total = base scenarios + parameter combinations
	// (parameters only apply to the default base scenario)
	return baseScenarioCount + parameterCombinations;
};

/**
 * Build URL search params for demand query with Strategy 2 parameters
 * @param options - Query options including base scenario and parameter values
 */
export interface DemandQueryOptions {
	start: string;
	end: string;
	resolution: string;
	aggregation: string;
	geography?: string;
	segment?: string;
	baseScenario?: string;
	parameterValues?: ParameterValues;
}

export const buildDemandParams = (options: DemandQueryOptions): URLSearchParams => {
	const params = new URLSearchParams();

	params.set('period[start]', options.start);
	params.set('period[end]', options.end);
	params.set('period[resolution]', options.resolution);
	params.set('period[aggregation]', options.aggregation);

	if (options.geography) {
		params.set('geography', options.geography);
	}
	if (options.segment) {
		params.set('segment', options.segment);
	}

	// Strategy 2: base scenario
	if (options.baseScenario) {
		params.set('baseScenario', options.baseScenario);
	}

	// Strategy 2: parameter values
	if (options.parameterValues) {
		for (const [paramName, paramIndex] of Object.entries(options.parameterValues)) {
			if (paramIndex > 0) {
				// Only include non-baseline parameters
				params.set(paramName, String(paramIndex));
			}
		}
	}

	return params;
};

/**
 * Fetch demand data with Strategy 2 parameters
 * @param options - Query options
 * @param customFetch - Optional fetch function
 */
export const fetchDemandWithParams = async (
	options: DemandQueryOptions,
	customFetch?: typeof fetch
): Promise<DemandRow[]> => {
	const params = buildDemandParams(options);
	return fetchDemandData(params, customFetch);
};

/**
 * Fetch timeseries data for visualization components
 * @param geography - Geography ID
 * @param segment - Segment ID
 * @param start - Start date (ISO format)
 * @param end - End date (ISO format)
 * @param resolution - Temporal resolution ('1h', '1d', '1M', '1Y')
 * @param aggregation - Aggregation method ('sum', 'mean')
 * @param scenarioId - Scenario ID (optional)
 * @param customFetch - Optional fetch function (for SvelteKit SSR compatibility)
 */
export const fetchTimeseries = async (
	geography: string,
	segment: string,
	start: string,
	end: string,
	resolution: string = '1h',
	aggregation: string = 'sum',
	scenarioId?: string,
	customFetch?: typeof fetch
): Promise<DemandRow[]> => {
	const params = new URLSearchParams();
	params.set('period[start]', start);
	params.set('period[end]', end);
	params.set('period[resolution]', resolution);
	params.set('period[aggregation]', aggregation);
	params.set('geography', geography);
	params.set('segment', segment);

	if (scenarioId) {
		params.set('scenarioId', scenarioId);
	}

	return fetchDemandData(params, customFetch);
};

/**
 * Fetch yearly aggregated data
 * @param geography - Geography ID
 * @param segment - Segment ID
 * @param year - Year (will fetch full year data)
 * @param scenarioId - Scenario ID (optional)
 * @param customFetch - Optional fetch function (for SvelteKit SSR compatibility)
 */
export const fetchYearly = async (
	geography: string,
	segment: string,
	year: number,
	scenarioId?: string,
	customFetch?: typeof fetch
): Promise<DemandRow[]> => {
	const start = `${year}-01-01T00:00:00Z`;
	const end = `${year + 1}-01-01T00:00:00Z`;

	return fetchTimeseries(geography, segment, start, end, '1Y', 'sum', scenarioId, customFetch);
};

/**
 * Fetch data for all available years
 * @param geography - Geography ID
 * @param segment - Segment ID
 * @param startYear - Start year (optional, defaults to 2025)
 * @param endYear - End year (optional, defaults to 2044)
 * @param scenarioId - Scenario ID (optional)
 * @param customFetch - Optional fetch function (for SvelteKit SSR compatibility)
 */
export const fetchAllYears = async (
	geography: string,
	segment: string,
	startYear: number = 2025,
	endYear: number = 2044,
	scenarioId?: string,
	customFetch?: typeof fetch
): Promise<DemandRow[]> => {
	const start = `${startYear}-01-01T00:00:00Z`;
	const end = `${endYear + 1}-01-01T00:00:00Z`;

	return fetchTimeseries(geography, segment, start, end, '1Y', 'sum', scenarioId, customFetch);
};

/**
 * Calculate segment data from demand data by aggregating segments
 * @param demandData - Array of DemandRow objects
 * @param geography - Geography ID to filter by
 * @returns Array of {segment, value} objects
 */
export const calculateSegmentData = (demandData: DemandRow[], geography: string) => {
	if (!demandData || demandData.length === 0) {
		return [];
	}

	// If geography is 'total' or 'all', aggregate across all geographies
	// Otherwise filter for specific geography
	const geoData =
		geography === 'total' || geography === 'all'
			? demandData
			: demandData.filter((item) => item.geography === geography);

	// Aggregate by segment (which represents segments)
	const segmentTotals = geoData.reduce(
		(acc, item) => {
			acc[item.segment] = (acc[item.segment] || 0) + item.value;
			return acc;
		},
		{} as Record<string, number>
	);

	return Object.entries(segmentTotals).map(([segment, value]) => ({ segment, value }));
};

/**
 * Calculate histogram bins from demand data
 * @param data - Array of DemandRow objects
 * @param field - Field name to create histogram from ('value' typically)
 * @param numBins - Number of histogram bins to create
 * @returns Array of bin objects with x0, x1, length properties
 */
export const calculateHistogram = (data: DemandRow[], field: keyof DemandRow, numBins: number) => {
	if (!data || data.length === 0) {
		return [];
	}

	// Extract the relevant field values (ensure numeric)
	const values = data
		.map((entry) => {
			const val = entry[field];
			return typeof val === 'number' ? val : 0;
		})
		.filter((val) => !isNaN(val));

	if (values.length === 0) {
		return [];
	}

	// Find min and max values (avoid spread operator for large arrays to prevent stack overflow)
	let minVal = values[0];
	let maxVal = values[0];
	for (let i = 1; i < values.length; i++) {
		if (values[i] < minVal) minVal = values[i];
		if (values[i] > maxVal) maxVal = values[i];
	}

	// Handle edge case where all values are the same
	if (minVal === maxVal) {
		return [
			{
				x0: minVal,
				x1: minVal + 1,
				length: values.length
			}
		];
	}

	// Calculate bin width
	const binWidth = (maxVal - minVal) / numBins;

	// Initialize bins
	const bins = Array.from({ length: numBins }, (_, i) => ({
		x0: minVal + i * binWidth,
		x1: minVal + (i + 1) * binWidth,
		length: 0
	}));

	// Populate bins
	values.forEach((value) => {
		const binIndex = Math.min(Math.floor((value - minVal) / binWidth), numBins - 1);
		bins[binIndex].length += 1;
	});

	return bins;
};

/**
 * Merge demand data into GeoJSON features by matching geography IDs
 * @param geojson - GeoJSON FeatureCollection
 * @param demandData - Array of DemandRow objects
 * @param year - Year for the data (filters data to only this year)
 * @returns Updated GeoJSON with demand data merged into properties
 */
export const mergeGeoData = (geojson: any, demandData: DemandRow[], year: number) => {
	if (!geojson || !geojson.features || !demandData) {
		return geojson || { type: 'FeatureCollection', features: [] };
	}

	// Create a map of geography -> aggregated values by segment
	const dataMap = new Map<string, Record<string, number>>();

	// Filter data to only the specified year before merging
	demandData
		.filter((row) => {
			const rowYear = row.timestamp_year || (row.period ? new Date(row.period).getFullYear() : null);
			return rowYear === year;
		})
		.forEach((row) => {
			if (!dataMap.has(row.geography)) {
				dataMap.set(row.geography, {});
			}
			const geoData = dataMap.get(row.geography)!;
			geoData[row.segment] = (geoData[row.segment] || 0) + row.value;
			if (row.segment !== 'total') {
				geoData['total'] = (geoData['total'] || 0) + row.value;
			}
		});

	// Return new feature objects instead of mutating the input in place — the
	// input may be wrapped in Svelte's $state proxy (e.g. when it flows through
	// viewStore.pageData), and mutating proxied state inside a $derived
	// triggers a state_unsafe_mutation error.
	const updatedFeatures = geojson.features.map((feature: any) => {
		const geoID = feature.properties?.geo_id;
		if (!geoID) return feature;

		const base: Record<string, unknown> = { ...feature, id: geoID };
		if (dataMap.has(geoID)) {
			base.properties = {
				...feature.properties,
				...dataMap.get(geoID),
				geography: geoID,
				year: year
			};
		}
		return base;
	});

	return { ...geojson, features: updatedFeatures };
};

// Export types for use by other modules
export type {
	DemandRow,
	ApiConfig,
	Scenario,
	Parameters,
	Globals,
	GeoJsonFeatureCollection,
	ApiError,
	Strategy2Config,
	Strategy2Parameter,
	Strategy2ParameterValue,
	Strategy2BaseScenario,
	ParameterValues
} from '../types/api';
