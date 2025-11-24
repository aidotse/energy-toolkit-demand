<script lang="ts">
	/**
	 * MetricCard Component - Display key metrics with large numbers
	 *
	 * Shows a single metric with prominent number and descriptive label.
	 * Used in executive summaries and dashboards for quick data scanning.
	 *
	 * @component
	 */
	import type { ComponentType } from 'svelte';

	let {
		value,
		label,
		sublabel,
		icon: Icon,
		trend,
		trendLabel,
		class: className = ''
	}: {
		value: string | number;
		label: string;
		sublabel?: string;
		icon?: ComponentType;
		trend?: 'up' | 'down' | 'neutral';
		trendLabel?: string;
		class?: string;
	} = $props();

	// Format large numbers with proper spacing
	const formattedValue = $derived(() => {
		if (typeof value === 'number') {
			return value.toLocaleString('sv-SE');
		}
		return value;
	});

	// Trend color classes
	const trendColors = {
		up: 'text-green-600 dark:text-green-400',
		down: 'text-red-600 dark:text-red-400',
		neutral: 'text-gray-600 dark:text-gray-400'
	};
</script>

<div
	class="metric-card bg-white dark:bg-gray-800 rounded shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 {className}"
>
	<!-- Icon (optional) -->
	{#if Icon}
		<div class="flex justify-end mb-2 opacity-30">
			<Icon size={24} />
		</div>
	{/if}

	<!-- Main value -->
	<div class="metric-value text-4xl font-bold text-gray-900 dark:text-gray-50 mb-1">
		{formattedValue()}
	</div>

	<!-- Label -->
	<div class="metric-label text-sm text-gray-600 dark:text-gray-400 font-medium mb-0.5">
		{label}
	</div>

	<!-- Sublabel (optional) -->
	{#if sublabel}
		<div class="metric-sublabel text-xs text-gray-500 dark:text-gray-500">
			{sublabel}
		</div>
	{/if}

	<!-- Trend indicator (optional) -->
	{#if trend && trendLabel}
		<div class="metric-trend mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
			<span class="text-xs font-medium {trendColors[trend]}">
				{#if trend === 'up'}↑{:else if trend === 'down'}↓{:else}→{/if}
				{trendLabel}
			</span>
		</div>
	{/if}
</div>

<style>
	.metric-card {
		@apply relative;
		min-height: 140px;
	}

	.metric-value {
		@apply leading-none;
		/* Prevent number wrapping */
		white-space: nowrap;
	}

	.metric-label {
		@apply leading-tight;
	}

	/* Responsive font sizing */
	@media (max-width: 640px) {
		.metric-value {
			@apply text-3xl;
		}
	}
</style>
