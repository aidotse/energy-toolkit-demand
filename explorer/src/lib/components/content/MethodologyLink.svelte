<script lang="ts">
	/**
	 * MethodologyLink Component - Expandable methodology section
	 *
	 * Provides a "Learn more" link that expands to show detailed methodology
	 * explanation. Uses accordion pattern for clean inline documentation.
	 *
	 * @component
	 */
	import { Accordion } from 'svelte-ux';
	import { ChevronDown } from 'lucide-svelte';
	import type { Snippet } from 'svelte';

	let {
		title = 'Läs mer om metod',
		children,
		class: className = ''
	}: {
		title?: string;
		children: Snippet;
		class?: string;
	} = $props();

	let isOpen = $state(false);
</script>

<div class="methodology-link {className}">
	<Accordion bind:open={isOpen}>
		<button
			class="methodology-trigger"
			onclick={() => (isOpen = !isOpen)}
			aria-expanded={isOpen}
		>
			<span class="methodology-title">{title}</span>
			<ChevronDown
				size={16}
				class="methodology-icon"
				style="transform: rotate({isOpen ? 180 : 0}deg)"
			/>
		</button>

		{#if isOpen}
			<div class="methodology-content">
				{@render children()}
			</div>
		{/if}
	</Accordion>
</div>

<style>
	.methodology-link {
		@apply my-4 border-l-2 border-primary-600 pl-4;
	}

	.methodology-trigger {
		@apply flex items-center gap-2 text-sm font-medium text-primary-700 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 cursor-pointer bg-transparent border-none p-0;
	}

	.methodology-title {
		@apply underline decoration-dotted;
	}

	.methodology-icon {
		@apply transition-transform duration-200;
	}

	.methodology-content {
		@apply mt-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed;
	}

	.methodology-content :global(p) {
		@apply mb-3;
	}

	.methodology-content :global(ul),
	.methodology-content :global(ol) {
		@apply mb-3 space-y-1 pl-5;
	}

	.methodology-content :global(code) {
		@apply bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-xs font-mono;
	}
</style>
