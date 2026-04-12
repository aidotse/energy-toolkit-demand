/**
 * Mock Data for Tests
 *
 * Common mock data patterns used across test files
 */
import { viz } from '$lib/colors';

/**
 * Mock API parameters
 */
export const mockParameters = {
	years: [2025, 2030, 2035, 2040, 2045, 2050],
	geographies: ['total', 'stockholm', 'gothenburg', 'malmo'],
	segments: ['total', 'housing', 'transport', 'industry'],
	resolutions: ['1h', '1d', '1w', '1M', '1Y'],
	aggregations: ['sum', 'mean', 'max']
};

/**
 * Mock scenarios
 */
export const mockScenarios = [
	{
		scenarioId: 'base',
		name: 'Base Scenario',
		description: 'Base forecast scenario',
		color: viz.scenario.primary
	},
	{
		scenarioId: 'high',
		name: 'High Growth',
		description: 'High growth scenario',
		color: '#ef4444'
	},
	{
		scenarioId: 'low',
		name: 'Low Growth',
		description: 'Low growth scenario',
		color: viz.scenario.secondary
	}
];

/**
 * Mock hourly time series data
 */
export const mockHourlyData = Array.from({ length: 24 }, (_, hour) => ({
	timestamp: `2025-01-15T${String(hour).padStart(2, '0')}:00:00`,
	value: 50 + Math.random() * 50
}));

/**
 * Mock daily time series data
 */
export const mockDailyData = Array.from({ length: 365 }, (_, day) => {
	const date = new Date(2025, 0, 1);
	date.setDate(date.getDate() + day);
	return {
		timestamp: date.toISOString().split('T')[0],
		value: 1000 + Math.random() * 500
	};
});

/**
 * Mock yearly time series data
 */
export const mockYearlyData = Array.from({ length: 6 }, (_, i) => ({
	timestamp: String(2025 + i * 5),
	value: 50000 + i * 10000 + Math.random() * 5000
}));

/**
 * Mock histogram data
 */
export const mockHistogramData = {
	bins: Array.from({ length: 20 }, (_, i) => ({
		min: i * 10,
		max: (i + 1) * 10,
		count: Math.floor(Math.random() * 100)
	})),
	statistics: {
		min: 0,
		max: 200,
		mean: 100,
		median: 95,
		p95: 180
	}
};

/**
 * Mock sector breakdown data
 */
export const mockSectorData = [
	{ segment: 'housing', value: 45000, percentage: 45 },
	{ segment: 'transport', value: 30000, percentage: 30 },
	{ segment: 'industry', value: 25000, percentage: 25 }
];

/**
 * Mock geographic data
 */
export const mockGeographicData = [
	{ geography: 'stockholm', value: 40000, name: 'Stockholm' },
	{ geography: 'gothenburg', value: 25000, name: 'Gothenburg' },
	{ geography: 'malmo', value: 20000, name: 'Malmö' },
	{ geography: 'other', value: 15000, name: 'Other' }
];

/**
 * Mock GeoJSON feature
 */
export const mockGeoJSONFeature = {
	type: 'Feature' as const,
	properties: {
		name: 'Stockholm',
		geography: 'stockholm',
		value: 40000
	},
	geometry: {
		type: 'Polygon' as const,
		coordinates: [
			[
				[18.0, 59.3],
				[18.1, 59.3],
				[18.1, 59.4],
				[18.0, 59.4],
				[18.0, 59.3]
			]
		]
	}
};

/**
 * Mock GeoJSON FeatureCollection
 */
export const mockGeoJSON = {
	type: 'FeatureCollection' as const,
	features: [mockGeoJSONFeature]
};

/**
 * Mock API response for demand data
 */
export const mockDemandResponse = {
	data: mockDailyData,
	metadata: {
		scenarioId: 'base',
		geography: 'total',
		segment: 'total',
		resolution: '1d',
		aggregation: 'sum',
		start: '2025-01-01',
		end: '2025-12-31'
	}
};

/**
 * Mock error response
 */
export const mockErrorResponse = {
	error: 'Not Found',
	message: 'The requested resource was not found',
	statusCode: 404
};

/**
 * Create mock fetch response
 */
export function createMockResponse<T>(data: T, options?: { status?: number; ok?: boolean }) {
	return {
		ok: options?.ok ?? true,
		status: options?.status ?? 200,
		json: async () => data,
		text: async () => JSON.stringify(data)
	};
}
