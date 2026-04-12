<script lang="ts">
	/**
	 * ContentBlock Component - Renders markdown content with typography
	 *
	 * Wrapper component for markdown content with proper styling and typography.
	 * Supports prose styling from Tailwind typography plugin.
	 *
	 * @component
	 */
	import type { Snippet } from 'svelte';

	let {
		children,
		maxWidth = 'prose',
		class: className = ''
	}: {
		children: Snippet;
		maxWidth?: 'prose' | 'prose-lg' | 'prose-xl' | 'full';
		class?: string;
	} = $props();
</script>

<div class="content-block {maxWidth === 'full' ? 'w-full' : `max-w-${maxWidth}`} {className}">
	<div class="prose prose-slate prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-a:text-primary-600 hover:prose-a:text-primary-700 prose-code:text-primary-600 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded">
		{@render children()}
	</div>
</div>

<style lang="postcss">
	.content-block {
		@apply mx-auto;
	}

	/* Additional typography enhancements */
	.content-block :global(h1) {
		@apply mb-6 mt-8 first:mt-0;
	}

	.content-block :global(h2) {
		@apply mb-4 mt-6;
	}

	.content-block :global(h3) {
		@apply mb-3 mt-5;
	}

	.content-block :global(p) {
		@apply mb-4 leading-relaxed;
	}

	.content-block :global(ul),
	.content-block :global(ol) {
		@apply mb-4;
	}

	.content-block :global(ul li),
	.content-block :global(ol li) {
		@apply mt-2;
	}

	.content-block :global(ul li:first-child),
	.content-block :global(ol li:first-child) {
		@apply mt-0;
	}

	.content-block :global(li) {
		@apply leading-relaxed;
	}

	.content-block :global(blockquote) {
		@apply border-l-4 border-primary-600 pl-4 italic my-4;
	}

	.content-block :global(code) {
		@apply font-mono text-sm;
	}

	.content-block :global(pre) {
		@apply bg-gray-100 p-4 rounded-lg overflow-x-auto my-4;
	}

	.content-block :global(pre code) {
		@apply bg-transparent p-0;
	}

	.content-block :global(table) {
		@apply w-full my-4 border-collapse;
	}

	.content-block :global(th) {
		@apply bg-gray-100 font-semibold p-2 text-left border-b-2 border-gray-300;
	}

	.content-block :global(td) {
		@apply p-2 border-b border-gray-200;
	}
</style>
