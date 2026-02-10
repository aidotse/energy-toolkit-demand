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

	// Trend color classes for dark teal background
	const trendColors = {
		up: 'text-emerald-300',
		down: 'text-red-300',
		neutral: 'text-white/60'
	};
</script>

<div
	class="metric-card rounded-lg p-4 {className}"
	style="background-color: #004d66;"
>
	<!-- Icon (optional) -->
	{#if Icon}
		<div class="flex justify-end mb-1 text-white/30">
			<Icon size={18} />
		</div>
	{/if}

	<!-- Main value -->
	<div class="metric-value text-3xl font-bold text-white mb-0.5">
		{formattedValue()}
	</div>

	<!-- Label -->
	<div class="metric-label text-xs text-white/80 font-medium mb-0.5">
		{label}
	</div>

	<!-- Sublabel (optional) -->
	{#if sublabel}
		<div class="metric-sublabel text-[10px] text-white/60">
			{sublabel}
		</div>
	{/if}

	<!-- Trend indicator (optional) -->
	{#if trend && trendLabel}
		<div class="metric-trend mt-2 pt-2 border-t border-white/20">
			<span class="text-[10px] font-medium {trendColors[trend]}">
				{#if trend === 'up'}↑{:else if trend === 'down'}↓{:else}→{/if}
				{trendLabel}
			</span>
		</div>
	{/if}
</div>

<style>
	.metric-card {
		@apply relative;
		min-height: 105px;
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
			@apply text-2xl;
		}
	}
</style>
