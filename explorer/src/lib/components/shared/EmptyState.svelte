<script lang="ts">
	/**
	 * EmptyState - Reusable empty/no data component
	 *
	 * Provides consistent messaging when no data is available.
	 * Supports different contexts and custom actions.
	 *
	 * @component
	 * @example
	 * <EmptyState
	 *   message="Ingen data tillgänglig"
	 *   description="Välj ett annat scenario eller tidsperiod"
	 * />
	 */

	import { FileQuestion, Info } from 'lucide-svelte';

	let {
		message = 'Ingen data tillgänglig',
		description = '',
		icon: Icon = FileQuestion,
		action = undefined,
		actionLabel = '',
		class: className = ''
	}: {
		message?: string;
		description?: string;
		icon?: any;
		action?: () => void | Promise<void>;
		actionLabel?: string;
		class?: string;
	} = $props();
</script>

<div
	class="flex flex-col items-center justify-center h-full w-full p-6 bg-gray-50 rounded-lg border border-gray-200 {className}"
	role="status"
	aria-live="polite"
>
	<Icon class="h-16 w-16 text-gray-400 mb-4" />

	<h3 class="text-lg font-medium text-gray-900 mb-2">
		{message}
	</h3>

	{#if description}
		<p class="text-sm text-gray-600 mb-4 text-center max-w-md">
			{description}
		</p>
	{/if}

	{#if action && actionLabel}
		<button
			type="button"
			onclick={action}
			class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md transition-colors"
		>
			{actionLabel}
		</button>
	{/if}
</div>
