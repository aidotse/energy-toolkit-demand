<script lang="ts">
	/**
	 * ResolutionSelector Component
	 *
	 * Reusable time resolution selection control.
	 * Displays human-readable labels for technical resolution values.
	 *
	 * @component
	 */

	let {
		value,
		resolutions = ['1h', '1d', '1w', '1M', '1Y'],
		onChange,
		variant = 'pills',
		size = 'md',
		class: className = ''
	}: {
		value: string;
		resolutions?: string[];
		onChange: (resolution: string) => void;
		variant?: 'dropdown' | 'pills';
		size?: 'sm' | 'md' | 'lg';
		class?: string;
	} = $props();

	// Human-readable labels
	const resolutionLabels: Record<string, string> = {
		'1h': 'Timme',
		'1d': 'Dag',
		'1w': 'Vecka',
		'1M': 'Månad',
		'1Y': 'År'
	};

	// Size classes for pills
	const pillSizeClasses = {
		sm: 'px-2 py-1 text-xs',
		md: 'px-3 py-1.5 text-sm',
		lg: 'px-4 py-2 text-base'
	};

	function handleChange(newValue: string) {
		onChange(newValue);
	}

	function handleSelectChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		onChange(target.value);
	}
</script>

{#if variant === 'dropdown'}
	<select
		value={value}
		onchange={handleSelectChange}
		class="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600
		       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
		       focus:ring-2 focus:ring-primary focus:border-transparent
		       {className}"
	>
		{#each resolutions as resolution}
			<option value={resolution}>
				{resolutionLabels[resolution] || resolution}
			</option>
		{/each}
	</select>
{:else if variant === 'pills'}
	<div class="flex flex-wrap gap-2 {className}" role="radiogroup">
		{#each resolutions as resolution}
			<button
				type="button"
				onclick={() => handleChange(resolution)}
				class="inline-flex items-center rounded-full border-2 transition-all
				       {value === resolution
						? 'border-primary bg-primary text-white shadow-sm'
						: 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-primary hover:shadow-sm'}
				       {pillSizeClasses[size]}
				       focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
				role="radio"
				aria-checked={value === resolution}
			>
				{resolutionLabels[resolution] || resolution}
			</button>
		{/each}
	</div>
{/if}
