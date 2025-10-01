<script lang="ts">
	/**
	 * LoadingSkeleton - Reusable loading state component
	 *
	 * Provides a consistent loading experience across all chart components.
	 * Supports different variants to match different chart types.
	 *
	 * @component
	 * @example
	 * <LoadingSkeleton variant="chart" />
	 * <LoadingSkeleton variant="map" message="Loading geography data..." />
	 */

	let {
		variant = 'chart',
		message = 'Laddar data...',
		class: className = ''
	}: {
		variant?: 'chart' | 'map' | 'table' | 'text';
		message?: string;
		class?: string;
	} = $props();
</script>

<div class="flex flex-col items-center justify-center h-full w-full {className}" role="status" aria-live="polite">
	{#if variant === 'chart'}
		<!-- Chart skeleton: bars/lines pattern -->
		<div class="w-full h-full p-4 space-y-4 animate-pulse">
			<div class="flex justify-between items-end h-full space-x-2">
				<div class="w-full bg-gray-200 rounded" style="height: 60%"></div>
				<div class="w-full bg-gray-200 rounded" style="height: 80%"></div>
				<div class="w-full bg-gray-200 rounded" style="height: 45%"></div>
				<div class="w-full bg-gray-200 rounded" style="height: 90%"></div>
				<div class="w-full bg-gray-200 rounded" style="height: 70%"></div>
			</div>
			<div class="h-2 bg-gray-200 rounded w-full"></div>
		</div>
	{:else if variant === 'map'}
		<!-- Map skeleton: geographic shapes pattern -->
		<div class="w-full h-full bg-gray-100 rounded flex items-center justify-center animate-pulse">
			<div class="space-y-2 text-center">
				<div class="h-32 w-48 mx-auto bg-gray-200 rounded-lg"></div>
				<div class="h-3 w-32 mx-auto bg-gray-200 rounded"></div>
			</div>
		</div>
	{:else if variant === 'table'}
		<!-- Table skeleton: rows pattern -->
		<div class="w-full h-full p-4 space-y-3 animate-pulse">
			<div class="h-4 bg-gray-300 rounded w-full"></div>
			<div class="h-3 bg-gray-200 rounded w-11/12"></div>
			<div class="h-3 bg-gray-200 rounded w-10/12"></div>
			<div class="h-3 bg-gray-200 rounded w-11/12"></div>
			<div class="h-3 bg-gray-200 rounded w-9/12"></div>
		</div>
	{:else if variant === 'text'}
		<!-- Text skeleton: paragraph pattern -->
		<div class="w-full h-full p-4 space-y-2 animate-pulse">
			<div class="h-3 bg-gray-200 rounded w-full"></div>
			<div class="h-3 bg-gray-200 rounded w-11/12"></div>
			<div class="h-3 bg-gray-200 rounded w-10/12"></div>
		</div>
	{/if}

	{#if message}
		<p class="text-sm text-gray-500 mt-4">{message}</p>
	{/if}
</div>

<style>
	@keyframes pulse {
		0%, 100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	.animate-pulse {
		animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}
</style>
