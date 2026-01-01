<script lang="ts">
	/**
	 * ParameterPanel - Strategy 2 parameter controls
	 *
	 * Displays base scenario selector and independent parameter controls
	 * grouped by segment. Uses parameterStore for state management.
	 */
	import { parameterStore, getParameterLabel } from '$lib/stores/parameterStore.svelte';
	import type { Strategy2Parameter } from '$lib/dataService';
	import { ChevronDown, ChevronUp, RotateCcw, Sliders } from 'lucide-svelte';

	// Segment display names
	const SEGMENT_LABELS: Record<string, string> = {
		housing: 'Bostäder',
		transport: 'Transport',
		industry: 'Industri',
		services: 'Service',
		datacenters: 'Datacenter'
	};

	// Parameter type labels
	const PARAM_TYPE_LABELS: Record<string, string> = {
		growth: 'Tillväxt',
		flex: 'Flexibilitet'
	};

	// Track which segments are expanded
	let expandedSegments = $state<Record<string, boolean>>({
		housing: true,
		transport: true,
		industry: true,
		services: true,
		datacenters: true
	});

	// Toggle segment expansion
	function toggleSegment(segment: string) {
		expandedSegments[segment] = !expandedSegments[segment];
	}

	// Get parameter type from name (e.g., 'housing_growth' -> 'growth')
	function getParamType(paramName: string): string {
		const parts = paramName.split('_');
		return parts[parts.length - 1];
	}

	// Get friendly parameter label
	function getParamLabel(param: Strategy2Parameter): string {
		const type = getParamType(param.name);
		return PARAM_TYPE_LABELS[type] || type;
	}

	// Handle base scenario change
	function handleBaseScenarioChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		parameterStore.setBaseScenario(target.value);
	}

	// Handle parameter value change
	function handleParameterChange(paramName: string, e: Event) {
		const target = e.target as HTMLInputElement;
		parameterStore.setParameterValue(paramName, parseInt(target.value, 10));
	}
</script>

{#if parameterStore.isInitialized}
	<div class="space-y-4">
		<!-- Header -->
		<div class="flex items-center justify-between">
			<h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
				<Sliders class="w-4 h-4" />
				Scenarioparametrar
			</h3>
			{#if parameterStore.hasActiveParameters}
				<button
					onclick={() => parameterStore.resetToBaseline()}
					class="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1"
					title="Återställ alla parametrar"
				>
					<RotateCcw class="w-3 h-3" />
					Återställ
				</button>
			{/if}
		</div>

		<!-- Base Scenario Selector -->
		<div class="space-y-2">
			<label class="block text-xs font-medium text-gray-600 dark:text-gray-400">
				Basscenario
			</label>
			<select
				value={parameterStore.baseScenario}
				onchange={handleBaseScenarioChange}
				class="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
			>
				{#each parameterStore.baseScenarios as scenario}
					<option value={scenario.id}>
						{scenario.name}
						{#if scenario.default}(Standard){/if}
					</option>
				{/each}
			</select>
		</div>

		<!-- Parameter Groups by Segment -->
		<div class="space-y-2">
			<label class="block text-xs font-medium text-gray-600 dark:text-gray-400">
				Justeringar per sektor
				{#if parameterStore.activeParameterCount > 0}
					<span class="ml-1 px-1.5 py-0.5 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded text-xs">
						{parameterStore.activeParameterCount} aktiva
					</span>
				{/if}
			</label>

			<div class="space-y-1">
				{#each Object.entries(parameterStore.parametersBySegment) as [segment, params]}
					<div class="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
						<!-- Segment Header -->
						<button
							onclick={() => toggleSegment(segment)}
							class="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
						>
							<span class="text-sm font-medium text-gray-700 dark:text-gray-300">
								{SEGMENT_LABELS[segment] || segment}
							</span>
							<div class="flex items-center gap-2">
								{#if params.some(p => parameterStore.getParameterValue(p.name) > 0)}
									<span class="w-2 h-2 bg-primary-500 rounded-full"></span>
								{/if}
								{#if expandedSegments[segment]}
									<ChevronUp class="w-4 h-4 text-gray-400" />
								{:else}
									<ChevronDown class="w-4 h-4 text-gray-400" />
								{/if}
							</div>
						</button>

						<!-- Parameter Controls -->
						{#if expandedSegments[segment]}
							<div class="px-3 py-2 space-y-3 bg-white dark:bg-gray-800">
								{#each params as param}
									{@const currentValue = parameterStore.getParameterValue(param.name)}
									<div class="space-y-1">
										<div class="flex items-center justify-between">
											<label class="text-xs text-gray-600 dark:text-gray-400">
												{getParamLabel(param)}
											</label>
											<span class="text-xs font-medium text-gray-900 dark:text-gray-100">
												{getParameterLabel(param, currentValue)}
											</span>
										</div>
										<input
											type="range"
											min="0"
											max={param.values.length - 1}
											value={currentValue}
											oninput={(e) => handleParameterChange(param.name, e)}
											class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
										/>
										<div class="flex justify-between text-[10px] text-gray-400">
											{#each param.values as value}
												<span class:font-medium={value.index === currentValue} class:text-primary-600={value.index === currentValue}>
													{value.label}
												</span>
											{/each}
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>

		<!-- Active Parameters Summary -->
		{#if parameterStore.hasActiveParameters}
			<div class="p-2 bg-primary-50 dark:bg-primary-900/30 rounded-md">
				<p class="text-xs text-primary-700 dark:text-primary-300">
					<strong>Aktiva justeringar:</strong>
					{#each Object.entries(parameterStore.parameterValues).filter(([_, v]) => v > 0) as [name, index], i}
						{@const param = parameterStore.getParameter(name)}
						{#if param}
							{#if i > 0}, {/if}
							{SEGMENT_LABELS[param.segment] || param.segment} {getParamLabel(param).toLowerCase()}: {getParameterLabel(param, index)}
						{/if}
					{/each}
				</p>
			</div>
		{/if}
	</div>
{:else}
	<div class="text-sm text-gray-500 dark:text-gray-400">
		Laddar parametrar...
	</div>
{/if}
