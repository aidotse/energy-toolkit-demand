<script lang="ts">
	/**
	 * InsightBox Component - Highlighted key insights or takeaways
	 *
	 * Visually distinct box for displaying important findings, insights,
	 * or key messages. Can include icon and different variants for different
	 * types of information (insight, warning, tip).
	 *
	 * On mobile (< lg), renders collapsed by default with tap to expand.
	 * On desktop (lg+), always fully expanded.
	 *
	 * @component
	 */
	import { Lightbulb, AlertTriangle, Info, ChevronDown } from 'lucide-svelte';
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

	let expanded = $state(false);

	// Icon and color mapping
	const variantConfig = {
		insight: {
			icon: Lightbulb,
			bgClass: 'bg-gradient-to-br from-chart-100/30 to-chart-300/15',
			borderClass: 'border-chart-500',
			iconClass: 'text-chart-700',
			titleClass: 'text-chart-900'
		},
		warning: {
			icon: AlertTriangle,
			bgClass: 'bg-gradient-to-br from-amber-50 to-amber-100/50',
			borderClass: 'border-amber-400',
			iconClass: 'text-amber-600',
			titleClass: 'text-amber-900'
		},
		info: {
			icon: Info,
			bgClass: 'bg-gradient-to-br from-chart-100/20 to-chart-300/10',
			borderClass: 'border-chart-700',
			iconClass: 'text-chart-700',
			titleClass: 'text-chart-900'
		}
	};

	const config = $derived(variantConfig[variant]);
	const Icon = $derived(config.icon);
</script>

<div
	class="insight-box rounded border-l-4 px-5 py-4 lg:px-8 lg:py-7 {config.bgClass} {config.borderClass} {className}"
>
	<div>
		{#if title}
			<!-- Mobile: clickable header to toggle collapse -->
			<button
				class="lg:hidden flex items-center justify-between w-full text-left gap-2"
				onclick={() => expanded = !expanded}
			>
				<h3 class="flex items-center gap-2 text-base font-semibold mt-0 mb-0 {config.titleClass}">
					<span class="flex-shrink-0 {config.iconClass}"><Icon size={20} /></span>
					{title}
				</h3>
				<span class="flex-shrink-0 text-gray-400 transition-transform duration-200 {expanded ? 'rotate-180' : ''}">
					<ChevronDown size={18} />
				</span>
			</button>
			<!-- Desktop: always-visible header -->
			<h3 class="hidden lg:flex items-center gap-2 text-base font-semibold mt-0 mb-2 {config.titleClass}">
				<span class="flex-shrink-0 {config.iconClass}"><Icon size={20} /></span>
				{title}
			</h3>
		{/if}

		<!-- Mobile: collapsible content -->
		<div class="insight-content text-sm text-gray-900 leading-relaxed lg:!grid-rows-[1fr] {expanded ? 'grid-rows-[1fr] mt-2' : 'grid-rows-[0fr]'}" style="display: grid; transition: grid-template-rows 200ms ease;">
			<div class="overflow-hidden lg:!overflow-visible">
				{@render children()}
			</div>
		</div>
	</div>
</div>

<style>
	.insight-box :global(h3) {
		@apply mt-0;
	}

	.insight-content :global(p) {
		@apply mb-3 last:mb-0 first:mt-0;
	}

	.insight-content :global(ul),
	.insight-content :global(ol) {
		@apply mb-3 pl-5;
	}

	.insight-content :global(li) {
		@apply leading-relaxed mt-1;
	}

	.insight-content :global(strong) {
		@apply font-semibold text-gray-900;
	}

	.insight-content :global(a) {
		@apply underline hover:no-underline;
	}
</style>
