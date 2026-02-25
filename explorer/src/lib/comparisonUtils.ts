/**
 * Comparison Utilities for Scenario Comparison Mode
 *
 * Helper functions and utilities for multi-scenario visualization and comparison.
 *
 * @module comparisonUtils
 */

import type {
	ScenarioObject,
	ComparisonTimeSeriesDataPoint,
	ScenarioComparisonMetadata
} from '$lib/types/ChartComponent.interface';
import { SCENARIO_COLORS, COMPARISON_COLORS } from '$lib/colors';

export { COMPARISON_COLORS };

/**
 * Get normalized scenarios array from props
 * Handles backward compatibility with single scenario prop
 *
 * @param scenario - Single scenario (deprecated)
 * @param scenarios - Array of scenarios (preferred)
 * @returns Normalized array of scenarios
 */
export function getNormalizedScenarios(
	scenario?: ScenarioObject,
	scenarios?: ScenarioObject[]
): ScenarioObject[] {
	if (scenarios && scenarios.length > 0) {
		return scenarios;
	}
	if (scenario) {
		return [scenario];
	}
	return [];
}

/**
 * Assign colors to scenarios for visualization
 * Assigns consistent colors based on scenario order
 *
 * @param scenarios - Array of scenario objects
 * @returns Array of scenarios with assigned colors
 */
export function assignScenarioColors(scenarios: ScenarioObject[]): ScenarioObject[] {
	return scenarios.map((scenario, index) => ({
		...scenario,
		color: scenario.color || COMPARISON_COLORS[index % COMPARISON_COLORS.length]
	}));
}

/**
 * Get scenario color by ID
 * Returns assigned color for a specific scenario
 *
 * @param scenarioId - Scenario ID
 * @param scenarios - Array of scenarios with colors
 * @returns Hex color string or default gray
 */
export function getScenarioColor(
	scenarioId: string,
	scenarios: ScenarioObject[]
): string {
	const scenario = scenarios.find((s) => s.id === scenarioId || s.scenario_id === scenarioId);
	return scenario?.color || SCENARIO_COLORS.baseline;
}

/**
 * Calculate absolute differences between scenarios and baseline
 * First scenario is considered the baseline
 *
 * @param values - Object mapping scenario_id to value
 * @param scenarios - Array of scenario objects
 * @returns Object mapping scenario_id to absolute difference from baseline
 */
export function calculateAbsoluteDifferences(
	values: Record<string, number>,
	scenarios: ScenarioObject[]
): Record<string, number> {
	if (scenarios.length === 0) return {};

	const baselineId = scenarios[0].id || scenarios[0].scenario_id || '';
	const baselineValue = values[baselineId] || 0;

	const differences: Record<string, number> = {};
	for (const scenario of scenarios) {
		const scenarioId = scenario.id || scenario.scenario_id || '';
		differences[scenarioId] = (values[scenarioId] || 0) - baselineValue;
	}

	return differences;
}

/**
 * Calculate percentage differences between scenarios and baseline
 * First scenario is considered the baseline
 *
 * @param values - Object mapping scenario_id to value
 * @param scenarios - Array of scenario objects
 * @returns Object mapping scenario_id to percentage difference from baseline
 */
export function calculatePercentageDifferences(
	values: Record<string, number>,
	scenarios: ScenarioObject[]
): Record<string, number> {
	if (scenarios.length === 0) return {};

	const baselineId = scenarios[0].id || scenarios[0].scenario_id || '';
	const baselineValue = values[baselineId] || 0;

	if (baselineValue === 0) {
		// Avoid division by zero
		return Object.fromEntries(scenarios.map((s) => [s.id || s.scenario_id || '', 0]));
	}

	const differences: Record<string, number> = {};
	for (const scenario of scenarios) {
		const scenarioId = scenario.id || scenario.scenario_id || '';
		const scenarioValue = values[scenarioId] || 0;
		differences[scenarioId] = ((scenarioValue - baselineValue) / baselineValue) * 100;
	}

	return differences;
}

/**
 * Merge multiple scenario datasets into comparison format
 * Combines data from different scenarios by timestamp
 *
 * @param dataByScenario - Object mapping scenario_id to data array
 * @param scenarios - Array of scenario objects
 * @returns Array of comparison data points
 */
