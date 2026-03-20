<script lang="ts">
	/**
	 * YearSelector Component
	 *
	 * Reusable year selection control with multiple variants.
	 * Supports dropdown and slider modes.
	 *
	 * @component
	 */

	let {
		value,
		years = [2025, 2030, 2035, 2040, 2045, 2050],
		onChange,
		variant = 'dropdown',
		size = 'md',
		class: className = ''
	}: {
		value: number;
		years?: number[];
		onChange: (year: number) => void;
		variant?: 'dropdown' | 'slider';
		size?: 'sm' | 'md' | 'lg';
		class?: string;
	} = $props();

	// Size classes
	const sizeClasses = {
		sm: 'px-2 py-1 text-sm',
		md: 'px-4 py-2 text-base',
		lg: 'px-6 py-3 text-lg'
	};

	// Ensure years are sorted
	const sortedYears = $derived([...years].sort((a, b) => a - b));
	const minYear = $derived(sortedYears[0]);
	const maxYear = $derived(sortedYears[sortedYears.length - 1]);

	function handleChange(event: Event) {
		const target = event.target as HTMLSelectElement | HTMLInputElement;
		const newYear = parseInt(target.value);
		if (!isNaN(newYear)) {
			onChange(newYear);
		}
	}
</script>

{#if variant === 'dropdown'}
	<select
		value={value}
		onchange={handleChange}
		class="w-full rounded-lg border border-gray-300
		       bg-white text-gray-900
		       focus:ring-2 focus:ring-primary focus:border-transparent
		       {sizeClasses[size]} {className}"
	>
		{#each sortedYears as year}
			<option value={year}>{year}</option>
		{/each}
	</select>
{:else if variant === 'slider'}
	<div class="flex flex-col gap-2 {className}">
		<input
			type="range"
			min={minYear}
			max={maxYear}
			step={sortedYears.length > 1 ? sortedYears[1] - sortedYears[0] : 1}
			value={value}
			oninput={handleChange}
			class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer
			      
			       accent-primary"
		/>
		<div class="flex justify-between text-xs text-gray-600">
			<span>{minYear}</span>
			<span class="font-semibold text-primary">{value}</span>
			<span>{maxYear}</span>
		</div>
	</div>
{/if}
