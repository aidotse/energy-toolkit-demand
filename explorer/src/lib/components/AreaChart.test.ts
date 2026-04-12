/**
 * Tests for AreaChart component
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte/svelte5';
import AreaChart from './AreaChart.svelte';
import { viz } from '$lib/colors';

describe('AreaChart', () => {
	const mockYearData = [
		{ period: '2025-01-01', value: 100 },
		{ period: '2026-01-01', value: 150 },
		{ period: '2027-01-01', value: 200 }
	];

	const mockScenario = {
		id: 'test-scenario',
		scenario_id: 'test-scenario',
		name: 'Test Scenario',
		description: 'Test description',
		color: viz.line
	};

	it('should render with required props', () => {
		const { container } = render(AreaChart, {
			props: {
				data: mockYearData,
				geography: '01',
				year: 2030
			}
		});

		// Should render the ChartContainer
		expect(container.querySelector('.chart-container')).toBeTruthy();
	});

	it('should display chart title', () => {
		render(AreaChart, {
			props: {
				data: mockYearData,
				geography: '01',
				year: 2030,
				aggregation: 'sum'
			}
		});

		// Title should show "Årlig energi" for sum aggregation
		const titles = screen.getAllByText(/Årlig energi/i);
		expect(titles.length).toBeGreaterThan(0);
	});

	it('should display empty state when no data', () => {
		const { container } = render(AreaChart, {
			props: {
				data: [],
				geography: '01',
				year: 2030
			}
		});

		// Since data is empty and component will try to fetch, it should show loading or empty state
		const loadingOrEmpty =
			container.querySelector('[role="status"]') || screen.queryByText(/Ingen data/i);
		expect(loadingOrEmpty).toBeTruthy();
	});

	it('should apply custom className', () => {
		const { container } = render(AreaChart, {
			props: {
				data: mockYearData,
				geography: '01',
				year: 2030,
				class: 'custom-chart-class'
			}
		});

		const chartContainer = container.querySelector('.custom-chart-class');
		expect(chartContainer).toBeTruthy();
	});

	it('should accept aggregation prop', () => {
		const { container } = render(AreaChart, {
			props: {
				data: mockYearData,
				geography: '01',
				year: 2030,
				aggregation: 'mean'
			}
		});

		// Title should reflect mean aggregation
		const titles = screen.getAllByText(/medeleffekt/i);
		expect(titles.length).toBeGreaterThan(0);
	});

	it('should accept max aggregation', () => {
		render(AreaChart, {
			props: {
				data: mockYearData,
				geography: '01',
				year: 2030,
				aggregation: 'max'
			}
		});

		// Title should reflect max aggregation
		const titles = screen.getAllByText(/maxeffekt/i);
		expect(titles.length).toBeGreaterThan(0);
	});

	it('should render with single scenario', () => {
		const { container } = render(AreaChart, {
			props: {
				data: mockYearData,
				geography: '01',
				year: 2030,
				scenarios: [mockScenario],
				comparisonMode: false
			}
		});

		// Should render without comparison mode UI
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

		const { container } = render(AreaChart, {
			props: {
				data: mockYearData,
				geography: '01',
				year: 2030,
				scenarios: [mockScenario, scenario2],
				comparisonMode: true
			}
		});

		// Should render the chart
		expect(container.querySelector('.chart-container')).toBeTruthy();
	});

	it('should accept displayAxes prop', () => {
		const { container } = render(AreaChart, {
			props: {
				data: mockYearData,
				geography: '01',
				year: 2030,
				displayAxes: false
			}
		});

		expect(container.querySelector('.chart-container')).toBeTruthy();
	});

	it('should handle year filtering', () => {
		const dataWithFutureYears = [
			{ period: '2025-01-01', value: 100 },
			{ period: '2030-01-01', value: 150 },
			{ period: '2050-01-01', value: 200 }
		];

		const { container } = render(AreaChart, {
			props: {
				data: dataWithFutureYears,
				geography: '01',
				year: 2035
			}
		});

		// Should render and filter data by year
		expect(container.querySelector('.chart-container')).toBeTruthy();
	});
});
