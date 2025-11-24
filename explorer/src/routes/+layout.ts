import { fetchScenarios, fetchParameters } from '$lib/dataService';
import type { LayoutLoad } from './$types';

export const prerender = true;

export const load: LayoutLoad = async ({ fetch }) => {
	try {
		// Load scenarios and parameters for the navigation
		const [scenarios, parameters] = await Promise.all([
			fetchScenarios(fetch),
			fetchParameters(fetch)
		]);

		// Find default scenario or use first
		const defaultScenario = scenarios.find((s: any) => s.is_default) || scenarios[0];

		return {
			scenarios,
			parameters,
			defaultScenario
		};
	} catch (error) {
		console.error('Error loading layout data:', error);
		return {
			scenarios: [],
			parameters: {},
			defaultScenario: null
		};
	}
};
