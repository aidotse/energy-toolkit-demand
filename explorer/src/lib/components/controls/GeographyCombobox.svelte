<script lang="ts">
	/**
	 * GeographyCombobox - Searchable dropdown geography picker.
	 *
	 * Collapsed by default showing current selection. Opens on click to reveal
	 * a search input + scrollable list (~3-4 visible items). Dropdown overlays
	 * content below via absolute positioning.
	 */

	let {
		value,
		geographies = ['total'],
		geographiesMetadata = [],
		onChange,
		class: className = ''
	}: {
		value: string;
		geographies?: string[];
		geographiesMetadata?: Array<{ id: string; name: string; type?: string }>;
		onChange: (geography: string) => void;
		class?: string;
	} = $props();

	let expanded = $state(false);
	let search = $state('');

	// Build label map from metadata
	const geographyLabels = $derived.by(() => {
		const labels: Record<string, string> = { total: 'Sverige (alla)' };
		if (geographiesMetadata && geographiesMetadata.length > 0) {
			geographiesMetadata.forEach((geo) => {
				if (geo.id && geo.name) {
					labels[geo.id] = geo.name.replace(/s? län$/, '');
				}
			});
		}
		return labels;
	});

	// Filter geographies by search term
	const filteredGeographies = $derived.by(() => {
		if (!search.trim()) return geographies;
		const q = search.toLowerCase();
		return geographies.filter((geoId) => {
			const label = geographyLabels[geoId] || geoId;
			return label.toLowerCase().includes(q) || geoId.toLowerCase().includes(q);
		});
	});

	function getLabel(geoId: string): string {
		return geographyLabels[geoId] || geoId;
	}

	function handleSelect(geoId: string) {
		onChange(geoId);
		expanded = false;
		search = '';
	}

	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.geo-combobox')) {
			expanded = false;
			search = '';
		}
	}
</script>

<svelte:window onclick={handleClickOutside} />

<div class="geo-combobox relative {className}">
	<!-- Trigger button -->
	<button
		type="button"
		onclick={() => expanded = !expanded}
		class="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs rounded-md border
			border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700
			text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
	>
		<span class="truncate">{getLabel(value)}</span>
		<svg class="w-3.5 h-3.5 flex-shrink-0 text-gray-400 transition-transform {expanded ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
		</svg>
	</button>

	<!-- Dropdown -->
	{#if expanded}
		<div class="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-30 overflow-hidden">
			<!-- Search input -->
			<div class="p-1.5 border-b border-gray-100 dark:border-gray-700">
				<input
					type="text"
					bind:value={search}
					placeholder="Sök..."
					class="w-full px-2 py-1 text-xs rounded border-0 bg-gray-50 dark:bg-gray-700
						text-gray-900 dark:text-gray-100 placeholder:text-gray-400
						focus:ring-1 focus:ring-chart-500 outline-none"
				/>
			</div>

			<!-- Scrollable list (~3-4 visible items) -->
			<div class="max-h-[8.5rem] overflow-y-auto py-0.5">
				{#each filteredGeographies as geoId}
					<button
						type="button"
						onclick={() => handleSelect(geoId)}
						class="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-left transition-colors
							{value === geoId
								? 'bg-chart-700/10 text-chart-900 dark:text-chart-100 font-medium'
								: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'}"
					>
						<span class="truncate">{getLabel(geoId)}</span>
					</button>
				{/each}
				{#if filteredGeographies.length === 0}
					<p class="text-xs text-gray-400 dark:text-gray-500 px-2.5 py-2 text-center">
						Ingen match
					</p>
				{/if}
			</div>
		</div>
	{/if}
</div>
