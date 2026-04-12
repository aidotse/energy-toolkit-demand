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

	import type { Snippet } from 'svelte';

	let {
		rootMargin = '200px',
		height = '400px',
		class: className = '',
		children
	}: {
		rootMargin?: string;
		height?: string;
		class?: string;
		children?: Snippet;
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

<!--
  Container always reserves at least `height` worth of vertical space. Without
  this `min-height`, there's a race on first mount where the intersection
  observer flips `isVisible` to true and layerchart's ResizeObserver measures
  the container before the child chart has applied its own `h-[350px]`
  wrapper, producing a flood of "Target div has zero or negative
  width/height" warnings and negative `<rect>` attributes.
-->
<div
	bind:this={containerRef}
	class={className}
	style="min-height: {height}; width: 100%;"
>
	{#if isVisible}
		{@render children?.()}
	{:else}
		<div style="height: {height}">
			<LoadingSkeleton variant="chart" message={m.loading_waiting()} />
		</div>
	{/if}
</div>
