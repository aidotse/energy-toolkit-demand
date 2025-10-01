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
    ApiError
} from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * Create an API error with additional context
 */
const createApiError = (message: string, url?: string, status?: number, statusText?: string): ApiError => {
    const error = new Error(message) as ApiError;
    error.url = url;
    error.status = status;
    error.statusText = statusText;
    return error;
};

/**
 * Basic JSON fetch with enhanced error handling
 */
export const fetchJSON = async (url: string): Promise<any> => {
    try {
        const response = await fetch(url);
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
 */
export const fetchDemandData = async (queryParams: URLSearchParams): Promise<DemandRow[]> => {
    const url = `${API_BASE_URL}/demand?${queryParams.toString()}`;

    try {
        const data = await fetchJSON(url);

        // Validate and transform the data
        return data
            .filter((row: any) => (row.period || row.timestamp) && row.value !== undefined && row.geography && row.segment)
            .map((row: any) => ({
                timestamp: new Date(row.period || row.timestamp),
                value: parseFloat(row.value),
                geography: row.geography,
                segment: row.segment,
                scenario_id: row.scenario_id,
                timestamp_year: row.timestamp_year || new Date(row.period || row.timestamp).getFullYear()
            }));
    } catch (error) {
        console.warn('Failed to fetch demand data, returning empty array:', error);
        return [];
    }
};

/**
 * Fetch configuration from /config endpoint
 */
export const fetchConfig = async (): Promise<ApiConfig> => {
    try {
        return await fetchJSON(`${API_BASE_URL}/config`);
    } catch (error) {
        console.warn('Failed to fetch config, using fallback:', error);
        return {
            name: 'Energy Demand Toolkit',
            access: 'public',
            start_year: 2025,
            end_year: 2050,
            resolution: '1h'
        };
    }
};

/**
 * Fetch available scenarios from /scenarios endpoint
 */
export const fetchScenarios = async (): Promise<Scenario[]> => {
    try {
        return await fetchJSON(`${API_BASE_URL}/scenarios`);
    } catch (error) {
        console.warn('Failed to fetch scenarios, using fallback:', error);
        return [{
            id: 'default',
            scenario_id: 'default',
            name: 'Default Scenario',
            default: true,
            growth: 1.0
        }];
    }
};

/**
 * Fetch parameter definitions from /parameters endpoint
 */
export const fetchParameters = async (): Promise<Parameters> => {
    try {
        return await fetchJSON(`${API_BASE_URL}/parameters`);
    } catch (error) {
        console.warn('Failed to fetch parameters, using fallback:', error);
        return {
            geographies: [],
            scenarios: [],
            segments: ['total'],
            years: [2025, 2030, 2035, 2040, 2045, 2050],
            filter: {
                year: [2025, 2050]
            }
        };
    }
};

/**
 * Fetch global statistics from /globals endpoint
 */
export const fetchGlobals = async (): Promise<Globals> => {
    try {
        return await fetchJSON(`${API_BASE_URL}/globals`);
    } catch (error) {
        console.warn('Failed to fetch globals, using fallback:', error);
        return {
            lower_bound: 0,
            upper_bound: 1000000
        };
    }
};

/**
 * Fetch geographic data from /geographies endpoint
 * @param format - 'json' for metadata or 'geojson' for spatial data
 */
export const fetchGeographies = async (format: 'json' | 'geojson' = 'json'): Promise<any> => {
    try {
        return await fetchJSON(`${API_BASE_URL}/geographies?format=${format}`);
    } catch (error) {
        console.warn('Failed to fetch geographies, using fallback:', error);
        if (format === 'geojson') {
            return {
                type: 'FeatureCollection',
                features: []
            } as GeoJsonFeatureCollection;
        } else {
            return [];
        }
    }
};

/**
 * Fetch available aggregations from /aggregations endpoint
 */
export const fetchAggregations = async (): Promise<any[]> => {
    try {
        return await fetchJSON(`${API_BASE_URL}/aggregations`);
    } catch (error) {
        console.warn('Failed to fetch aggregations, using fallback:', error);
        return [
            { resolution: '1h', aggregation: ['mean', 'sum'] },
            { resolution: '1d', aggregation: ['sum'] },
            { resolution: '1Y', aggregation: ['sum'] }
        ];
    }
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
 */
export const fetchTimeseries = async (
    geography: string,
    segment: string,
    start: string,
    end: string,
    resolution: string = '1h',
    aggregation: string = 'sum',
    scenarioId?: string
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

    return fetchDemandData(params);
};

/**
 * Fetch yearly aggregated data
 * @param geography - Geography ID
 * @param segment - Segment ID
 * @param year - Year (will fetch full year data)
 * @param scenarioId - Scenario ID (optional)
 */
export const fetchYearly = async (
    geography: string,
    segment: string,
    year: number,
    scenarioId?: string
): Promise<DemandRow[]> => {
    const start = `${year}-01-01T00:00:00Z`;
    const end = `${year + 1}-01-01T00:00:00Z`;

    return fetchTimeseries(geography, segment, start, end, '1Y', 'sum', scenarioId);
};

/**
 * Fetch data for all available years
 * @param geography - Geography ID
 * @param segment - Segment ID
 * @param startYear - Start year (optional, defaults to 2025)
 * @param endYear - End year (optional, defaults to 2044)
 * @param scenarioId - Scenario ID (optional)
 */
export const fetchAllYears = async (
    geography: string,
    segment: string,
    startYear: number = 2025,
    endYear: number = 2044,
    scenarioId?: string
): Promise<DemandRow[]> => {
    const start = `${startYear}-01-01T00:00:00Z`;
    const end = `${endYear + 1}-01-01T00:00:00Z`;

    return fetchTimeseries(geography, segment, start, end, '1Y', 'sum', scenarioId);
};

/**
 * Calculate sector data from demand data by aggregating segments
 * @param demandData - Array of DemandRow objects
 * @param geography - Geography ID to filter by
 * @returns Array of {sector, value} objects
 */
export const calculateSectorData = (demandData: DemandRow[], geography: string) => {
    if (!demandData || demandData.length === 0) {
        return [];
    }

    // If geography is 'total' or 'all', aggregate across all geographies
    // Otherwise filter for specific geography
    const geoData = (geography === 'total' || geography === 'all')
        ? demandData
        : demandData.filter(item => item.geography === geography);

    // Aggregate by segment (which represents sectors)
    const sectorTotals = geoData.reduce((acc, item) => {
        acc[item.segment] = (acc[item.segment] || 0) + item.value;
        return acc;
    }, {} as Record<string, number>);

    return Object.entries(sectorTotals).map(([sector, value]) => ({ sector, value }));
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
    const values = data.map(entry => {
        const val = entry[field];
        return typeof val === 'number' ? val : 0;
    }).filter(val => !isNaN(val));

    if (values.length === 0) {
        return [];
    }

    // Find min and max values
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);

    // Handle edge case where all values are the same
    if (minVal === maxVal) {
        return [{
            x0: minVal,
            x1: minVal + 1,
            length: values.length
        }];
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
    values.forEach(value => {
        const binIndex = Math.min(Math.floor((value - minVal) / binWidth), numBins - 1);
        bins[binIndex].length += 1;
    });

    return bins;
};

/**
 * Merge demand data into GeoJSON features by matching geography IDs
 * @param geojson - GeoJSON FeatureCollection
 * @param demandData - Array of DemandRow objects
 * @param year - Year for the data
 * @returns Updated GeoJSON with demand data merged into properties
 */
export const mergeGeoData = (geojson: any, demandData: DemandRow[], year: number) => {
    if (!geojson || !geojson.features || !demandData) {
        return geojson || { type: 'FeatureCollection', features: [] };
    }

    // Create a map of geography -> aggregated values by segment
    const dataMap = new Map<string, Record<string, number>>();

    demandData.forEach(row => {
        if (!dataMap.has(row.geography)) {
            dataMap.set(row.geography, {});
        }
        const geoData = dataMap.get(row.geography)!;
        geoData[row.segment] = (geoData[row.segment] || 0) + row.value;
        geoData['total'] = (geoData['total'] || 0) + row.value;
    });

    const updatedFeatures = geojson.features.map((feature: any) => {
        const geoID = feature.properties?.geo_id;
        if (geoID) {
            feature.id = geoID;

            if (dataMap.has(geoID)) {
                feature.properties = {
                    ...feature.properties,
                    ...dataMap.get(geoID),
                    geography: geoID,
                    year: year,
                };
            }
        }

        return feature;
    });

    return { ...geojson, features: updatedFeatures };
};


// Export types for use by other modules
export type { DemandRow, ApiConfig, Scenario, Parameters, Globals, GeoJsonFeatureCollection, ApiError } from '../types/api';