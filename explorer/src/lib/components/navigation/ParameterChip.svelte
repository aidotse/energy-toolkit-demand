<script lang="ts">
	/**
	 * ParameterChip Component
	 *
	 * Reusable chip button for parameter selection with Tailwind styling.
	 * Supports default, selected, and disabled states.
	 */

	// Props
	let {
		label = '',
		value = '',
		selected = false,
		disabled = false,
		onclick
	}: {
		label: string;
		value: string | number;
		selected?: boolean;
		disabled?: boolean;
		onclick?: (value: string | number) => void;
	} = $props();

	function handleClick() {
		if (!disabled && onclick) {
			onclick(value);
		}
	}
</script>

<button
	onclick={handleClick}
	disabled={disabled}
	class="
		inline-flex items-center px-3 h-8 rounded-full border-2
		text-sm font-medium
		transition-all duration-200
		{selected
		? 'border-primary bg-primary text-white'
		: 'border-gray-300 bg-white text-gray-700'}
		{!disabled && !selected
		? 'hover:border-primary hover:shadow-sm active:scale-98'
		: ''}
		{disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
	"
	aria-pressed={selected}
>
	{label}
</button>
