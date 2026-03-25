import { building } from '$app/environment';
import { fetchScenarios, fetchParameters } from '$lib/dataService';
import type { LayoutLoad } from './$types';

export const prerender = true;

export const load: LayoutLoad = async ({ fetch }) => {
	// Skip API calls during static build — client will fetch after hydration
	if (building) {
		return { scenarios: [], parameters: {}, defaultScenario: null };
	}

	try {
		// Load scenarios and parameters for the navigation
		const [scenariosResult, parametersResult] = await Promise.all([
			fetchScenarios(fetch),
			fetchParameters(fetch)
		]);
		const scenarios = scenariosResult.data;
		const parameters = parametersResult.data;

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
