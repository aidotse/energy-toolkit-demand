/**
 * Smoke tests for GeoSegmentChart component
 *
 * GeoSegmentChart fetches demand per geography from dataService on mount. MSW
 * handles the /demand call with an echo payload. These tests verify that the
 * component renders without throwing, exposes its title, and accepts its props.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte/svelte5';
import GeoSegmentChart from './GeoSegmentChart.svelte';

describe('GeoSegmentChart', () => {
	const parameterData = {
		geographies: [
			{ geo_id: '01', geo_name: 'Stockholms län' },
			{ geo_id: '03', geo_name: 'Uppsala län' },
			{ geo_id: '04', geo_name: 'Södermanlands län' }
		]
	};

	it('should render with required props', () => {
		const { container } = render(GeoSegmentChart, {
			props: { year: 2030, parameterData }
		});
		expect(container.querySelector('.chart-container')).toBeTruthy();
	});

	it('should display chart title', () => {
		render(GeoSegmentChart, { props: { year: 2030, parameterData } });
		const titles = screen.getAllByText(/Sektorernas andel/i);
		expect(titles.length).toBeGreaterThan(0);
	});

	it('should apply custom className', () => {
		const { container } = render(GeoSegmentChart, {
			props: { year: 2030, parameterData, class: 'custom-geo-segment' }
		});
		expect(container.querySelector('.custom-geo-segment')).toBeTruthy();
	});

	it('should accept segment prop', () => {
		const { container } = render(GeoSegmentChart, {
			props: { year: 2030, parameterData, segment: 'transport' }
		});
		expect(container.querySelector('.chart-container')).toBeTruthy();
	});

	it('should accept per-chart scenario override', () => {
		const { container } = render(GeoSegmentChart, {
			props: {
				year: 2030,
				parameterData,
				baseScenarioOverride: 'international-growth',
				parameterValuesOverride: {}
			}
		});
		expect(container.querySelector('.chart-container')).toBeTruthy();
	});
});
