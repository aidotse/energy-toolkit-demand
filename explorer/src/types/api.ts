/**
 * Type definitions for the Demand Toolkit API
 */

export interface DemandRow {
    timestamp: Date;
    value: number;
    geography: string;
    segment: string;
    scenario_id: string;
    timestamp_year: number;
}

export interface ApiConfig {
    name: string;
    access: 'public' | 'private';
    start?: string;
    end?: string;
    baseResolution?: string;
    baseAggregation?: string;
    start_year?: number;
    end_year?: number;
    resolution?: string;
    [key: string]: any;
}

export interface Scenario {
    id: string;
    scenario_id?: string;
    name?: string;
    default?: boolean;
    growth?: number;
    [key: string]: any;
}

export interface Geography {
    geo_id: string;
    geo_name: string;
    geo_type?: string;
    [key: string]: any;
}

export interface Parameters {
    geographies?: Geography[];
    scenarios?: Scenario[];
    segments?: string[];
    years?: number[];
    filter?: {
        year?: number[];
        [key: string]: any;
    };
    [key: string]: any;
}

export interface Globals {
    lower_bound?: number;
    upper_bound?: number;
    [key: string]: any;
}

export interface GeoJsonFeature {
    type: 'Feature';
    properties: {
        geo_id: string;
        geo_name?: string;
        [key: string]: any;
    };
    geometry: any;
}

export interface GeoJsonFeatureCollection {
    type: 'FeatureCollection';
    features: GeoJsonFeature[];
}

export interface ApiError extends Error {
    status?: number;
    statusText?: string;
    url?: string;
}

export interface LoaderData {
    config: ApiConfig | null;
    scenarios: Scenario[];
    parameters: Parameters;
    globals: Globals;
    year: number;
    geography: string;
    segment: string;
    scenario: Scenario | null;
    geojson: GeoJsonFeatureCollection;
    hourData: DemandRow[];
    dayData: DemandRow[];
    yearData: DemandRow[];
    allYearsData: DemandRow[];
}