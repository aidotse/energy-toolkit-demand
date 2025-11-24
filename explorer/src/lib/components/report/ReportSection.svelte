<script lang="ts">
	/**
	 * ReportSection Component - Wrapper for report page sections
	 *
	 * Provides consistent section styling with optional anchor links,
	 * subtitles, and flexible content layouts. Supports side-by-side
	 * text+chart layouts or full-width content.
	 *
	 * @component
	 */
	import type { Snippet } from 'svelte';

	let {
		id,
		title,
		subtitle,
		layout = 'full',
		card = false,
		children,
		class: className = ''
	}: {
		id?: string;
		title?: string;
		subtitle?: string;
		layout?: 'full' | 'split' | 'text-left' | 'text-right';
		card?: boolean;
		children: Snippet;
		class?: string;
	} = $props();
</script>

<section
	{id}
	class="report-section py-12 md:py-16 lg:py-20 {className}"
	class:split-layout={layout === 'split'}
	class:text-left-layout={layout === 'text-left'}
	class:text-right-layout={layout === 'text-right'}
	class:card-style={card}
>
	<!-- Section header -->
	{#if title}
		<div class="section-header mb-8">
			{#if id}
				<a href="#{id}" class="section-anchor">
					<h2 class="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-50 mb-3">
						{title}
					</h2>
				</a>
			{:else}
				<h2 class="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-50 mb-3">
					{title}
				</h2>
			{/if}

			{#if subtitle}
				<p class="text-lg text-gray-600 dark:text-gray-400 max-w-3xl">
					{subtitle}
				</p>
			{/if}
		</div>
	{/if}

	<!-- Content area -->
	<div class="section-content">
		{@render children()}
	</div>
</section>

<style>
	.report-section {
		@apply max-w-7xl mx-auto px-4 sm:px-6 lg:px-8;
	}

	/* Card style for design system alignment */
	.card-style {
		@apply rounded shadow-sm border border-gray-200 dark:border-gray-700;
	}

	/* Anchor link styling */
	.section-anchor {
		@apply no-underline;
	}

	.section-anchor:hover h2 {
		@apply text-primary-600 dark:text-primary-400;
		@apply transition-colors duration-200;
	}

	/* Layout variants */
	.split-layout .section-content {
		@apply grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start;
	}

	.text-left-layout .section-content {
		@apply grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-8 lg:gap-12;
	}

	.text-right-layout .section-content {
		@apply grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8 lg:gap-12;
	}

	/* Ensure content spacing */
	.section-content > :global(*:not(:last-child)) {
		@apply mb-6;
	}

	.split-layout .section-content > :global(*),
	.text-left-layout .section-content > :global(*),
	.text-right-layout .section-content > :global(*) {
		@apply mb-0;
	}
</style>
