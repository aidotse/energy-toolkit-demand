/**
 * Tests for SectorPieChart component
 *
 * Smoke tests for the custom-SVG pie chart. SectorPieChart fetches its own
 * data via dataService on mount; the MSW handler returns a minimal echo payload
 * so we mostly verify that rendering doesn't crash, the title appears, and
 * the comparison props are accepted.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte/svelte5';
import SectorPieChart from './SectorPieChart.svelte';

describe('SectorPieChart', () => {
	it('should render with required props', () => {
		const { container } = render(SectorPieChart, {
			props: { geography: '01', year: 2030 }
		});
		expect(container.querySelector('.chart-container')).toBeTruthy();
	});

	it('should display chart title', () => {
		render(SectorPieChart, {
			props: { geography: '01', year: 2030 }
		});
		const titles = screen.getAllByText(/Sektoruppdelning/i);
		expect(titles.length).toBeGreaterThan(0);
	});

	it('should apply custom className', () => {
		const { container } = render(SectorPieChart, {
			props: { geography: '01', year: 2030, class: 'custom-sector-pie' }
		});
		expect(container.querySelector('.custom-sector-pie')).toBeTruthy();
	});

	it('should accept enableComparison prop without crashing', () => {
		const { container } = render(SectorPieChart, {
			props: {
				geography: '01',
				year: 2030,
				enableComparison: true,
				initialComparisonMode: 'base'
			}
		});
		expect(container.querySelector('.chart-container')).toBeTruthy();
	});

	it('should accept year-mode comparison props', () => {
		const { container } = render(SectorPieChart, {
			props: {
				geography: '01',
				year: 2030,
				enableComparison: true,
				comparisonYear: 2025,
				initialComparisonMode: 'year'
			}
		});
		expect(container.querySelector('.chart-container')).toBeTruthy();
	});

	it('should accept per-chart scenario override', () => {
		const { container } = render(SectorPieChart, {
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
