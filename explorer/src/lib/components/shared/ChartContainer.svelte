<script lang="ts">
	/**
	 * ChartContainer Component
	 *
	 * Responsive wrapper for chart components with built-in export functionality.
	 * Uses container queries for context-aware sizing that works in both compressed
	 * front page layouts and full-width chart library pages.
	 *
	 * @component
	 */
	import { FileDown, Download } from 'lucide-svelte';
	import {
		exportToPNG,
		exportToSVG,
		exportToCSV,
		exportToJSON,
		generateFilename,
		type ExportMetadata
	} from '$lib/exportUtils';
	import type { Snippet } from 'svelte';

	let {
		title,
		description,
		aspectRatio = '16/9',
		sizeVariant = 'standard',
		exportable = true,
		chartData,
		metadata,
		headerControls,
		children,
		class: className = ''
	}: {
		title?: string;
		description?: string;
		aspectRatio?: '16/9' | '4/3' | 'square' | 'auto';
		sizeVariant?: 'compact' | 'standard' | 'full';
		exportable?: boolean;
		chartData?: any[];
		metadata?: Partial<ExportMetadata>;
		headerControls?: Snippet;
		children?: Snippet;
		class?: string;
	} = $props();

	let containerRef = $state<HTMLDivElement | null>(null);
	let chartContentRef = $state<HTMLDivElement | null>(null);
	let menuOpen = $state(false);

	// Close menu when clicking outside
	$effect(() => {
		if (menuOpen && typeof window !== 'undefined') {
			const handleClickOutside = (e: MouseEvent) => {
				const target = e.target as HTMLElement;
				if (!target.closest('.export-menu')) {
					menuOpen = false;
				}
			};
			document.addEventListener('click', handleClickOutside);
			return () => document.removeEventListener('click', handleClickOutside);
		}
	});

	// Build complete metadata
	const exportMetadata: ExportMetadata = {
		chartType: metadata?.chartType || 'chart',
		geography: metadata?.geography,
		year: metadata?.year,
		scenario: metadata?.scenario,
		scenarios: metadata?.scenarios,
		timestamp: new Date().toISOString(),
		source: metadata?.source || 'Energy Toolkit: Demand'
	};

	// Aspect ratio classes
	const aspectRatioClasses = {
		'16/9': 'aspect-[16/9]',
		'4/3': 'aspect-[4/3]',
		square: 'aspect-square',
		auto: '' // No aspect ratio constraint
	};

	// Size variant classes - use container queries for responsive sizing
	const sizeVariantClasses = {
		compact: 'h-[200px] @sm:h-[250px] @md:h-[300px]', // Front page compressed
		standard: 'h-[300px] @sm:h-[350px] @md:h-[400px] @lg:h-[450px]', // Chart library
		full: 'h-[400px] @sm:h-[500px] @md:h-[600px] @lg:h-[700px]' // Dedicated pages
	};

	async function handleExportPNG() {
		if (!chartContentRef) return;

		try {
			const filename = generateFilename(exportMetadata, 'png');
			await exportToPNG(chartContentRef, filename, exportMetadata);
		} catch (error) {
			console.error('Failed to export PNG:', error);
			alert('Failed to export chart as PNG. Please try again.');
		}
		menuOpen = false;
	}

	async function handleExportSVG() {
		if (!chartContentRef) return;

		try {
			const filename = generateFilename(exportMetadata, 'svg');
			await exportToSVG(chartContentRef, filename, exportMetadata);
		} catch (error) {
			console.error('Failed to export SVG:', error);
			alert('Failed to export chart as SVG. Please try again.');
		}
		menuOpen = false;
	}

	async function handleExportCSV() {
		if (!chartData || chartData.length === 0) {
			alert('No data available to export');
			menuOpen = false;
			return;
		}

		try {
			const filename = generateFilename(exportMetadata, 'csv');
			await exportToCSV(chartData, filename, exportMetadata);
		} catch (error) {
			console.error('Failed to export CSV:', error);
			alert('Failed to export data as CSV. Please try again.');
		}
		menuOpen = false;
	}

	async function handleExportJSON() {
		if (!chartData || chartData.length === 0) {
			alert('No data available to export');
			menuOpen = false;
			return;
		}

		try {
			const filename = generateFilename(exportMetadata, 'json');
			await exportToJSON(chartData, filename, exportMetadata);
		} catch (error) {
			console.error('Failed to export JSON:', error);
			alert('Failed to export data as JSON. Please try again.');
		}
		menuOpen = false;
	}
</script>

<div
	bind:this={containerRef}
	class="chart-container relative @container w-full {className}"
	role="region"
	aria-label={title || 'Chart'}
>
	<!-- Header with title and export menu -->
	{#if title || exportable || headerControls}
		<div class="chart-header flex items-center justify-between gap-4 mb-3">
			<div class="flex-1 min-w-0">
				{#if title}
					<h3 class="text-sm font-medium text-gray-900 dark:text-white flex-shrink-0">
						{title}
					</h3>
				{/if}
				{#if description}
					<p class="text-xs text-gray-600 dark:text-gray-400 mt-1">
						{description}
					</p>
				{/if}
			</div>

			<div class="flex items-center gap-2 flex-shrink-0">
				{#if headerControls}
					{@render headerControls()}
				{/if}

				{#if exportable}
					<div class="export-menu relative">
						<button
							class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
							onclick={() => (menuOpen = !menuOpen)}
							title="Exportera diagram"
							aria-label="Export chart"
						>
							<FileDown class="w-3.5 h-3.5" />
						</button>

					{#if menuOpen}
						<div class="absolute right-0 top-10 z-50 min-w-[200px] bg-white dark:bg-gray-800 rounded shadow-sm border border-gray-200 dark:border-gray-700 py-1">
							<button
								class="w-full px-4 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
								onclick={handleExportPNG}
							>
								<Download size={16} />
								Export PNG (1920x1080)
							</button>
							<button
								class="w-full px-4 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
								onclick={handleExportSVG}
							>
								<Download size={16} />
								Export SVG (Vector)
							</button>
							<button
								class="w-full px-4 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
								onclick={handleExportCSV}
								disabled={!chartData || chartData.length === 0}
							>
								<Download size={16} />
								Export Data (CSV)
							</button>
							<button
								class="w-full px-4 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
								onclick={handleExportJSON}
								disabled={!chartData || chartData.length === 0}
							>
								<Download size={16} />
								Export Data (JSON)
							</button>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>
{/if}

	<!-- Chart content with responsive sizing -->
	<div
		bind:this={chartContentRef}
		class="chart-content w-full {aspectRatio !== 'auto'
			? aspectRatioClasses[aspectRatio]
			: sizeVariantClasses[sizeVariant]}"
	>
		{#if children}
			{@render children()}
		{/if}
	</div>
</div>

<style>
	.chart-container {
		container-type: inline-size;
	}
</style>
