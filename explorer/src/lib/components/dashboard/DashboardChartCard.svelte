<script lang="ts">
	/**
	 * DashboardChartCard - Simple chart card wrapper.
	 *
	 * Renders children in a clean container. Filter panels are now rendered
	 * in the page-level sidebar instead of inline.
	 */
	import type { Snippet } from 'svelte';

	let {
		children,
		class: className = ''
	}: {
		children: Snippet;
		class?: string;
	} = $props();
</script>

<div class={className}>
	{@render children()}
</div>
