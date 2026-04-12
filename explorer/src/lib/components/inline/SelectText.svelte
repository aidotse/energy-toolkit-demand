<!-- SimpleSelect.svelte — trigger row stays fixed, list expands around it -->
<script lang="ts">
	import { tick } from 'svelte';

	/* props */
	let { items = [], geography = $bindable() } = $props();

	/* state (must use `let`) */
	let open        = $state(false);
	// svelte-ignore state_referenced_locally
	let selectedIdx = $state(
		Math.max(0, items.findIndex((o: { value: string }) => o.value === geography))
	);
	let listEl: HTMLUListElement;

	function toggle()             { open = !open; }
	function choose(idx: number)  {
		selectedIdx = idx;
		geography   = items[idx].value;
		open        = false;
	}

	/* shift list so the selected <li> overlaps the trigger row */
	$effect(() => {
		void (async () => {
			if (open && listEl) {
				await tick();                                   // wait for list render
				const li      = listEl.children[selectedIdx] as HTMLLIElement;
				const offsetY = li?.offsetTop ?? 0;
				listEl.style.transform = `translateY(-${offsetY}px)`;  // move list up
			} else if (listEl) {
				listEl.style.transform = '';                              // reset
			}
		})();
	});
</script>

<div class="relative inline-block select-none">
	<!-- dropdown list (always in the DOM) -->
	<ul
		bind:this={listEl}
		class="absolute left-0 w-max whitespace-nowrap rounded border border-gray-300 bg-white shadow-lg
		       transition-[max-height] duration-150 overflow-hidden
		       {open ? 'z-50 max-h-48' : 'max-h-8'}"
	>
		{#each items as item, idx}
			<li>
				<button
					type="button"
					onclick={() => choose(idx)}
					class="w-full text-left px-2 py-1 cursor-pointer hover:bg-gray-100
					       {idx === selectedIdx ? 'font-semibold bg-indigo-50' : ''}"
				>
					{item.label}
				</button>
			</li>
		{/each}
	</ul>

	<!-- trigger text / hit‑area -->
	<button
		type="button"
		class="cursor-pointer px-2 py-1 relative z-40"
		onclick={toggle}
	>
		{items[selectedIdx]?.label}
	</button>
</div>
