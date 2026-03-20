<script lang="ts">
	/**
	 * ParameterGroup Component
	 *
	 * Groups parameter chips with a label and manages single selection.
	 */
	import ParameterChip from './ParameterChip.svelte';

	// Props
	let {
		label = '',
		options = [],
		selected = undefined,
		onselect
	}: {
		label: string;
		options: Array<{ label: string; value: string | number }>;
		selected?: string | number;
		onselect?: (value: string | number) => void;
	} = $props();

	function handleSelect(value: string | number) {
		if (onselect) {
			onselect(value);
		}
	}
</script>

<div class="space-y-2">
	<!-- Group Label -->
	<label class="text-xs uppercase font-medium text-gray-600">
		{label}
	</label>

	<!-- Chips Container -->
	<div class="flex flex-wrap gap-2">
		{#each options as option}
			<ParameterChip
				label={option.label}
				value={option.value}
				selected={selected === option.value}
				onclick={handleSelect}
			/>
		{/each}
	</div>
</div>
