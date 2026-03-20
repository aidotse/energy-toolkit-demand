<!--
  PageContainer Component - Consistent page wrapper

  Provides unified max-width, padding, and background for all standard pages.
  Not used for index page which has custom two-column layout.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		maxWidth = 'max-w-6xl',
		class: className = '',
		children
	}: {
		maxWidth?: string;
		class?: string;
		children: Snippet;
	} = $props();
</script>

<div class="min-h-screen bg-white lg:bg-page-bg">
	<div class="{maxWidth} mx-auto px-0 lg:px-8 pt-12 lg:py-12 {className}">
		<div class="bg-white lg:rounded-2xl lg:shadow-sm px-3 py-4 sm:p-8 lg:p-12">
			{@render children()}
		</div>
	</div>
</div>
