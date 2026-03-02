<script lang="ts">
	/**
	 * ErrorState - Reusable error display component
	 *
	 * Provides consistent error messaging with optional retry functionality.
	 * Supports different error types and custom actions.
	 *
	 * @component
	 * @example
	 * <ErrorState
	 *   message="Failed to load chart data"
	 *   details={error.message}
	 *   onRetry={() => refetch()}
	 * />
	 */

	import { AlertCircle, RefreshCw } from 'lucide-svelte';
	import * as m from '$paraglide/messages';

	let {
		message = m.error_load_data(),
		details = '',
		onRetry = undefined,
		class: className = ''
	}: {
		message?: string;
		details?: string;
		onRetry?: () => void | Promise<void>;
		class?: string;
	} = $props();

	let retrying = $state(false);

	async function handleRetry() {
		if (!onRetry) return;
		retrying = true;
		try {
			await onRetry();
		} finally {
			retrying = false;
		}
	}
</script>

<div
	class="flex flex-col items-center justify-center h-full w-full p-6 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800 {className}"
	role="alert"
	aria-live="assertive"
>
	<AlertCircle class="h-12 w-12 text-red-500 dark:text-red-400 mb-4" />

	<h3 class="text-lg font-medium text-red-900 dark:text-red-100 mb-2">
		{message}
	</h3>

	{#if details}
		<p class="text-sm text-red-700 dark:text-red-300 mb-4 text-center max-w-md">
			{details}
		</p>
	{/if}

	{#if onRetry}
		<button
			type="button"
			onclick={handleRetry}
			disabled={retrying}
			class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
		>
			<RefreshCw class="h-4 w-4 {retrying ? 'animate-spin' : ''}" />
			{retrying ? m.error_retrying() : m.error_retry()}
		</button>
	{/if}
</div>

<style>
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.animate-spin {
		animation: spin 1s linear infinite;
	}
</style>
