import type { Meta, StoryObj } from '@storybook/svelte';
import SegmentBars from './SegmentBars.svelte';
import { viz } from '$lib/colors';

/**
 * SegmentBars displays electricity demand breakdown by segment (buildings, transport, industry).
 * Follows the standardized ChartComponent interface for consistent behavior.
 */
const meta = {
	title: 'Charts/SegmentBars',
	component: SegmentBars,
	tags: ['autodocs'],
	argTypes: {
		data: {
			control: 'object',
			description: 'Chart data array'
		},
		geography: {
			control: 'text',
			description: 'Geography code (e.g., "01" for Blekinge)'
		},
		year: {
			control: 'number',
			description: 'Year to display data for'
		},
		scenarios: {
			control: 'object',
			description: 'Scenario objects for comparison mode'
		},
		comparisonMode: {
			control: 'boolean',
			description: 'Enable comparison between multiple scenarios'
		}
	},
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component:
					'A reusable chart component for visualizing segment breakdown. Supports both single scenario and comparison modes with interactive legend.'
			}
		}
	}
} satisfies Meta<typeof SegmentBars>;

export default meta;
type Story = StoryObj<typeof meta>;

// Mock segment data
const mockSegmentData = [
	{ timestamp: '2025-01-01T00:00:00Z', segment: 'Buildings', geography: '01', value: 15000 },
	{ timestamp: '2025-01-01T00:00:00Z', segment: 'Transport', geography: '01', value: 8000 },
	{ timestamp: '2025-01-01T00:00:00Z', segment: 'Industry', geography: '01', value: 12000 }
];

const mockComparisonData = [
	{ timestamp: '2025-01-01T00:00:00Z', segment: 'Buildings', geography: '01', value: 15000 },
	{ timestamp: '2025-01-01T00:00:00Z', segment: 'Transport', geography: '01', value: 8000 },
	{ timestamp: '2025-01-01T00:00:00Z', segment: 'Industry', geography: '01', value: 12000 }
];

const mockScenarios = [
	{
		id: 'base',
		name: 'Base Scenario',
		scenario_id: 'base',
		description: 'Business as usual scenario',
		color: viz.scenario.primary
	},
	{
		id: 'high',
		name: 'High Electrification',
		scenario_id: 'high',
		description: 'Aggressive electrification scenario',
		color: viz.scenario.secondary
	}
];

/**
 * Basic single scenario view
 */
export const SingleScenario: Story = {
	args: {
		data: mockSegmentData,
		geography: '01',
		year: 2025,
		scenarios: [mockScenarios[0]],
		comparisonMode: false
	}
};

/**
 * Loading state
 */
export const Loading: Story = {
	args: {
		geography: '01',
		year: 2025,
		scenarios: [mockScenarios[0]]
	},
	render: (args) => ({
		Component: SegmentBars,
		props: {
			...args,
			// Force loading state - this would need component modification to work
			data: null
		}
	})
};

/**
 * Empty state (no data)
 */
export const EmptyData: Story = {
	args: {
		data: [],
		geography: '01',
		year: 2025,
		scenarios: [mockScenarios[0]]
	}
};

/**
 * Comparison mode with two scenarios
 */
export const ComparisonMode: Story = {
	args: {
		data: mockComparisonData,
		geography: '01',
		year: 2025,
		scenarios: mockScenarios,
		comparisonMode: true
	}
};

/**
 * Different geography
 */
export const DifferentGeography: Story = {
	args: {
		data: [
			{ timestamp: '2025-01-01T00:00:00Z', segment: 'Buildings', geography: '03', value: 25000 },
			{ timestamp: '2025-01-01T00:00:00Z', segment: 'Transport', geography: '03', value: 15000 },
			{ timestamp: '2025-01-01T00:00:00Z', segment: 'Industry', geography: '03', value: 20000 }
		],
		geography: '03',
		year: 2025,
		scenarios: [mockScenarios[0]]
	}
};
