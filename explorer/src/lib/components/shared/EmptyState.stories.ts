import type { Meta, StoryObj } from '@storybook/svelte';
import EmptyState from './EmptyState.svelte';
import { FileQuestion, Info, AlertTriangle, Search } from 'lucide-svelte';

/**
 * EmptyState provides consistent messaging when no data is available.
 * Supports different contexts with custom icons and optional actions.
 */
const meta = {
	title: 'Shared/EmptyState',
	component: EmptyState,
	tags: ['autodocs'],
	argTypes: {
		message: {
			control: 'text',
			description: 'Main empty state message'
		},
		description: {
			control: 'text',
			description: 'Additional description text'
		},
		icon: {
			control: false,
			description: 'Lucide icon component'
		},
		action: {
			action: 'action',
			description: 'Callback function for action button'
		},
		actionLabel: {
			control: 'text',
			description: 'Label for action button'
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
					'A reusable empty state component with customizable icon and optional call-to-action. Provides consistent messaging when content is unavailable.'
			}
		}
	}
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Basic empty state
 */
export const Basic: Story = {
	args: {
		message: 'Ingen data tillgänglig',
		description: ''
	}
};

/**
 * With description
 */
export const WithDescription: Story = {
	args: {
		message: 'Ingen data tillgänglig',
		description: 'Välj ett annat scenario eller tidsperiod för att visa data.'
	}
};

/**
 * With action button
 */
export const WithAction: Story = {
	args: {
		message: 'No data found',
		description: 'Try adjusting your filters to see results.',
		actionLabel: 'Reset Filters',
		action: () => {
			console.log('Resetting filters...');
		}
	}
};

/**
 * No results found (search context)
 */
export const NoResults: Story = {
	args: {
		message: 'No results found',
		description: "We couldn't find any data matching your search criteria.",
		icon: Search,
		actionLabel: 'Clear Search',
		action: () => {
			console.log('Clearing search...');
		}
	}
};

/**
 * Information context
 */
export const InfoContext: Story = {
	args: {
		message: 'Select parameters to begin',
		description: 'Choose a geography and time period to view the data.',
		icon: Info
	}
};

/**
 * Warning context
 */
export const WarningContext: Story = {
	args: {
		message: 'Data not available for this period',
		description: 'Historical data is only available from 2020 onwards.',
		icon: AlertTriangle
	}
};

/**
 * Default icon (FileQuestion)
 */
export const DefaultIcon: Story = {
	args: {
		message: 'No chart data',
		description: 'Configure the chart parameters to display data.',
		icon: FileQuestion
	}
};

/**
 * Minimal without description
 */
export const Minimal: Story = {
	args: {
		message: 'Ingen data'
	}
};

/**
 * Custom styling
 */
export const CustomClass: Story = {
	args: {
		message: 'Custom styled empty state',
		description: 'This has custom styling applied.',
		class: 'shadow-lg min-h-96'
	}
};
