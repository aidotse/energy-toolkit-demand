/**
 * Tests for Histogram component
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte/svelte5';
import Histogram from './Histogram.svelte';
import { viz } from '$lib/colors';

describe('Histogram', () => {
	const mockHourData = Array.from({ length: 24 }, (_, i) => ({
		timestamp: new Date(2030, 0, 1, i),
		value: Math.random() * 1000 + 500
	}));

	const mockScenario = {
		id: 'test-scenario',
		scenario_id: 'test-scenario',
		name: 'Test Scenario',
		description: 'Test description',
		color: viz.line
	};

	it('should render with required props', () => {
		const { container } = render(Histogram, {
			props: {
				data: mockHourData,
				geography: '01',
				year: 2030
			}
		});

		expect(container.querySelector('.chart-container')).toBeTruthy();
	});

	it('should display chart title', () => {
		render(Histogram, {
			props: {
				data: mockHourData,
				geography: '01',
				year: 2030
			}
		});

		const titles = screen.getAllByText(/Histogram över elbehovet/i);
		expect(titles.length).toBeGreaterThan(0);
	});

	it('should display empty state when no data', () => {
		render(Histogram, {
			props: {
				data: [],
				geography: '01',
				year: 2030
			}
		});

		const emptyStates = screen.getAllByText(/Ingen data/i);
		expect(emptyStates.length).toBeGreaterThan(0);
	});

	it('should apply custom className', () => {
		const { container } = render(Histogram, {
			props: {
				data: mockHourData,
				geography: '01',
				year: 2030,
				class: 'custom-histogram-class'
			}
		});

		const chartContainer = container.querySelector('.custom-histogram-class');
		expect(chartContainer).toBeTruthy();
	});

	it('should accept resolution prop', () => {
		const { container } = render(Histogram, {
			props: {
				data: mockHourData,
				geography: '01',
				year: 2030,
				resolution: '1h'
			}
		});

		expect(container.querySelector('.chart-container')).toBeTruthy();
	});

	it('should accept aggregation prop', () => {
		const { container } = render(Histogram, {
			props: {
				data: mockHourData,
				geography: '01',
				year: 2030,
				aggregation: 'mean'
			}
		});

		expect(container.querySelector('.chart-container')).toBeTruthy();
	});

	it('should accept segment prop', () => {
		const { container } = render(Histogram, {
			props: {
				data: mockHourData,
				geography: '01',
				year: 2030,
				segment: 'housing'
			}
		});

		expect(container.querySelector('.chart-container')).toBeTruthy();
	});

	it('should render with single scenario', () => {
		const { container } = render(Histogram, {
			props: {
				data: mockHourData,
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

		const { container } = render(Histogram, {
			props: {
				data: mockHourData,
				geography: '01',
				year: 2030,
				scenarios: [mockScenario, scenario2],
				comparisonMode: true
			}
		});

		expect(container.querySelector('.chart-container')).toBeTruthy();
	});
});
