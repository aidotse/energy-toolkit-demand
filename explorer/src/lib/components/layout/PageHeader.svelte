<!--
  PageHeader Component - Hero section for page titles

  Full-width gradient hero section matching the Reports page design.
  Must be used OUTSIDE of PageContainer to achieve full-width.
-->
<script lang="ts">
	import type { ComponentType } from 'svelte';

	let {
		title,
		description,
		icon: Icon,
		class: className = ''
	}: {
		title: string;
		description?: string;
		icon?: ComponentType;
		class?: string;
	} = $props();
</script>

<!-- Full-width hero section -->
<div class="bg-gradient-to-br from-primary-600 to-primary-800 dark:from-primary-800 dark:to-primary-950 text-white py-12 md:py-16 {className}">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="flex items-center gap-3 mb-3">
			{#if Icon}
				<Icon class="w-8 h-8 text-primary-100" />
			{/if}
			<h1 class="text-4xl md:text-5xl font-bold">
				{title}
			</h1>
		</div>
		{#if description}
			<p class="text-xl md:text-2xl text-primary-100 dark:text-primary-200 max-w-3xl">
				{description}
			</p>
		{/if}
	</div>
</div>
