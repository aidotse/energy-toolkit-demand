/**
 * Standard interface for all chart components in the Explorer application
 *
 * This interface defines the common props and behavior patterns that all
 * visualization components must implement for consistency and maintainability.
 *
 * @module ChartComponent
 */

/**
 * Scenario object type
 */
export interface ScenarioObject {
	id?: string;
	scenario_id?: string;
	name?: string;
	parameters?: Record<string, any>;
	color?: string; // Color for visualization in comparison mode
	[key: string]: any;
}

/**
 * Base props that all chart components must accept
 */
export interface BaseChartProps {
	/** Primary data to display. If undefined/null/empty, component will fetch its own data */
	data?: any[] | null;

	/** Loading state - when true, show LoadingSkeleton */
	loading?: boolean;

	/** Error state - when present, show ErrorState with message */
	error?: string | Error | null;

	/** Geography filter (e.g., '01' for Stockholm, 'all' for national) */
	geography?: string;

	/** Year to display data for */
	year?: number;

	/**
	 * @deprecated Use `scenarios` array instead for forward compatibility
	 * Single scenario object containing scenario_id and parameters
	 */
	scenario?: ScenarioObject;

	/**
	 * Array of scenarios to display (for comparison mode)
	 * When only one scenario provided, renders single scenario view
	 * When 2-3 scenarios provided, enables comparison visualization
	 */
	scenarios?: ScenarioObject[];

	/**
	 * Enable scenario comparison mode
	 * When true, component will render multiple scenarios with visual distinction
	 */
	comparisonMode?: boolean;

	/** Additional CSS classes */
	class?: string;
}

/**
 * Props for time-series chart components
 */
export interface TimeSeriesChartProps extends BaseChartProps {
	/** Time resolution: '1h', '1d', '1w', '1M', '1Y' */
	resolution?: '1h' | '1d' | '1w' | '1M' | '1Y';

	/** Aggregation function: 'sum' or 'mean' */
	aggregation?: 'sum' | 'mean';

	/** Start year for time range */
	startYear?: number;

	/** End year for time range */
	endYear?: number;
}

/**
 * Props for geographic chart components
 */
export interface GeographicChartProps extends BaseChartProps {
	/** GeoJSON data for map rendering */
	geojson?: any;

	/** Bounds for color scaling */
	bounds?: {
		lower_bound: number;
		upper_bound: number;
	};
}

/**
 * Props for segment/segment chart components
 */
export interface SegmentChartProps extends BaseChartProps {
	/** Segment/segment filter (e.g., 'housing', 'transport', 'all') */
	segment?: string;
}

/**
 * Standard data transformation patterns
 */
export interface ChartDataTransform {
	/** Transform API response to chart-ready format */
	transformData: (apiData: any[]) => any[];

	/** Aggregate data by time period */
	aggregateByTime?: (data: any[], resolution: string) => any[];

	/** Filter data by geography */
	filterByGeography?: (data: any[], geography: string) => any[];

	/** Filter data by segment */
	filterBySegment?: (data: any[], segment: string) => any[];
}

/**
 * Export capabilities that all chart components should support
 */
export interface ChartExportCapabilities {
	/** Export chart as PNG image */
	exportPNG?: (options?: ExportOptions) => Promise<Blob | string>;

	/** Export chart as SVG */
	exportSVG?: () => Promise<string>;

	/** Export underlying data as CSV */
	exportCSV?: () => string;

	/** Export underlying data as JSON */
	exportJSON?: () => string;
}

/**
 * Export configuration options
 */
export interface ExportOptions {
	/** Image width in pixels */
	width?: number;

	/** Image height in pixels */
	height?: number;

	/** Image quality (0-1 for JPEG/WebP) */
	quality?: number;

	/** Background color */
	backgroundColor?: string;

	/** Include watermark/attribution */
	includeAttribution?: boolean;

	/** Custom filename */
	filename?: string;
}

/**
 * Standard component lifecycle hooks
 */
export interface ChartLifecycle {
	/** Called when component needs to fetch data */
	fetchData: () => Promise<void>;

	/** Called when data fetch fails */
	handleError: (error: Error) => void;

	/** Called to retry failed data fetch */
	retryFetch?: () => Promise<void>;
}

/**
 * Complete standardized chart component interface
 *
 * All chart components should implement these patterns for consistency:
 * 1. Accept data via props OR fetch their own data
 * 2. Use shared LoadingSkeleton, ErrorState, EmptyState components
 * 3. Support export functionality
 * 4. Handle errors gracefully with retry option
 * 5. Be container-aware (responsive via container queries)
 */
export interface StandardChartComponent
	extends BaseChartProps,
		ChartLifecycle,
		ChartExportCapabilities {
	/** Component display name for debugging */
	displayName?: string;

	/** Chart variant/type */
	variant?: string;
}

/**
 * Helper type for chart data point with timestamp
 */
export interface TimeSeriesDataPoint {
	timestamp: Date;
	value: number;
	geography?: string;
	segment?: string;
	scenario_id?: string;
}

/**
 * Helper type for aggregated data point
 */
export interface AggregatedDataPoint {
	period: Date | string;
	value: number;
	total?: number;
	geography?: string;
	segment?: string;
	scenario_id?: string;
}

/**
 * Helper type for segment/segment data
 */
export interface SegmentDataPoint {
	segment: string;
	value: number;
	percentage?: number;
}

/**
 * Helper type for geographic data
 */
export interface GeographicDataPoint {
	geography: string;
	name?: string;
	value: number;
	properties?: Record<string, any>;
}

/**
 * Helper type for multi-scenario time series data point
 */
export interface ComparisonTimeSeriesDataPoint {
	timestamp: Date;
	values: Record<string, number>; // scenario_id -> value
	[key: string]: any;
}

/**
 * Helper type for multi-scenario comparison metadata
 */
export interface ScenarioComparisonMetadata {
	scenarios: ScenarioObject[];
	colors: string[];
	differences?: {
		absolute: Record<string, number>; // scenario_id -> diff from baseline
		percentage: Record<string, number>; // scenario_id -> % diff from baseline
	};
}

export { SCENARIO_COLORS } from '$lib/colors';
