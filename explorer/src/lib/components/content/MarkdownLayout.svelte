<!--
  MarkdownLayout.svelte - Default layout wrapper for markdown content

  MDsveX processes markdown files and wraps them in this layout.
  Frontmatter is automatically available as props.
  Prose styling matches ReportLayout for consistent typography.
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
		children,
		...rest
	}: Props = $props();
</script>

<div class="markdown-content">
	{@render children?.()}
</div>

<style lang="postcss">
	/* Prose styling — mirrors ReportLayout for consistent markdown rendering */
	.markdown-content :global(h2) {
		@apply text-2xl font-bold text-gray-900 mb-3 mt-10 first:mt-0;
	}

	.markdown-content :global(h3) {
		@apply text-xl font-semibold text-gray-900 mb-2 mt-8;
	}

	.markdown-content :global(h4) {
		@apply text-lg font-medium text-gray-900 mb-2 mt-6;
	}

	.markdown-content :global(p) {
		@apply text-gray-700 leading-relaxed mb-4;
	}

	.markdown-content :global(ul),
	.markdown-content :global(ol) {
		@apply mb-4 ml-6;
	}

	.markdown-content :global(ul) {
		@apply list-disc;
	}

	.markdown-content :global(ol) {
		@apply list-decimal;
	}

	.markdown-content :global(li) {
		@apply mb-1 text-gray-700 leading-relaxed;
	}

	.markdown-content :global(strong) {
		@apply font-semibold text-gray-900;
	}

	.markdown-content :global(em) {
		@apply italic;
	}

	.markdown-content :global(a) {
		@apply text-primary-600 hover:underline;
	}

	.markdown-content :global(blockquote) {
		@apply border-l-4 border-gray-200 pl-4 my-4 text-sm text-gray-700 italic;
	}

	.markdown-content :global(pre) {
		@apply bg-gray-100 p-4 rounded overflow-x-auto mb-4 text-sm;
	}

	.markdown-content :global(code) {
		@apply font-mono text-sm;
	}

	.markdown-content :global(:not(pre) > code) {
		@apply bg-gray-100 px-1.5 py-0.5 rounded;
	}

	.markdown-content :global(hr) {
		@apply my-12 border-gray-200;
	}
</style>
