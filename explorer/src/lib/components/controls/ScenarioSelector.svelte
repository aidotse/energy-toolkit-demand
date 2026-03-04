<script lang="ts">
	/**
	 * ScenarioSelector - Per-chart scenario selection control.
	 * Renders a vertical list of scenarios with the default marked.
	 */
	import { BarChart3 } from 'lucide-svelte';

	let {
		value,
		scenarios = [],
		onChange,
		size = 'sm',
		class: className = ''
	}: {
		value: string;
		scenarios: Array<{ id: string; name: string; is_default?: boolean }>;
		onChange: (scenarioId: string) => void;
		size?: 'sm' | 'md' | 'lg';
		class?: string;
	} = $props();

	const sizeClasses = {
		sm: 'px-2.5 py-1.5 text-xs',
		md: 'px-3 py-2 text-sm',
		lg: 'px-4 py-2.5 text-base'
	};
</script>

<div class="flex flex-col gap-1 {className}">
	{#each scenarios as scenario}
		<button
			type="button"
			onclick={() => onChange(scenario.id)}
			class="w-full flex items-center gap-2 rounded-md text-left transition-colors
				{value === scenario.id
					? 'bg-chart-700/10 text-chart-900 dark:text-chart-100 font-medium'
					: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'}
				{sizeClasses[size]}"
		>
			<BarChart3 class="w-3.5 h-3.5 flex-shrink-0" />
			<span class="truncate">{scenario.name}</span>
			{#if scenario.is_default}
				<span class="ml-auto text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500 flex-shrink-0">
					standard
				</span>
			{/if}
		</button>
	{/each}
</div>
