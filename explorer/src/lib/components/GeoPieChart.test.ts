/**
 * Tests for GeoPieChart component
 *
 * Smoke tests for the layerchart-based top-4-counties pie chart. GeoPieChart
 * fetches its own demand data via dataService; the MSW handler returns a minimal
 * echo payload so these tests focus on "renders without crashing", the title,
 * and that the new comparison props are accepted.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte/svelte5';
import GeoPieChart from './GeoPieChart.svelte';

describe('GeoPieChart', () => {
	const mockGeographies = [
		{ geo_id: '01', geo_name: 'Stockholms län' },
		{ geo_id: '03', geo_name: 'Uppsala län' },
		{ geo_id: '04', geo_name: 'Södermanlands län' },
		{ geo_id: '05', geo_name: 'Östergötlands län' },
		{ geo_id: '06', geo_name: 'Jönköpings län' }
	];

	it('should render with required props', () => {
		const { container } = render(GeoPieChart, {
			props: { year: 2030, geographies: mockGeographies }
		});
		expect(container.querySelector('.chart-container')).toBeTruthy();
	});

	it('should display chart title', () => {
		render(GeoPieChart, {
			props: { year: 2030, geographies: mockGeographies }
		});
		const titles = screen.getAllByText(/Topp 4 län/i);
		expect(titles.length).toBeGreaterThan(0);
	});

	it('should apply custom className', () => {
		const { container } = render(GeoPieChart, {
			props: { year: 2030, geographies: mockGeographies, class: 'custom-geo-pie' }
		});
		expect(container.querySelector('.custom-geo-pie')).toBeTruthy();
	});

	it('should accept enableComparison prop without crashing', () => {
		const { container } = render(GeoPieChart, {
			props: {
				year: 2030,
				geographies: mockGeographies,
				enableComparison: true
			}
		});
		expect(container.querySelector('.chart-container')).toBeTruthy();
	});

	it('should accept segment override', () => {
		const { container } = render(GeoPieChart, {
			props: {
				year: 2030,
				geographies: mockGeographies,
				segment: 'housing'
			}
		});
		expect(container.querySelector('.chart-container')).toBeTruthy();
	});

	it('should accept per-chart scenario override', () => {
		const { container } = render(GeoPieChart, {
			props: {
				year: 2030,
				geographies: mockGeographies,
				baseScenarioOverride: 'international-growth',
				parameterValuesOverride: {}
			}
		});
		expect(container.querySelector('.chart-container')).toBeTruthy();
	});
});
