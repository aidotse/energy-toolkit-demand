<!--
  SplitPageContainer Component - Consistent two-column layout

  Provides the 3/5 + 2/5 split layout used across all pages.
  Left column contains scrollable content, right column contains contextual panel.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		children,
		rightPanel,
		class: className = ''
	}: {
		children: Snippet;
		rightPanel?: Snippet;
		class?: string;
	} = $props();
</script>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900 {className}">
	<div class="flex flex-col lg:flex-row">
		<!-- Left Column: Scrollable Content (3/5 width) -->
		<main class="flex-1 lg:w-3/5 overflow-y-auto p-4 sm:p-6 lg:p-8">
			<div class="max-w-4xl mx-auto">
				{@render children()}
			</div>
		</main>

		<!-- Right Column: Contextual Panel (2/5 width) -->
		<aside
			class="hidden lg:block lg:w-2/5 lg:sticky lg:top-14"
			style="height: calc(100vh - 3.5rem);"
		>
			{#if rightPanel}
				{@render rightPanel()}
			{:else}
				<!-- Default decorative panel -->
				<div class="h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
					<div class="h-full flex items-center justify-center opacity-20">
						<svg viewBox="0 0 100 150" class="w-48 h-72 text-primary-600 dark:text-primary-400">
							<!-- Simplified Sweden silhouette -->
							<path
								fill="currentColor"
								d="M50 5 L60 20 L65 35 L70 50 L75 65 L70 80 L65 95 L55 110 L50 125 L45 140 L40 145 L35 140 L30 125 L35 110 L30 95 L25 80 L30 65 L35 50 L40 35 L45 20 Z"
							/>
						</svg>
					</div>
				</div>
			{/if}
		</aside>
	</div>
</div>
