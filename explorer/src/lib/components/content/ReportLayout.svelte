<!--
  ReportLayout - MDsveX layout for report content pages

  Provides report-optimized typography:
  - h2 rendered as major section headings with generous top spacing
  - h3/h4 as subsection headings
  - Prose paragraphs with relaxed leading
  - Proper spacing for mixed markdown + Svelte component content

  Content files opt in via frontmatter: layout: reports
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { ContentMetadata } from '$lib/contentLoader';

	interface Props extends ContentMetadata {
		children?: Snippet;
	}

	let {
		title,
		description,
		section,
		order,
		lastUpdated,
		author,
		tags,
		layout,
		children,
		...rest
	}: Props = $props();
</script>

<div class="report-content">
	{@render children?.()}
</div>

<style>
	/* Report section headings — visually match ReportSection component */
	.report-content :global(h2) {
		@apply text-2xl font-bold text-gray-900 dark:text-gray-50 mb-3 pt-12 first:pt-0;
	}

	/* Subtitle-like text immediately after h2 (rendered as <p> with emphasis) */
	.report-content :global(h3) {
		@apply text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2 mt-8;
	}

	.report-content :global(h4) {
		@apply text-lg font-medium text-gray-900 dark:text-gray-100 mb-2 mt-6;
	}

	/* Prose paragraphs */
	.report-content :global(p) {
		@apply text-gray-700 dark:text-gray-300 leading-relaxed mb-4;
	}

	/* Lists */
	.report-content :global(ul),
	.report-content :global(ol) {
		@apply mb-4 ml-6;
	}

	.report-content :global(ul) {
		@apply list-disc;
	}

	.report-content :global(ol) {
		@apply list-decimal;
	}

	.report-content :global(li) {
		@apply mb-1 text-gray-700 dark:text-gray-300 leading-relaxed;
	}

	/* Inline elements */
	.report-content :global(strong) {
		@apply font-semibold text-gray-900 dark:text-gray-100;
	}

	.report-content :global(em) {
		@apply italic;
	}

	/* Code blocks */
	.report-content :global(pre) {
		@apply bg-gray-100 dark:bg-gray-950 p-4 rounded overflow-x-auto mb-4 text-sm;
	}

	.report-content :global(code) {
		@apply font-mono text-sm;
	}

	.report-content :global(:not(pre) > code) {
		@apply bg-gray-100 dark:bg-gray-950 px-1.5 py-0.5 rounded;
	}

	/* Tables */
	.report-content :global(table) {
		@apply w-full border-collapse mb-6;
	}

	.report-content :global(th) {
		@apply text-left font-semibold text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 border-b-2 border-gray-200 dark:border-gray-700;
	}

	.report-content :global(td) {
		@apply text-gray-700 dark:text-gray-300 px-4 py-2 border-b border-gray-100 dark:border-gray-800;
	}

	/* Links */
	.report-content :global(a) {
		@apply text-primary-600 dark:text-primary-400 underline decoration-primary-300 dark:decoration-primary-700 underline-offset-2 hover:decoration-primary-500 dark:hover:decoration-primary-400 transition-colors;
	}

	/* Blockquotes */
	.report-content :global(blockquote) {
		@apply border-l-4 border-gray-300 dark:border-gray-600 pl-4 py-1 mb-4 text-gray-600 dark:text-gray-400 italic;
	}

	/* Horizontal rule as section divider */
	.report-content :global(hr) {
		@apply my-12 border-gray-200 dark:border-gray-700;
	}
</style>
