<script lang="ts">
	/**
	 * ParameterControls - Container for base scenario selector and parameter sliders
	 *
	 * Designed for navigation dropdowns (compact) with pluggable slider components.
	 * Reads/writes directly to parameterStore for immediate reactivity.
	 */
	import { parameterStore, getParameterLabel } from '$lib/stores/parameterStore.svelte';
	import type { Strategy2Parameter } from '$lib/dataService';
	import ParameterSlider from './ParameterSlider.svelte';
	import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-svelte';
	import type { Snippet } from 'svelte';

	// Segment display names
	const SEGMENT_LABELS: Record<string, string> = {
		housing: 'Bostäder',
		transport: 'Transport',
		industry: 'Industri',
		services: 'Service',
		datacenters: 'Datacenter'
	};

	let {
		compact = false,
		showReset = true,
		showSummary = true,
		sliderComponent
	}: {
		compact?: boolean;
		showReset?: boolean;
		showSummary?: boolean;
		sliderComponent?: Snippet<[Strategy2Parameter, number, (value: number) => void]>;
	} = $props();

	// Track which segments are expanded (default: all expanded)
	let expandedSegments = $state<Record<string, boolean>>({
		housing: true,
		transport: true,
		industry: true,
		services: true,
		datacenters: true
	});

	function toggleSegment(segment: string) {
		expandedSegments[segment] = !expandedSegments[segment];
	}

	function handleBaseScenarioChange(scenarioId: string) {
		parameterStore.setBaseScenario(scenarioId);
	}

	function handleParameterChange(paramName: string, value: number) {
		parameterStore.setParameterValue(paramName, value);
	}

	// Get parameter type label (e.g., 'housing_growth' -> 'Tillväxt')
	function getParamTypeLabel(paramName: string): string {
		const labels: Record<string, string> = {
			growth: 'Tillväxt',
			flex: 'Flexibilitet'
		};
		const type = paramName.split('_').pop() || '';
		return labels[type] || type;
	}
</script>

{#if parameterStore.isInitialized}
	<div class="space-y-4" class:space-y-3={compact}>
		<!-- Base Scenario Selector -->
		<div class="space-y-2">
			<label class="block text-xs font-medium text-gray-600 dark:text-gray-400">
				Basscenario
			</label>
			<div class="flex flex-col gap-1">
				{#each parameterStore.baseScenarios as scenario}
					<button
						onclick={() => handleBaseScenarioChange(scenario.id)}
						class="w-full px-3 py-2 text-left text-sm rounded-md transition-colors
							{parameterStore.baseScenario === scenario.id
							? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 font-medium'
							: 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-750'}"
					>
						{scenario.name}
						{#if scenario.default}
							<span class="text-xs text-gray-400 ml-1">(Standard)</span>
						{/if}
					</button>
				{/each}
			</div>
		</div>

		<!-- Parameter Section - Only show for default scenario -->
		{#if parameterStore.isDefaultScenario}
			<!-- Divider -->
			<hr class="border-gray-200 dark:border-gray-700" />

			<!-- Parameter Groups -->
			<div class="space-y-2">
				<div class="flex items-center justify-between">
					<label class="block text-xs font-medium text-gray-600 dark:text-gray-400">
						Parametrar
						{#if parameterStore.activeParameterCount > 0}
							<span class="ml-1 px-1.5 py-0.5 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded text-xs">
								{parameterStore.activeParameterCount}
							</span>
						{/if}
					</label>
					{#if showReset && parameterStore.hasActiveParameters}
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

							<!-- Parameter Sliders -->
							{#if expandedSegments[segment]}
								<div class="px-3 py-2 space-y-3 bg-white dark:bg-gray-800">
									{#each params as param}
										{@const currentValue = parameterStore.getParameterValue(param.name)}
										{#if sliderComponent}
											<!-- Use custom slider component via snippet -->
											{@render sliderComponent(param, currentValue, (v) => handleParameterChange(param.name, v))}
										{:else}
											<!-- Default slider component -->
											<div class="space-y-1">
												<div class="flex items-center justify-between text-xs">
													<span class="text-gray-600 dark:text-gray-400">
														{getParamTypeLabel(param.name)}
													</span>
													<span class="font-medium text-gray-900 dark:text-gray-100">
														{getParameterLabel(param, currentValue)}
													</span>
												</div>
												<ParameterSlider
													parameter={param}
													value={currentValue}
													onchange={(v) => handleParameterChange(param.name, v)}
													compact={true}
												/>
											</div>
										{/if}
									{/each}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>

			<!-- Active Parameters Summary -->
			{#if showSummary && parameterStore.hasActiveParameters}
				<div class="p-2 bg-primary-50 dark:bg-primary-900/30 rounded-md">
					<p class="text-xs text-primary-700 dark:text-primary-300">
						<strong>Aktiva:</strong>
						{#each Object.entries(parameterStore.parameterValues).filter(([_, v]) => v > 0) as [name, index], i}
							{@const param = parameterStore.getParameter(name)}
							{#if param}
								{#if i > 0}, {/if}
								{SEGMENT_LABELS[param.segment] || param.segment} {getParamTypeLabel(name).toLowerCase()}: {getParameterLabel(param, index)}
							{/if}
						{/each}
					</p>
				</div>
			{/if}
		{:else}
			<!-- Message when non-default scenario is selected -->
			<div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
				<p class="text-xs text-gray-500 dark:text-gray-400">
					Parametrar kan endast justeras för <strong>{parameterStore.defaultScenario?.name || 'Beslutad Policy'}</strong>-scenariot.
				</p>
			</div>
		{/if}
	</div>
{:else}
	<div class="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
		Laddar parametrar...
	</div>
{/if}
