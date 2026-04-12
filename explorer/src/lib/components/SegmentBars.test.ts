/**
 * Tests for SegmentBars component
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte/svelte5';
import SegmentBars from './SegmentBars.svelte';
import { viz } from '$lib/colors';

describe('SegmentBars', () => {
	const mockSegmentData = [
		{ segment: 'housing', geography: '01', value: 500 },
		{ segment: 'transport', geography: '01', value: 300 },
		{ segment: 'industry', geography: '01', value: 200 }
	];

	const mockScenario = {
		id: 'test-scenario',
		scenario_id: 'test-scenario',
		name: 'Test Scenario',
		description: 'Test description',
		color: viz.line
	};

	it('should render with required props', () => {
		const { container } = render(SegmentBars, {
			props: {
				data: mockSegmentData,
				geography: '01',
				year: 2030
			}
		});

		expect(container.querySelector('.chart-container')).toBeTruthy();
	});

	it('should display chart title', () => {
		render(SegmentBars, {
			props: {
				data: mockSegmentData,
				geography: '01',
				year: 2030
			}
		});

		const titles = screen.getAllByText(/Energi per sektor/i);
		expect(titles.length).toBeGreaterThan(0);
	});

	it('should display empty state when no data', () => {
		render(SegmentBars, {
			props: {
				data: null,
				geography: '01',
				year: 2030
			}
		});

		const emptyStates = screen.getAllByText(/Ingen.*data/i);
		expect(emptyStates.length).toBeGreaterThan(0);
	});

	it('should apply custom className', () => {
		const { container } = render(SegmentBars, {
			props: {
				data: mockSegmentData,
				geography: '01',
				year: 2030,
				class: 'custom-segment-class'
			}
		});

		const chartContainer = container.querySelector('.custom-segment-class');
		expect(chartContainer).toBeTruthy();
	});

	it('should render with single scenario', () => {
		const { container } = render(SegmentBars, {
			props: {
				data: mockSegmentData,
				geography: '01',
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

		const { container } = render(SegmentBars, {
			props: {
				data: mockSegmentData,
				geography: '01',
				year: 2030,
				scenarios: [mockScenario, scenario2],
				comparisonMode: true
			}
		});

		expect(container.querySelector('.chart-container')).toBeTruthy();
	});

	it('should handle different geographies', () => {
		const { container } = render(SegmentBars, {
			props: {
				data: mockSegmentData,
				geography: '03',
				year: 2030
			}
		});

		expect(container.querySelector('.chart-container')).toBeTruthy();
	});

	it('should handle different years', () => {
		const { container } = render(SegmentBars, {
			props: {
				data: mockSegmentData,
				geography: '01',
				year: 2045
			}
		});

		expect(container.querySelector('.chart-container')).toBeTruthy();
	});

	it('should render segment data', () => {
		const { container } = render(SegmentBars, {
			props: {
				data: mockSegmentData,
				geography: '01',
				year: 2030
			}
		});

		// Should render the chart with data
		expect(container.querySelector('.chart-container')).toBeTruthy();
	});
});
