import type { Meta, StoryObj } from '@storybook/svelte';
import LoadingSkeleton from './LoadingSkeleton.svelte';

/**
 * LoadingSkeleton provides consistent loading states across all chart components.
 * It supports different variants to match different content types.
 */
const meta = {
	title: 'Shared/LoadingSkeleton',
	component: LoadingSkeleton,
	tags: ['autodocs'],
	argTypes: {
		variant: {
			control: 'select',
			options: ['chart', 'map', 'table', 'text'],
			description: 'Visual variant to match the content type'
		},
		message: {
			control: 'text',
			description: 'Loading message to display'
		},
		class: {
			control: 'text',
			description: 'Additional CSS classes'
		}
	},
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component:
					'A reusable loading skeleton component with animated pulse effect. Provides visual feedback while content is being loaded.'
			}
		}
	}
} satisfies Meta<typeof LoadingSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default chart variant with bars/lines pattern
 */
export const Chart: Story = {
	args: {
		variant: 'chart',
		message: 'Laddar data...'
	}
};

/**
 * Map variant with geographic shapes pattern
 */
export const Map: Story = {
	args: {
		variant: 'map',
		message: 'Loading geography data...'
	}
};

/**
 * Table variant with rows pattern
 */
export const Table: Story = {
	args: {
		variant: 'table',
		message: 'Loading table...'
	}
};

/**
 * Text variant with paragraph pattern
 */
export const Text: Story = {
	args: {
		variant: 'text',
		message: 'Loading content...'
	}
};

/**
 * Without message
 */
export const NoMessage: Story = {
	args: {
		variant: 'chart',
		message: undefined
	}
};

/**
 * Custom styling
 */
export const CustomClass: Story = {
	args: {
		variant: 'chart',
		message: 'Custom styled loading...',
		class: 'min-h-96 bg-blue-50'
	}
};
