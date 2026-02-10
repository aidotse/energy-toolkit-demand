<script lang="ts">
	/**
	 * InsightBox Component - Highlighted key insights or takeaways
	 *
	 * Visually distinct box for displaying important findings, insights,
	 * or key messages. Can include icon and different variants for different
	 * types of information (insight, warning, tip).
	 *
	 * @component
	 */
	import { Lightbulb, AlertTriangle, Info } from 'lucide-svelte';
	import type { Snippet } from 'svelte';

	let {
		variant = 'insight',
		title,
		children,
		class: className = ''
	}: {
		variant?: 'insight' | 'warning' | 'info';
		title?: string;
		children: Snippet;
		class?: string;
	} = $props();

	// Icon and color mapping
	const variantConfig = {
		insight: {
			icon: Lightbulb,
			bgClass: 'bg-[#ededed] dark:bg-gray-800',
			borderClass: 'border-gray-300 dark:border-gray-700',
			iconClass: 'text-gray-900 dark:text-gray-100',
			titleClass: 'text-gray-900 dark:text-gray-100'
		},
		warning: {
			icon: AlertTriangle,
			bgClass: 'bg-amber-50 dark:bg-amber-900/20',
			borderClass: 'border-amber-200 dark:border-amber-800',
			iconClass: 'text-amber-600 dark:text-amber-400',
			titleClass: 'text-amber-900 dark:text-amber-100'
		},
		info: {
			icon: Info,
			bgClass: 'bg-blue-50 dark:bg-blue-900/20',
			borderClass: 'border-blue-200 dark:border-blue-800',
			iconClass: 'text-blue-600 dark:text-blue-400',
			titleClass: 'text-blue-900 dark:text-blue-100'
		}
	};

	const config = $derived(variantConfig[variant]);
	const Icon = $derived(config.icon);
</script>

<div
	class="insight-box rounded border-l-4 p-6 {config.bgClass} {config.borderClass} {className}"
>
	<div class="flex gap-4">
		<!-- Icon -->
		<div class="flex-shrink-0 {config.iconClass}">
			<Icon size={24} />
		</div>

		<!-- Content -->
		<div class="flex-1">
			{#if title}
				<h3 class="text-lg font-semibold mb-2 {config.titleClass}">
					{title}
				</h3>
			{/if}

			<div class="insight-content text-sm text-gray-900 dark:text-gray-100 leading-relaxed">
				{@render children()}
			</div>
		</div>
	</div>
</div>

<style>
	.insight-content :global(p) {
		@apply mb-3 last:mb-0;
	}

	.insight-content :global(ul),
	.insight-content :global(ol) {
		@apply mb-3 pl-5;
	}

	.insight-content :global(li) {
		@apply leading-relaxed mt-1;
	}

	.insight-content :global(strong) {
		@apply font-semibold text-gray-900 dark:text-gray-100;
	}

	.insight-content :global(a) {
		@apply underline hover:no-underline;
	}
</style>
