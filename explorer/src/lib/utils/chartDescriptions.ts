/**
 * Chart description generation utilities
 *
 * Extracted from ChartEmbed.svelte so both the content pages and the
 * dashboard /charts page can produce dynamic chart descriptions from
 * the same single source of truth.
 */

import { SEGMENT_LABELS, getSegmentLabel } from '$lib/chartConfig';
import { getParameterLabel } from '$lib/stores/parameterStore.svelte';

/** Map parameter name suffix to Swedish label */
function getParamTypeLabel(paramName: string): string {
	const labels: Record<string, string> = { growth: 'tillväxt', flex: 'flex' };
	const type = paramName.split('_').pop() || '';
	return labels[type] || type;
}

/**
 * Build the scenario suffix for a chart description.
 * e.g. "i scenariot Beslutad Policy med +5% tillväxt i Bostäder."
 */
export function buildScenarioSuffix(
	baseScenarioId: string,
	baseScenarios: Array<{ id: string; name: string }>,
	parameterValues: Record<string, number>,
	getParameter: (name: string) => any
): string {
	const name = baseScenarios.find((s) => s.id === baseScenarioId)?.name || '';
	if (!name) return '';

	const entries = Object.entries(parameterValues).filter(([_, v]) => v > 0);
	if (entries.length === 0) return `i scenariot ${name}.`;

	const bySegment = new Map<string, string[]>();
	for (const [pName, index] of entries) {
		const param = getParameter(pName);
		if (!param) continue;
		const type = getParamTypeLabel(pName);
		const label = getParameterLabel(param, index);
		if (!bySegment.has(param.segment)) bySegment.set(param.segment, []);
		bySegment.get(param.segment)!.push(`${label} ${type}`);
	}

	const clauses: string[] = [];
	for (const [segment, params] of bySegment) {
		const segmentName = SEGMENT_LABELS[segment] || segment;
		const paramText =
			params.length === 1
				? params[0]
				: params.slice(0, -1).join(', ') + ' och ' + params[params.length - 1];
		clauses.push(`${paramText} i ${segmentName}`);
	}

	return `i scenariot ${name} med ${clauses.join(', ')}.`;
}

/** Get display name for a geography code */
export function getGeoLabel(
	geography: string,
	geographiesMetadata: Array<{ id?: string; geo_id?: string; name?: string; geo_name?: string }>
): string {
	if (geography === 'total' || geography === '00') return 'Sverige';
	const geo = geographiesMetadata.find(
		(g: any) => g.geo_id === geography || g.id === geography
	);
	return (geo as any)?.geo_name || (geo as any)?.name || geography;
}

/** Get segment suffix for a chart description (empty string for 'total') */
export function getSegmentSuffix(segment: string): string {
	if (segment === 'total') return '';
	return `, sektor ${getSegmentLabel(segment).toLowerCase()}`;
}

/** Per-chart-id description templates */
export const CHART_DESCRIPTIONS: Record<
	string,
	(year: number, geo: string, seg: string, suffix: string) => string
> = {
	'area-yearly': (y, g, seg, s) => `Årligt elbehov för ${g}${seg} 2025–2050 ${s}`,
	'area-chart': (y, g, seg, s) => `Årligt elbehov för ${g}${seg} 2025–2050 ${s}`,
	'sector-pie': (y, g, seg, s) => `Sektorsfördelning av elbehov för ${g} år ${y} ${s}`,
	'segment-arc': (y, g, seg, s) => `Sektorsfördelning av elbehov för ${g} år ${y} ${s}`,
	'geo-segment': (y, g, seg, s) => `Sektorernas andel av elbehovet per län år ${y} ${s}`,
	'geo-bar': (y, g, seg, s) => `Elbehov per region år ${y} ${s}`,
	'period-heatmap': (y, g, seg, s) =>
		`Elbehov fördelat på månad och tid på dygnet för ${g}${seg} år ${y} ${s}`,
	timeline: (y, g, seg, s) => `Elbehov över tid för ${g}${seg} år ${y} ${s}`,
	histogram: (y, g, seg, s) => `Effektbehov fördelat över året för ${g}${seg} år ${y} ${s}`,
	map: (y, g, seg, s) => `Geografisk fördelning av elbehov år ${y} ${s}`,
};
