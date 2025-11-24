<script lang="ts">
	/**
	 * GlossaryTerm Component - Inline term with tooltip definition
	 *
	 * Displays a term with a dotted underline and shows its definition
	 * in a tooltip on hover. Useful for explaining technical terms inline.
	 *
	 * @component
	 */
	import { Tooltip } from 'svelte-ux';

	let {
		term,
		definition,
		class: className = ''
	}: {
		term: string;
		definition: string;
		class?: string;
	} = $props();
</script>

<Tooltip title={definition} placement="top">
	<span class="glossary-term {className}">
		{term}
	</span>
</Tooltip>

<style>
	.glossary-term {
		@apply border-b border-dotted border-primary-600 cursor-help text-primary-700 dark:text-primary-400;
	}

	.glossary-term:hover {
		@apply border-primary-700 dark:border-primary-300;
	}
</style>
