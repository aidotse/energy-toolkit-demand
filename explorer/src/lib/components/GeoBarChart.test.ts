/**
 * Tests for GeoBarChart component
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte/svelte5';
import GeoBarChart from './GeoBarChart.svelte';

describe('GeoBarChart', () => {
	const mockGeoData = [
		{ geography: '01', value: 1000, total: 1000 },
		{ geography: '03', value: 800, total: 800 },
		{ geography: '04', value: 1200, total: 1200 }
	];

	const mockParameterData = {
		geographies: [
			{ geo_id: '01', geo_name: 'Stockholm' },
			{ geo_id: '03', geo_name: 'Uppsala' },
			{ geo_id: '04', geo_name: 'Södermanland' }
		]
	};

	const mockScenario = {
		id: 'test-scenario',
		scenario_id: 'test-scenario',
		name: 'Test Scenario',
		description: 'Test description',
		color: '#47B3FF'
	};

	it('should render with required props', () => {
		const { container } = render(GeoBarChart, {
			props: {
				data: mockGeoData,
				parameterData: mockParameterData,
				year: 2030
			}
		});

		expect(container.querySelector('.chart-container')).toBeTruthy();
	});

	it('should display chart title', () => {
		render(GeoBarChart, {
			props: {
				data: mockGeoData,
				parameterData: mockParameterData,
				year: 2030
			}
		});

		const titles = screen.getAllByText(/Årlig energiförbrukning per geografi/i);
		expect(titles.length).toBeGreaterThan(0);
	});

	it('should display empty state when no data', () => {
		render(GeoBarChart, {
			props: {
				data: [],
				parameterData: mockParameterData,
				year: 2030
			}
		});

		const emptyStates = screen.getAllByText(/Ingen.*data/i);
		expect(emptyStates.length).toBeGreaterThan(0);
	});

	it('should apply custom className', () => {
		const { container } = render(GeoBarChart, {
			props: {
				data: mockGeoData,
				parameterData: mockParameterData,
				year: 2030,
				class: 'custom-geo-chart-class'
			}
		});

		const chartContainer = container.querySelector('.custom-geo-chart-class');
		expect(chartContainer).toBeTruthy();
	});

	it('should render with single scenario', () => {
		const { container } = render(GeoBarChart, {
			props: {
				data: mockGeoData,
				parameterData: mockParameterData,
				year: 2030,
				scenarios: [mockScenario],
				comparisonMode: false
			}
		});

		expect(container.querySelector('.chart-container')).toBeTruthy();
	});

	it('should support comparison mode with multiple scenarios', () => {
		const scenario2 = {
			...mockScenario,
			id: 'scenario-2',
			scenario_id: 'scenario-2',
			name: 'Scenario 2',
			color: '#FF6B47'
		};

		const { container } = render(GeoBarChart, {
			props: {
				data: mockGeoData,
				parameterData: mockParameterData,
				year: 2030,
				scenarios: [mockScenario, scenario2],
				comparisonMode: true
			}
		});

		expect(container.querySelector('.chart-container')).toBeTruthy();
	});

	it('should handle different years', () => {
		const { container } = render(GeoBarChart, {
			props: {
				data: mockGeoData,
				parameterData: mockParameterData,
				year: 2045
			}
		});

		expect(container.querySelector('.chart-container')).toBeTruthy();
	});

	it('should filter out invalid geographies', () => {
		const dataWithInvalid = [
			...mockGeoData,
			{ geography: '00', value: 500, total: 500 } // Invalid geography code
		];

		const { container } = render(GeoBarChart, {
			props: {
				data: dataWithInvalid,
				parameterData: mockParameterData,
				year: 2030
			}
		});

		// Should render without error (component filters out '00')
		expect(container.querySelector('.chart-container')).toBeTruthy();
	});
});
