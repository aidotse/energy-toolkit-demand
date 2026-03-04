/**
 * Control Component Types
 *
 * Shared TypeScript interfaces for reusable control components.
 */

export interface YearSelectorProps {
	value: number;
	years?: number[];
	onChange: (year: number) => void;
	variant?: 'dropdown' | 'slider';
	size?: 'sm' | 'md' | 'lg';
	class?: string;
}

export interface SegmentSelectorProps {
	value: string;
	segments?: string[];
	onChange: (segment: string) => void;
	variant?: 'dropdown' | 'pills' | 'radio';
	size?: 'sm' | 'md' | 'lg';
	class?: string;
}

export interface ResolutionSelectorProps {
	value: string;
	resolutions?: string[];
	onChange: (resolution: string) => void;
	variant?: 'dropdown' | 'pills';
	size?: 'sm' | 'md' | 'lg';
	class?: string;
}

export interface AggregationSelectorProps {
	value: string;
	aggregations?: string[];
	onChange: (aggregation: string) => void;
	variant?: 'dropdown' | 'pills';
	size?: 'sm' | 'md' | 'lg';
	context?: 'energy' | 'power' | 'generic';
	class?: string;
}

export interface GeographySelectorProps {
	value: string;
	geographies?: string[];
	onChange: (geography: string) => void;
	variant?: 'dropdown' | 'pills';
	size?: 'sm' | 'md' | 'lg';
	class?: string;
}

/**
 * Chart Parameters
 * Used for per-chart parameter overrides
 */
export interface ChartParameters {
	geography?: string;
	year?: number;
	segment?: string | string[];
	resolution?: string;
	scenarioId?: string;
	parameterValues?: Record<string, number>;
}

/**
 * Available Parameters
 * Lists of available options for each parameter type
 */
export interface AvailableParameters {
	years?: number[];
	geographies?: string[];
	segments?: string[];
	resolutions?: string[];
	scenarios?: Array<{ id: string; name: string; is_default?: boolean }>;
}