export function mergeScenarioData(
	dataByScenario: Record<string, any[]>,
	scenarios: ScenarioObject[]
): ComparisonTimeSeriesDataPoint[] {
	const pointsMap = new Map<number, ComparisonTimeSeriesDataPoint>();

	for (const scenario of scenarios) {
		const scenarioId = scenario.id || scenario.scenario_id || '';
		const data = dataByScenario[scenarioId] || [];

		for (const point of data) {
			const timestamp = point.timestamp instanceof Date ? point.timestamp : new Date(point.timestamp);
			const time = timestamp.getTime();

			if (!pointsMap.has(time)) {
				pointsMap.set(time, {
					timestamp,
					values: {}
				});
			}

			const comparisonPoint = pointsMap.get(time)!;
			comparisonPoint.values[scenarioId] = point.value || point.total || 0;
		}
	}

	return Array.from(pointsMap.values()).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

/**
 * Create scenario comparison metadata
 * Generates metadata for legend and comparison visualization
 *
 * @param scenarios - Array of scenario objects with assigned colors
 * @param comparisonData - Optional comparison data for calculating differences
 * @returns Scenario comparison metadata object
 */
export function createComparisonMetadata(
	scenarios: ScenarioObject[],
	comparisonData?: ComparisonTimeSeriesDataPoint[]
): ScenarioComparisonMetadata {
	const colors = scenarios.map((s) => s.color || SCENARIO_COLORS.baseline);

	if (!comparisonData || comparisonData.length === 0) {
		return {
			scenarios,
			colors
		};
	}

	// Calculate average differences across all data points
	const totalDifferences = {
		absolute: Object.fromEntries(scenarios.map((s) => [s.id || s.scenario_id || '', 0])),
		percentage: Object.fromEntries(scenarios.map((s) => [s.id || s.scenario_id || '', 0]))
	};

	for (const point of comparisonData) {
		const absDiff = calculateAbsoluteDifferences(point.values, scenarios);
		const pctDiff = calculatePercentageDifferences(point.values, scenarios);

		for (const scenario of scenarios) {
			const scenarioId = scenario.id || scenario.scenario_id || '';
			totalDifferences.absolute[scenarioId] += absDiff[scenarioId] || 0;
			totalDifferences.percentage[scenarioId] += pctDiff[scenarioId] || 0;
		}
	}

	// Average the differences
	const count = comparisonData.length;
	for (const scenarioId in totalDifferences.absolute) {
		totalDifferences.absolute[scenarioId] /= count;
		totalDifferences.percentage[scenarioId] /= count;
	}

	return {
		scenarios,
		colors,
		differences: totalDifferences
	};
}

/**
 * Format percentage difference for display
 * Adds appropriate prefix and suffix
 *
 * @param value - Percentage value
 * @param includeSign - Whether to include + sign for positive values
 * @returns Formatted string
 */
export function formatPercentageDiff(value: number, includeSign = true): string {
	const sign = value > 0 && includeSign ? '+' : '';
	return `${sign}${value.toFixed(1)}%`;
}

/**
 * Format absolute difference for display
 * Adds appropriate prefix and unit
 *
 * @param value - Absolute difference value
 * @param unit - Unit string (e.g., 'MWh', 'MW')
 * @param includeSign - Whether to include + sign for positive values
 * @returns Formatted string
 */
export function formatAbsoluteDiff(value: number, unit = '', includeSign = true): string {
	const sign = value > 0 && includeSign ? '+' : '';
	const absValue = Math.abs(value);

	if (absValue >= 1e12) {
		return `${sign}${(value / 1e12).toFixed(1)} T${unit}`;
	} else if (absValue >= 1e9) {
		return `${sign}${(value / 1e9).toFixed(1)} G${unit}`;
	} else if (absValue >= 1e6) {
		return `${sign}${(value / 1e6).toFixed(1)} M${unit}`;
	} else if (absValue >= 1e3) {
		return `${sign}${(value / 1e3).toFixed(1)} k${unit}`;
	} else {
		return `${sign}${value.toFixed(1)} ${unit}`;
	}
}

/**
 * Convert hex color to rgba with opacity
 * Converts a hex color string to rgba format with specified opacity
 *
 * @param hex - Hex color string (e.g., '#3b82f6' or '3b82f6')
 * @param opacity - Opacity value between 0 and 1
 * @returns RGBA color string (e.g., 'rgba(59, 130, 246, 0.5)')
 */
export function hexToRgba(hex: string, opacity: number): string {
	// Remove # if present
	const cleanHex = hex.replace('#', '');

	// Parse hex to RGB
	const r = parseInt(cleanHex.substring(0, 2), 16);
	const g = parseInt(cleanHex.substring(2, 4), 16);
	const b = parseInt(cleanHex.substring(4, 6), 16);

	return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
