<!--
  ContentCard Component - Standard card wrapper for content sections

  Provides unified card styling with shadows, borders, and padding.
  Supports optional hover effects and custom class names.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { ComponentType } from 'svelte';

	let {
		title,
		description,
		icon: Icon,
		hover = false,
		noPadding = false,
		class: className = '',
		children
	}: {
		title?: string;
		description?: string;
		icon?: ComponentType;
		hover?: boolean;
		noPadding?: boolean;
		class?: string;
		children: Snippet;
	} = $props();

	const hoverClasses = hover ? 'hover:shadow-md hover:-translate-y-0.5' : '';
	const paddingClasses = noPadding ? '' : 'py-6 md:py-8';
</script>

<div
	class="border-b border-gray-200 dark:border-gray-700 last:border-b-0 {paddingClasses} transition-all duration-200 {hoverClasses} {className}"
>
	{#if title}
		<div class="mb-6">
			<div class="flex items-center gap-3 mb-2">
				{#if Icon}
					<Icon class="w-6 h-6 text-primary-600 dark:text-primary-400" />
				{/if}
				<h2 class="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
			</div>
			{#if description}
				<p class="text-base text-gray-600 dark:text-gray-400">{description}</p>
			{/if}
		</div>
	{/if}
	{@render children()}
</div>
