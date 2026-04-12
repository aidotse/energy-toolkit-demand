/**
 * Type definitions for the Demand Toolkit API
 */

export interface UnitConfig {
	prefix: string; // SI prefix: '', 'k', 'M', 'G', 'T'
	unit: string; // Base unit: 'Wh', 'W'
}

export interface UnitsConfig {
	energy: UnitConfig;
	power: UnitConfig;
}

export interface DemandRow {
	/** Start of the aggregation bucket this row represents (ISO 8601 / Date). */
	period: Date;
	value: number;
	geography: string;
	segment: string;
	scenario_id: string;
	/** Convenience year extracted from `period`, useful when grouping without re-parsing. */
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
	units?: UnitsConfig;
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
	strategy2?: Strategy2Config;
	[key: string]: any;
}

export interface Globals {
	lower_bound?: number;
	upper_bound?: number;
	units?: UnitsConfig;
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

/**
 * Strategy 2 parameter value option
 */
export interface Strategy2ParameterValue {
	index: number;
	label: string;
	value: number; // Actual numeric value (e.g., -10 for "-10%", 15 for "15%")
	hasData: boolean;
}

/**
 * Strategy 2 parameter definition
 */
export interface Strategy2Parameter {
	name: string;
	segment: string;
	description: string;
	operation: 'multiply' | 'add';
	baselineIndex?: number; // Index of the baseline value (default: 0)
	values: Strategy2ParameterValue[];
}

/**
 * Strategy 2 base scenario
 */
export interface Strategy2BaseScenario {
	id: string;
	name: string;
	default: boolean;
}

/**
 * Strategy 2 configuration from /parameters endpoint
 */
export interface Strategy2Config {
	strategy: 2;
	baseScenarios: Strategy2BaseScenario[];
	parameters: Record<string, Omit<Strategy2Parameter, 'name'>>;
	bySegment: Record<string, Strategy2Parameter[]>;
	defaults: Record<string, number>;
}

/**
 * Runtime parameter values for API queries
 */
export interface ParameterValues {
	[paramName: string]: number;
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
