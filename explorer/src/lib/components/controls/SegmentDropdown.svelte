<script lang="ts">
	/**
	 * SegmentDropdown - Multiselect segment picker as a compact dropdown.
	 *
	 * Collapsed by default showing selected segments. Opens on click with
	 * checkbox list. Selecting "total" clears specific; selecting specific
	 * removes "total". Follows frontpage SegmentSelect logic.
	 */
	import { getSegmentLabel, SEGMENT_ORDER } from '$lib/chartConfig';

	let {
		values = ['total'],
		segments = ['total', ...SEGMENT_ORDER],
		onChange,
		class: className = ''
	}: {
		values: string[];
		segments?: string[];
		onChange: (values: string[]) => void;
		class?: string;
	} = $props();

	let expanded = $state(false);

	const segmentLabels: Record<string, string> = {
		total: 'Alla',
		...Object.fromEntries(SEGMENT_ORDER.map(id => [id, getSegmentLabel(id)]))
	};

	const displayText = $derived(
		values.includes('total')
			? 'Alla'
			: values.map(s => segmentLabels[s] || s).join(', ')
	);

	function toggleSegment(segmentId: string) {
		if (segmentId === 'total') {
			onChange(['total']);
		} else {
			let next = values.filter(s => s !== 'total');
			if (next.includes(segmentId)) {
				next = next.filter(s => s !== segmentId);
			} else {
				next = [...next, segmentId];
			}
			onChange(next.length > 0 ? next : ['total']);
		}
	}

	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.segment-dropdown')) {
			expanded = false;
		}
	}
</script>

<svelte:window onclick={handleClickOutside} />

<div class="segment-dropdown relative {className}">
	<!-- Trigger button -->
	<button
		type="button"
		onclick={() => expanded = !expanded}
		class="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs rounded-md border
			border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700
			text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
	>
		<span class="truncate">{displayText}</span>
		<svg class="w-3.5 h-3.5 flex-shrink-0 text-gray-400 transition-transform {expanded ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
		</svg>
	</button>

	<!-- Dropdown -->
	{#if expanded}
		<div class="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-0.5 z-30">
			{#each segments as segment}
				<button
					type="button"
					onclick={() => toggleSegment(segment)}
					class="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
				>
					<span class="w-3.5 h-3.5 flex items-center justify-center border border-gray-300 dark:border-gray-600 rounded-sm
						{values.includes(segment) ? 'bg-chart-900 border-chart-900' : ''}">
						{#if values.includes(segment)}
							<svg class="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
							</svg>
						{/if}
					</span>
					<span class="text-gray-700 dark:text-gray-200">{segmentLabels[segment] || segment}</span>
				</button>
			{/each}
		</div>
	{/if}
</div>
