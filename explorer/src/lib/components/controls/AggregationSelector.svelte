<script lang="ts">
	/**
	 * AggregationSelector Component
	 *
	 * Reusable aggregation method selection control.
	 * Displays context-aware labels (Sum for energy, Mean for power, Max for peak).
	 *
	 * @component
	 */

	let {
		value,
		aggregations = ['sum', 'mean', 'max'],
		onChange,
		variant = 'pills',
		size = 'md',
		context = 'energy',
		class: className = ''
	}: {
		value: string;
		aggregations?: string[];
		onChange: (aggregation: string) => void;
		variant?: 'dropdown' | 'pills';
		size?: 'sm' | 'md' | 'lg';
		context?: 'energy' | 'power' | 'generic';
		class?: string;
	} = $props();

	// Context-aware labels
	const aggregationLabels: Record<string, Record<string, string>> = {
		energy: {
			sum: 'Energi',
			mean: 'Medel',
			max: 'Max'
		},
		power: {
			sum: 'Total',
			mean: 'Medeleffekt',
			max: 'Toppeffekt'
		},
		generic: {
			sum: 'Summa',
			mean: 'Medel',
			max: 'Max'
		}
	};

	// Size classes for pills
	const pillSizeClasses = {
		sm: 'px-2 py-1 text-xs',
		md: 'px-3 py-1.5 text-sm',
		lg: 'px-4 py-2 text-base'
	};

	function getLabel(agg: string): string {
		return aggregationLabels[context]?.[agg] || agg;
	}

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
		class="w-full px-4 py-2 rounded-lg border border-gray-300
		       bg-white text-gray-900
		       focus:ring-2 focus:ring-primary focus:border-transparent
		       {className}"
	>
		{#each aggregations as aggregation}
			<option value={aggregation}>
				{getLabel(aggregation)}
			</option>
		{/each}
	</select>
{:else if variant === 'pills'}
	<div class="flex flex-wrap gap-2 {className}" role="radiogroup">
		{#each aggregations as aggregation}
			<button
				type="button"
				onclick={() => handleChange(aggregation)}
				class="inline-flex items-center rounded-full border-2 transition-all
				       {value === aggregation
						? 'border-primary bg-primary text-white shadow-sm'
						: 'border-gray-300 bg-white text-gray-700 hover:border-primary hover:shadow-sm'}
				       {pillSizeClasses[size]}
				       focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
				role="radio"
				aria-checked={value === aggregation}
			>
				{getLabel(aggregation)}
			</button>
		{/each}
	</div>
{/if}
