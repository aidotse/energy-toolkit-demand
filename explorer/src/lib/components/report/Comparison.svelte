<script lang="ts">
	/**
	 * Comparison — inline text showing a computed equivalence
	 *
	 * Usage in .md:
	 *   :::Comparison{value=6.9 unit="GW" unitValue=1.15 unitLabel="kärnreaktorer"}
	 *   Baserat på genomsnittlig kapacitet för Sveriges sex reaktorer.
	 *   :::
	 *
	 * Renders as: "6,9 GW motsvarar ungefär ~6 kärnreaktorer. ..."
	 *
	 * @component
	 */
	let {
		value,
		unit = '',
		unitValue,
		unitLabel,
		children
	}: {
		value: number;
		unit?: string;
		unitValue: number;
		unitLabel: string;
		children?: any;
	} = $props();

	const count = $derived(Math.round(value / unitValue));
	const formattedValue = $derived(value.toLocaleString('sv-SE', { maximumFractionDigits: 1 }));
</script>

<p class="text-base text-gray-600">{formattedValue} {unit} motsvarar ungefär <strong>~{count} {unitLabel}</strong>. {#if children}{@render children()}{/if}</p>
