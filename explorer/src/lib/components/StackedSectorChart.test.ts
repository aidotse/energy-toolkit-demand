/**
 * Smoke tests for StackedSectorChart component
 *
 * StackedSectorChart fetches a 25-year yearly demand series via dataService on
 * mount. MSW handles the /demand call with an echo payload. These tests verify
 * that the component renders without throwing and exposes its title/props.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte/svelte5';
import StackedSectorChart from './StackedSectorChart.svelte';

describe('StackedSectorChart', () => {
	it('should render with required props', () => {
		const { container } = render(StackedSectorChart, {
			props: { geography: 'total' }
		});
		expect(container.querySelector('.chart-container')).toBeTruthy();
	});

	it('should display chart title', () => {
		render(StackedSectorChart, { props: { geography: 'total' } });
		const titles = screen.getAllByText(/Sektorer över tid/i);
		expect(titles.length).toBeGreaterThan(0);
	});

	it('should apply custom className', () => {
		const { container } = render(StackedSectorChart, {
			props: { geography: 'total', class: 'custom-stacked' }
		});
		expect(container.querySelector('.custom-stacked')).toBeTruthy();
	});

	it('should accept geography override', () => {
		const { container } = render(StackedSectorChart, {
			props: { geography: '01' }
		});
		expect(container.querySelector('.chart-container')).toBeTruthy();
	});

	it('should accept per-chart scenario override', () => {
		const { container } = render(StackedSectorChart, {
			props: {
				geography: 'total',
				baseScenarioOverride: 'international-growth',
				parameterValuesOverride: {}
			}
		});
		expect(container.querySelector('.chart-container')).toBeTruthy();
	});
});
