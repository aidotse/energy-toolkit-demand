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
	import { FileDown, Download, Copy, Check, Presentation, FileText, Globe } from 'lucide-svelte';
	import {
		exportToPNG,
		exportToCSV,
		exportToJSON,
		copyImageToClipboard,
		generateFilename,
		type ExportMetadata,
		type PngOptions
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
		exportPadding,
		children,
		class: className = '',
		contentClass = ''
	}: {
		title?: string;
		description?: string;
		aspectRatio?: '16/9' | '4/3' | 'square' | 'auto';
		sizeVariant?: 'compact' | 'standard' | 'full' | 'none';
		exportable?: boolean;
		chartData?: any[];
		metadata?: Partial<ExportMetadata>;
		headerControls?: Snippet;
		/**
		 * Per-chart visual breathing room added to the captured image (PNG / clipboard).
		 * Each side is in CSS pixels of the live element. Has no effect on the live page —
		 * only the export. Use this to give axis labels room to breathe, push the title
		 * away from the chart edge, etc. See chart components for sensible defaults.
		 */
		exportPadding?: { top?: number; right?: number; bottom?: number; left?: number };
		children?: Snippet;
		class?: string;
		contentClass?: string;
	} = $props();

	let containerRef = $state<HTMLDivElement | null>(null);
	let menuOpen = $state(false);
	let transparentBg = $state(false);
	let copyState = $state<'idle' | 'copying' | 'copied' | 'failed'>('idle');

	// Gate child rendering on non-zero container dimensions. Without this,
	// charts mounted inside a `display: none` responsive wrapper (e.g. the
	// home page renders the same content tree twice, one for mobile and one
	// for desktop, with Tailwind's `hidden lg:block` / `lg:hidden` classes)
	// fire layerchart's ResizeObserver with 0×0 and produce a flood of
	// "Target div has zero width/height" warnings plus negative-rect errors.
	let isVisible = $state(false);

	$effect(() => {
		if (!containerRef || typeof ResizeObserver === 'undefined') return;
		// Seed from the current box synchronously so we don't lose a render tick
		// waiting for the first ResizeObserver callback — matters for test
		// environments (where the query runs immediately after mount) and for any
		// container that's already laid out by the time we observe it.
		const rect = containerRef.getBoundingClientRect();
		if (rect.width > 0 && rect.height > 0) isVisible = true;
		const ro = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const { width, height } = entry.contentRect;
				if (width > 0 && height > 0) {
					isVisible = true;
				} else if (isVisible) {
					// Drop back to not-visible if the container gets hidden.
					// This keeps the chart out of the DOM when the responsive
					// tree swap flips the other way.
					isVisible = false;
				}
			}
		});
		ro.observe(containerRef);
		return () => ro.disconnect();
	});

	const PNG_PRESETS = {
		powerpoint: { width: 1920, height: 1080, suffix: 'powerpoint', label: 'PowerPoint (1920×1080)' },
		word: { width: 1500, height: 1000, suffix: 'word', label: 'Word (1500×1000)' },
		web: { width: 1280, height: 720, suffix: 'web', label: 'Web (1280×720)' }
	} as const;

	type PresetKey = keyof typeof PNG_PRESETS;

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
		source: metadata?.source || 'Behovskartan.se'
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
		none: '', // Content determines height
		compact: 'h-[200px] @sm:h-[250px] @md:h-[300px]', // Front page compressed
		standard: 'h-[300px] @sm:h-[350px] @md:h-[400px] @lg:h-[450px]', // Chart library
		full: 'h-[400px] @sm:h-[500px] @md:h-[600px] @lg:h-[700px]' // Dedicated pages
	};

	function pngOptions(preset: PresetKey): PngOptions {
		const cfg = PNG_PRESETS[preset];
		return {
			width: cfg.width,
			height: cfg.height,
			transparent: transparentBg,
			pad: exportPadding
		};
	}

	function pngFilename(preset: PresetKey): string {
		const cfg = PNG_PRESETS[preset];
		return generateFilename(
			{ ...exportMetadata, chartType: `${exportMetadata.chartType}_${cfg.suffix}` },
			'png'
		);
	}

	async function handleExportPng(preset: PresetKey) {
		if (!containerRef) return;

		try {
			await exportToPNG(containerRef, pngFilename(preset), exportMetadata, pngOptions(preset));
		} catch (error) {
			console.error('Failed to export PNG:', error);
			alert('Failed to export chart as PNG. Please try again.');
		}
		menuOpen = false;
	}

	async function handleCopyImage() {
		if (!containerRef || copyState === 'copying') return;

		copyState = 'copying';
		try {
			// Use the largest preset for clipboard so pasted images stay sharp.
			await copyImageToClipboard(containerRef, exportMetadata, pngOptions('powerpoint'));
			copyState = 'copied';
			setTimeout(() => {
				if (copyState === 'copied') copyState = 'idle';
			}, 2000);
		} catch (error) {
			console.error('Failed to copy image:', error);
			copyState = 'failed';
			setTimeout(() => {
				if (copyState === 'failed') copyState = 'idle';
			}, 2500);
		}
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
		<div class="chart-header flex flex-col @sm:flex-row @sm:items-center @sm:justify-between gap-2 @sm:gap-4 mb-3">
			<div class="flex-1 min-w-0">
				{#if title}
					<h3 class="text-sm font-medium text-gray-900 flex-shrink-0">
						{title}
					</h3>
				{/if}
				{#if description}
					<p class="text-xs text-gray-600 mt-1 max-w-prose">
						{description}
					</p>
				{/if}
			</div>

			<div class="flex items-center gap-2 flex-shrink-0">
				{#if headerControls}
					<!-- export-hide: parameter sliders, filters etc. shouldn't appear in exported images -->
					<span class="export-hide flex items-center gap-2">
						{@render headerControls()}
					</span>
				{/if}

				{#if exportable}
					<div class="export-menu relative">
						<button
							class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all bg-gray-100 text-gray-600 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
							onclick={() => (menuOpen = !menuOpen)}
							title="Exportera diagram"
							aria-label="Export chart"
						>
							<FileDown class="w-3.5 h-3.5" />
						</button>

					{#if menuOpen}
						<div class="absolute right-0 top-10 z-50 min-w-[240px] bg-white rounded shadow-sm border border-gray-200 py-1">
							<button
								class="w-full px-4 py-2 text-sm text-left hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
								onclick={handleCopyImage}
								disabled={copyState === 'copying'}
							>
								{#if copyState === 'copied'}
									<Check size={16} class="text-green-600" />
									Copied!
								{:else if copyState === 'failed'}
									<Copy size={16} class="text-red-600" />
									Copy failed
								{:else if copyState === 'copying'}
									<Copy size={16} />
									Copying…
								{:else}
									<Copy size={16} />
									Copy as image
								{/if}
							</button>

							<div class="border-t border-gray-100 my-1"></div>

							<button
								class="w-full px-4 py-2 text-sm text-left hover:bg-gray-100 flex items-center gap-2"
								onclick={() => handleExportPng('powerpoint')}
							>
								<Presentation size={16} />
								PNG → {PNG_PRESETS.powerpoint.label}
							</button>
							<button
								class="w-full px-4 py-2 text-sm text-left hover:bg-gray-100 flex items-center gap-2"
								onclick={() => handleExportPng('word')}
							>
								<FileText size={16} />
								PNG → {PNG_PRESETS.word.label}
							</button>
							<button
								class="w-full px-4 py-2 text-sm text-left hover:bg-gray-100 flex items-center gap-2"
								onclick={() => handleExportPng('web')}
							>
								<Globe size={16} />
								PNG → {PNG_PRESETS.web.label}
							</button>

							<div class="border-t border-gray-100 my-1"></div>

							<button
								class="w-full px-4 py-2 text-sm text-left hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
								onclick={handleExportCSV}
								disabled={!chartData || chartData.length === 0}
							>
								<Download size={16} />
								Export Data (CSV)
							</button>
							<button
								class="w-full px-4 py-2 text-sm text-left hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
								onclick={handleExportJSON}
								disabled={!chartData || chartData.length === 0}
							>
								<Download size={16} />
								Export Data (JSON)
							</button>

							<div class="border-t border-gray-100 my-1"></div>

							<label class="w-full px-4 py-2 text-sm text-left hover:bg-gray-100 flex items-center gap-2 cursor-pointer">
								<input type="checkbox" class="rounded" bind:checked={transparentBg} />
								Transparent background
							</label>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>
{/if}

	<!-- Chart content with responsive sizing. Children are only mounted when
	     `isVisible` is true — set by the ResizeObserver above once the
	     container has non-zero dimensions. This prevents layerchart from
	     throwing "zero width/height" warnings inside `display: none`
	     responsive wrappers. -->
	<div class="chart-content {contentClass}">
		<div class="{aspectRatio !== 'auto'
			? aspectRatioClasses[aspectRatio]
			: sizeVariantClasses[sizeVariant]}">
			{#if children && isVisible}
				{@render children()}
			{/if}
		</div>
	</div>
</div>

<style>
	.chart-container {
		container-type: inline-size;
	}
</style>
