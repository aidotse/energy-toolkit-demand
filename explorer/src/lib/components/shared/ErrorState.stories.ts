import type { Meta, StoryObj } from '@storybook/svelte';
import ErrorState from './ErrorState.svelte';

/**
 * ErrorState provides consistent error messaging with optional retry functionality.
 * Displays errors in a user-friendly format with accessibility support.
 */
const meta = {
	title: 'Shared/ErrorState',
	component: ErrorState,
	tags: ['autodocs'],
	argTypes: {
		message: {
			control: 'text',
			description: 'Main error message'
		},
		details: {
			control: 'text',
			description: 'Additional error details'
		},
		onRetry: {
			action: 'retry',
			description: 'Callback function for retry action'
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
				component: 'A reusable error state component with consistent styling and optional retry functionality. Includes proper ARIA attributes for accessibility.'
			}
		}
	}
} satisfies Meta<ErrorState>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Basic error without retry
 */
export const Basic: Story = {
	args: {
		message: 'Kunde inte ladda data',
		details: ''
	}
};

/**
 * Error with detailed message
 */
export const WithDetails: Story = {
	args: {
		message: 'Kunde inte ladda data',
		details: 'Kontrollera din internetanslutning och försök igen.'
	}
};

/**
 * Error with retry button
 */
export const WithRetry: Story = {
	args: {
		message: 'Kunde inte ladda data',
		details: 'Ett fel uppstod vid hämtning av data från servern.',
		onRetry: () => {
			console.log('Retrying...');
			return new Promise((resolve) => setTimeout(resolve, 2000));
		}
	}
};

/**
 * API error example
 */
export const ApiError: Story = {
	args: {
		message: 'API request failed',
		details: 'Failed to fetch data from /api/demand: 500 Internal Server Error',
		onRetry: () => {
			console.log('Retrying API call...');
			return Promise.resolve();
		}
	}
};

/**
 * Network error example
 */
export const NetworkError: Story = {
	args: {
		message: 'Network connection lost',
		details: 'Unable to connect to the server. Please check your internet connection.',
		onRetry: () => {
			console.log('Checking connection...');
			return new Promise((resolve) => setTimeout(resolve, 1500));
		}
	}
};

/**
 * Permission error example
 */
export const PermissionError: Story = {
	args: {
		message: 'Access Denied',
		details: 'You do not have permission to view this data.'
	}
};

/**
 * Custom styling
 */
export const CustomClass: Story = {
	args: {
		message: 'Custom styled error',
		details: 'This error has custom styling applied.',
		class: 'shadow-lg'
	}
};
