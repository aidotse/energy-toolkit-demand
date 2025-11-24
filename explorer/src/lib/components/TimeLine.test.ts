/**
 * Tests for TimeLine component
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte/svelte5';
import TimeLine from './TimeLine.svelte';

describe('TimeLine', () => {
	const mockDayData = Array.from({ length: 365 }, (_, i) => ({
		timestamp: new Date(2030, 0, i + 1),
		value: Math.random() * 1000 + 500
	}));

	const mockScenario = {
		id: 'test-scenario',
		scenario_id: 'test-scenario',
		name: 'Test Scenario',
		description: 'Test description',
		color: '#47B3FF'
	};

	it('should render with required props', () => {
		const { container } = render(TimeLine, {
			props: {
				data: mockDayData,
				geography: '01',
				year: 2030,
				segment: 'housing'
			}
		});

		expect(container.querySelector('.chart-container')).toBeTruthy();
	});

	it('should display chart title', () => {
		render(TimeLine, {
			props: {
				data: mockDayData,
				geography: '01',
				year: 2030,
				segment: 'housing'
			}
		});

		const titles = screen.getAllByText(/Tidslinje/i);
		expect(titles.length).toBeGreaterThan(0);
	});

	it('should display empty state when no data', () => {
		render(TimeLine, {
			props: {
				data: [],
				geography: '01',
				year: 2030,
				segment: 'housing'
			}
		});

		const emptyStates = screen.getAllByText(/Ingen data/i);
		expect(emptyStates.length).toBeGreaterThan(0);
	});

	it('should apply custom className', () => {
		const { container } = render(TimeLine, {
			props: {
				data: mockDayData,
				geography: '01',
				year: 2030,
				segment: 'housing',
				class: 'custom-timeline-class'
			}
		});

		const chartContainer = container.querySelector('.custom-timeline-class');
		expect(chartContainer).toBeTruthy();
	});

	it('should accept resolution prop', () => {
		const { container } = render(TimeLine, {
			props: {
				data: mockDayData,
				geography: '01',
				year: 2030,
				segment: 'housing',
				resolution: '1d'
			}
		});

		expect(container.querySelector('.chart-container')).toBeTruthy();
	});

	it('should accept aggregation prop', () => {
		const { container } = render(TimeLine, {
			props: {
				data: mockDayData,
				geography: '01',
				year: 2030,
				segment: 'housing',
				aggregation: 'sum'
			}
		});

		expect(container.querySelector('.chart-container')).toBeTruthy();
	});

	it('should render with single scenario', () => {
		const { container } = render(TimeLine, {
			props: {
				data: mockDayData,
				geography: '01',
				year: 2030,
				segment: 'housing',
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

		const { container } = render(TimeLine, {
			props: {
				data: mockDayData,
				geography: '01',
				year: 2030,
				segment: 'housing',
				scenarios: [mockScenario, scenario2],
				comparisonMode: true
			}
		});

		expect(container.querySelector('.chart-container')).toBeTruthy();
	});

	it('should handle different segments', () => {
		const { container } = render(TimeLine, {
			props: {
				data: mockDayData,
				geography: '01',
				year: 2030,
				segment: 'transport'
			}
		});

		expect(container.querySelector('.chart-container')).toBeTruthy();
	});
});
