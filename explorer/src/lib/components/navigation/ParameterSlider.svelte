<script lang="ts">
	/**
	 * ParameterSlider - Stepped range slider for a single parameter
	 *
	 * Compact slider with tick marks and labels for use in navigation dropdowns.
	 * Designed to be pluggable - framework users can replace with custom implementations.
	 *
	 * For parameters with negative values, the slider is sorted by value so baseline
	 * appears in the correct visual position (e.g., -10%, 0%, +10%, +20%).
	 */
	import type { Strategy2Parameter } from '$lib/dataService';

	let {
		parameter,
		value = 0,
		onchange,
		compact = false
	}: {
		parameter: Strategy2Parameter;
		value: number;
		onchange?: (value: number) => void;
		compact?: boolean;
	} = $props();

	// Sort values by their numeric value for visual display
	// This ensures -10% appears left of 0% which appears left of +10%
	const sortedValues = $derived(
		[...parameter.values].sort((a, b) => (a.value ?? a.index) - (b.value ?? b.index))
	);

	// Map from slider position (0, 1, 2, ...) to actual index
	const positionToIndex = $derived(
		sortedValues.map(v => v.index)
	);

	// Map from actual index to slider position
	const indexToPosition = $derived(() => {
		const map: Record<number, number> = {};
		sortedValues.forEach((v, pos) => {
			map[v.index] = pos;
		});
		return map;
	});

	// Current slider position (derived from value/index)
	const sliderPosition = $derived(indexToPosition()[value] ?? 0);

	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement;
		const position = parseInt(target.value, 10);
		const actualIndex = positionToIndex[position];
		onchange?.(actualIndex);
	}

	// Get current value label
	const currentLabel = $derived(
		parameter.values.find(v => v.index === value)?.label || `Index ${value}`
	);
</script>

<div class="space-y-1">
	{#if !compact}
		<div class="flex items-center justify-between text-xs">
			<span class="text-gray-600 dark:text-gray-400">{parameter.description || parameter.name}</span>
			<span class="font-medium text-gray-900 dark:text-gray-100">{currentLabel}</span>
		</div>
	{/if}

	<input
		type="range"
		min="0"
		max={sortedValues.length - 1}
		value={sliderPosition}
		onchange={handleInput}
		class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer parameter-slider"
	/>

	{#if !compact}
		<div class="flex justify-between text-[10px] text-gray-400">
			{#each sortedValues as val}
				<span
					class:font-medium={val.index === value}
					class:text-chart-700={val.index === value}
					class:dark:text-chart-300={val.index === value}
				>
					{val.label}
				</span>
			{/each}
		</div>
	{/if}
</div>

<style>
	.parameter-slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 16px;
		height: 16px;
		/* gray-800 — pseudo-element, can't bind dynamically */
		background-color: #1f2937;
		border-radius: 50%;
		cursor: pointer;
	}

	:global(.dark) .parameter-slider::-webkit-slider-thumb {
		background-color: #e5e7eb;
	}

	.parameter-slider::-moz-range-thumb {
		width: 16px;
		height: 16px;
		/* gray-800 — pseudo-element, can't bind dynamically */
		background-color: #1f2937;
		border-radius: 50%;
		border: none;
		cursor: pointer;
	}

	:global(.dark) .parameter-slider::-moz-range-thumb {
		background-color: #e5e7eb;
	}
</style>
