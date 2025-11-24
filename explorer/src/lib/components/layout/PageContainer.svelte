<!--
  PageContainer Component - Consistent page wrapper

  Provides unified max-width, padding, and background for all standard pages.
  Not used for index page which has custom two-column layout.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		maxWidth = 'max-w-7xl',
		class: className = '',
		children
	}: {
		maxWidth?: string;
		class?: string;
		children: Snippet;
	} = $props();
</script>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
	<div class="{maxWidth} mx-auto px-4 sm:px-6 lg:px-8 py-12 {className}">
		{@render children()}
	</div>
</div>
