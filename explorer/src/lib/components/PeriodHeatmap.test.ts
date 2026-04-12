/**
 * Smoke tests for PeriodHeatmap component
 *
 * PeriodHeatmap fetches demand data via dataService on mount. MSW handles the
 * /demand call with an echo payload. These tests verify the component renders
 * without throwing, exposes its title, and accepts its optional props.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte/svelte5';
import PeriodHeatmap from './PeriodHeatmap.svelte';

describe('PeriodHeatmap', () => {
	it('should render with required props', () => {
		const { container } = render(PeriodHeatmap, {
			props: { geography: '01', year: 2030 }
		});
		expect(container.querySelector('.chart-container')).toBeTruthy();
	});

	it('should display chart title', () => {
		render(PeriodHeatmap, { props: { geography: '01', year: 2030 } });
		const titles = screen.getAllByText(/Effektbehov per månad/i);
		expect(titles.length).toBeGreaterThan(0);
	});

	it('should apply custom className', () => {
		const { container } = render(PeriodHeatmap, {
			props: { geography: '01', year: 2030, class: 'custom-heatmap' }
		});
		expect(container.querySelector('.custom-heatmap')).toBeTruthy();
	});

	it('should accept segment prop', () => {
		const { container } = render(PeriodHeatmap, {
			props: { geography: '01', year: 2030, segment: 'housing' }
		});
		expect(container.querySelector('.chart-container')).toBeTruthy();
	});

	it('should accept per-chart scenario override', () => {
		const { container } = render(PeriodHeatmap, {
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
