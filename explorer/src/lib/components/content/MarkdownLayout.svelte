<!--
  MarkdownLayout.svelte - Default layout wrapper for markdown content

  MDsveX processes markdown files and wraps them in this layout.
  Frontmatter is automatically available as props.
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

<!--
  Simple passthrough layout - just renders the markdown content
  Frontmatter metadata is available via props but not rendered here
-->
<div class="markdown-content">
	{@render children?.()}
</div>

<style>
	/* Base markdown styling
	   h1 is not used - frontmatter title is rendered separately by page
	   Content uses h2 for main section heading, h3 for subsections */
	.markdown-content :global(h2) {
		@apply text-2xl font-bold mb-3;
	}

	.markdown-content :global(h3) {
		@apply text-xl font-semibold mb-2;
	}

	.markdown-content :global(h4) {
		@apply text-lg font-medium mb-2;
	}

	.markdown-content :global(p) {
		@apply mb-4 leading-relaxed;
	}

	.markdown-content :global(ul),
	.markdown-content :global(ol) {
		@apply mb-4 ml-6;
	}

	.markdown-content :global(li) {
		@apply mb-1;
	}

	.markdown-content :global(strong) {
		@apply font-semibold;
	}
</style>
