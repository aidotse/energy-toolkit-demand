<script lang="ts">
	/**
	 * LazyChart Component
	 *
	 * Wrapper that only renders child chart when it comes into view.
	 * Uses Intersection Observer API for lazy loading.
	 *
	 * @component
	 */
	import { onMount } from 'svelte';
	import LoadingSkeleton from './LoadingSkeleton.svelte';
	import * as m from '$paraglide/messages';

	let {
		rootMargin = '200px',
		height = '400px',
		class: className = ''
	}: {
		rootMargin?: string;
		height?: string;
		class?: string;
	} = $props();

	let containerRef: HTMLDivElement | undefined = $state();
	let isVisible = $state(false);

	onMount(() => {
		if (!containerRef) return;

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting && !isVisible) {
						isVisible = true;
						observer.disconnect();
					}
				});
			},
			{
				rootMargin,
				threshold: 0.1
			}
		);

		observer.observe(containerRef);

		return () => {
			observer.disconnect();
		};
	});
</script>

<div bind:this={containerRef} class={className}>
	{#if isVisible}
		<slot />
	{:else}
		<div style="height: {height}">
			<LoadingSkeleton variant="chart" message={m.loading_waiting()} />
		</div>
	{/if}
</div>
