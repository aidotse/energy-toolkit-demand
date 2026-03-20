<script lang="ts">
	/**
	 * ScenarioVariation - Shows a natural Swedish sentence summarizing active parameter variations
	 *
	 * Only renders when the default scenario is selected and parameters are active.
	 * Groups parameters by segment, e.g.:
	 * "Beslutad Policy med +5% tillväxt och 5% flex i Bostäder, -10% tillväxt i Industri"
	 */
	import { parameterStore, getParameterLabel } from '$lib/stores/parameterStore.svelte';
	import { SEGMENT_LABELS } from '$lib/chartConfig';

	function getParamTypeLabel(paramName: string): string {
		const labels: Record<string, string> = {
			growth: 'tillväxt',
			flex: 'flex'
		};
		const type = paramName.split('_').pop() || '';
		return labels[type] || type;
	}

	const scenarioName = $derived(
		parameterStore.baseScenarios.find(s => s.id === parameterStore.baseScenario)?.name || ''
	);

	const variationText = $derived.by(() => {
		const entries = Object.entries(parameterStore.parameterValues).filter(([_, v]) => v > 0);
		if (entries.length === 0) return '';

		// Group by segment
		const bySegment = new Map<string, string[]>();
		for (const [name, index] of entries) {
			const param = parameterStore.getParameter(name);
			if (!param) continue;
			const segment = param.segment;
			const type = getParamTypeLabel(name);
			const label = getParameterLabel(param, index);
			if (!bySegment.has(segment)) bySegment.set(segment, []);
			bySegment.get(segment)!.push(`${label} ${type}`);
		}

		// Build per-segment clauses: "+5% tillväxt och 5% flex i Bostäder"
		const clauses: string[] = [];
		for (const [segment, params] of bySegment) {
			const segmentName = SEGMENT_LABELS[segment] || segment;
			const paramText = params.length === 1
				? params[0]
				: params.slice(0, -1).join(', ') + ' och ' + params[params.length - 1];
			clauses.push(`${paramText} i ${segmentName}`);
		}

		return `${scenarioName} med ${clauses.join(', ')}`;
	});

	const visible = $derived(parameterStore.isDefaultScenario && parameterStore.hasActiveParameters);
</script>

{#if visible}
	<div class="bg-white/90 backdrop-blur-sm rounded-lg shadow-sm px-3 py-1 text-xs text-gray-700 max-w-full">
		{variationText}
	</div>
{/if}
