/**
 * Smoke tests for FlexImpactChart component
 *
 * FlexImpactChart fetches hourly demand data via dataService on mount. MSW
 * handles the /demand call with an echo payload. These tests verify that the
 * component renders without throwing and exposes its title and props.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte/svelte5';
import FlexImpactChart from './FlexImpactChart.svelte';

describe('FlexImpactChart', () => {
	it('should render with required props', () => {
		const { container } = render(FlexImpactChart, {
			props: { geography: '01', year: 2030 }
		});
		expect(container.querySelector('.chart-container')).toBeTruthy();
	});

	it('should display chart title', () => {
		render(FlexImpactChart, { props: { geography: '01', year: 2030 } });
		const titles = screen.getAllByText(/Effekt av flexibilitet/i);
		expect(titles.length).toBeGreaterThan(0);
	});

	it('should apply custom className', () => {
		const { container } = render(FlexImpactChart, {
			props: { geography: '01', year: 2030, class: 'custom-flex-impact' }
		});
		expect(container.querySelector('.custom-flex-impact')).toBeTruthy();
	});

	it('should accept segment prop', () => {
		const { container } = render(FlexImpactChart, {
			props: { geography: '01', year: 2030, segment: 'transport' }
		});
		expect(container.querySelector('.chart-container')).toBeTruthy();
	});

	it('should accept per-chart scenario override', () => {
		const { container } = render(FlexImpactChart, {
			props: {
				geography: '01',
				year: 2030,
				baseScenarioOverride: 'international-growth',
				parameterValuesOverride: {}
			}
		});
		expect(container.querySelector('.chart-container')).toBeTruthy();
	});
});
