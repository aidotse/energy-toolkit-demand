/**
 * MSW (Mock Service Worker) Request Handlers
 *
 * Intercepts API requests and returns mock data for testing
 */

import { http, HttpResponse } from 'msw';
import {
	mockParameters,
	mockScenarios,
	mockDailyData,
	mockHourlyData,
	mockYearlyData,
	mockGeoJSON,
	mockDemandResponse
} from '../mock-data';

// API base URL for mocking
const API_BASE_URL = 'http://localhost:4010';

export const handlers = [
	// GET /config - API configuration
	http.get(`${API_BASE_URL}/config`, () => {
		return HttpResponse.json({
			name: 'Energy Demand Toolkit',
			access: 'public',
			start_year: 2025,
			end_year: 2050,
			resolution: '1h'
		});
	}),

	// GET /scenarios - List of scenarios
	http.get(`${API_BASE_URL}/scenarios`, () => {
		return HttpResponse.json(mockScenarios);
	}),

	// GET /parameters - Available parameters
	http.get(`${API_BASE_URL}/parameters`, () => {
		return HttpResponse.json({
			geographies: mockParameters.geographies,
			scenarios: mockScenarios.map((s) => s.scenarioId),
			segments: mockParameters.segments,
			years: mockParameters.years,
			filter: {
				year: [2025, 2050]
			}
		});
	}),

	// GET /globals - Global statistics
	http.get(`${API_BASE_URL}/globals`, () => {
		return HttpResponse.json({
			lower_bound: 0,
			upper_bound: 1000000
		});
	}),

	// GET /geographies - Geography data (JSON or GeoJSON)
	http.get(`${API_BASE_URL}/geographies`, ({ request }) => {
		const url = new URL(request.url);
		const format = url.searchParams.get('format') || 'json';

		if (format === 'geojson') {
			return HttpResponse.json(mockGeoJSON);
		} else {
			return HttpResponse.json([
				{ id: 'total', name: 'Total', type: 'total' },
				{ id: 'stockholm', name: 'Stockholm', type: 'municipality' },
				{ id: 'gothenburg', name: 'Gothenburg', type: 'municipality' },
				{ id: 'malmo', name: 'Malmö', type: 'municipality' }
			]);
		}
	}),

	// GET /aggregations - Available aggregations
	http.get(`${API_BASE_URL}/aggregations`, () => {
		return HttpResponse.json([
			{ resolution: '1h', aggregation: ['mean', 'sum'] },
			{ resolution: '1d', aggregation: ['sum'] },
			{ resolution: '1M', aggregation: ['sum'] },
			{ resolution: '1Y', aggregation: ['sum'] }
		]);
	}),

	// GET /demand - Demand timeseries data
	http.get(`${API_BASE_URL}/demand`, ({ request }) => {
		const url = new URL(request.url);
		const resolution = url.searchParams.get('period[resolution]') || '1d';
		const geography = url.searchParams.get('geography') || 'total';
		const segment = url.searchParams.get('segment') || 'total';
		const scenarioId = url.searchParams.get('scenarioId') || 'base';

		// Return different mock data based on resolution
		let data;
		switch (resolution) {
			case '1h':
				data = mockHourlyData.map((item) => ({
					period: item.timestamp,
					value: item.value,
					geography,
					segment,
					scenario_id: scenarioId
				}));
				break;
			case '1Y':
				data = mockYearlyData.map((item) => ({
					period: item.timestamp,
					value: item.value,
					geography,
					segment,
					scenario_id: scenarioId
				}));
				break;
			default: // '1d', '1w', '1M'
				data = mockDailyData.map((item) => ({
					period: item.timestamp,
					value: item.value,
					geography,
					segment,
					scenario_id: scenarioId
				}));
		}

		return HttpResponse.json(data);
	}),

	// Error handler for unhandled requests (optional - helps catch missing mocks)
	http.get('*', ({ request }) => {
		console.warn(`Unhandled ${request.method} request to ${request.url}`);
		return HttpResponse.json(
			{ error: 'Not Found', message: 'Mock handler not configured for this endpoint' },
			{ status: 404 }
		);
	})
];
