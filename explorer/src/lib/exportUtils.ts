/**
 * Export Utilities
 *
 * Functions for exporting charts to various formats (PNG, CSV, JSON) and copying
 * to the clipboard. PNG export uses html-to-image to capture the full chart container
 * (title + description + chart) with all computed styles inlined, then composites onto
 * a fixed-size canvas (PowerPoint / Word / Web presets) with an optional watermark.
 */

import { toPng } from 'html-to-image';

export interface ExportMetadata {
	chartType: string;
	geography?: string;
	year?: number;
	segment?: string;
	scenario?: string;
	scenarios?: string[];
	timestamp: string;
	source: string;
}

export interface PngOptions {
	/** Target canvas width (default 1920) */
	width?: number;
	/** Target canvas height (default 1080) */
	height?: number;
	/** Skip white background fill */
	transparent?: boolean;
	/** Add source + date watermark to the bottom-right */
	watermark?: boolean;
	/** html-to-image internal capture density (default 2) */
	pixelRatio?: number;
	/**
	 * Per-side padding (CSS pixels) added to the captured element before capture
	 * and removed after. Use to give axis labels room to breathe, separate the
	 * title from the chart, etc. Has no effect on the live page.
	 */
	pad?: { top?: number; right?: number; bottom?: number; left?: number };
}

/**
 * Generate standardized filename for exports
 * Format: chart-type_geography_year_scenario_timestamp.ext
 */
export function generateFilename(metadata: ExportMetadata, extension: string): string {
	const parts = [
		metadata.chartType,
		metadata.geography,
		metadata.year,
		metadata.scenario || metadata.scenarios?.join('-vs-')
	].filter(Boolean);

	const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
	return `${parts.join('_')}_${timestamp}.${extension}`;
}

/**
 * Add metadata watermark to canvas
 */
function addWatermark(
	canvas: HTMLCanvasElement,
	metadata: ExportMetadata,
	options: { position?: 'bottom-right' | 'bottom-left'; fontSize?: number } = {}
): void {
	const ctx = canvas.getContext('2d');
	if (!ctx) return;

	const { position = 'bottom-right', fontSize = 12 } = options;

	ctx.font = `${fontSize}px system-ui, -apple-system, sans-serif`;
	ctx.fillStyle = 'rgba(100, 100, 100, 0.7)';
	ctx.textBaseline = 'bottom';

	// YYYY-MM-DD watermark date (ISO short form), Behovskartan.se as the brand
	const isoDate = new Date(metadata.timestamp).toISOString().slice(0, 10);
	const text = `Behovskartan.se | ${isoDate}`;
	const textWidth = ctx.measureText(text).width;

	const padding = 10;
	const x = position === 'bottom-right' ? canvas.width - textWidth - padding : padding;
	const y = canvas.height - padding;

	ctx.fillText(text, x, y);
}

/**
 * Skip elements we don't want in the captured image.
 * - `.export-menu` — the export dropdown button itself
 * - `.export-hide` — anything else flagged "hide me when exporting" (e.g. parameter
 *   sliders icon, drag-to-zoom hints, hover tooltips that don't apply to a static image)
 */
function exportFilter(node: HTMLElement): boolean {
	if (!(node instanceof HTMLElement)) return true;
	const cls = node.classList;
	if (!cls) return true;
	return !cls.contains('export-menu') && !cls.contains('export-hide');
}

/**
 * SVG presentation properties to inline as inline `style="..."` before capture.
 *
 * html-to-image clones the DOM into a foreignObject, but it does NOT inline the
 * computed styles for SVG elements that come from external stylesheets (e.g.
 * Tailwind utility classes like `text-[10px]`, `fill-surface-content`,
 * `overflow-visible`). Inside the foreignObject those classes don't resolve, so
 * text falls back to default browser font-size (~16px), nested SVGs default to
 * `overflow: hidden`, and tick labels get clipped or rendered way too large.
 *
 * The fix: walk every SVG node, copy `getComputedStyle` values for these
 * properties, and write them as inline styles. After capture we restore the
 * original `style` attribute.
 */
const SVG_INLINE_PROPS = [
	'fill',
	'fill-opacity',
	'stroke',
	'stroke-width',
	'stroke-opacity',
	'stroke-dasharray',
	'stroke-linecap',
	'stroke-linejoin',
	'opacity',
	'font-family',
	'font-size',
	'font-weight',
	'font-style',
	'text-anchor',
	'dominant-baseline',
	'overflow',
	'visibility',
	'display'
] as const;

/**
 * Walk every SVG element under `root` and inline computed CSS as inline `style`.
 * Returns a `restore()` callback that puts the original `style` attributes back.
 */
function inlineSvgStyles(root: HTMLElement): () => void {
	const restorers: Array<[Element, string | null]> = [];
	const nodes = root.querySelectorAll('svg, svg *');
	for (const el of nodes) {
		const cs = getComputedStyle(el);
		const original = el.getAttribute('style');
		let extra = '';
		for (const p of SVG_INLINE_PROPS) {
			const v = cs.getPropertyValue(p);
			// Skip empty / "none" / "normal" — they're either invalid or already the default
			if (v && v !== 'none' && v !== 'normal') {
				extra += `${p}:${v};`;
			}
		}
		el.setAttribute('style', (original ?? '') + ';' + extra);
		restorers.push([el, original]);
	}
	return () => {
		for (const [el, orig] of restorers) {
			if (orig === null) el.removeAttribute('style');
			else el.setAttribute('style', orig);
		}
	};
}

/** Trigger a download of a data URL */
function triggerDownload(dataUrl: string, filename: string): void {
	const link = document.createElement('a');
	link.download = filename;
	link.href = dataUrl;
	link.click();
}

/** Load a data URL into an Image and resolve when ready */
function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = () => reject(new Error('Failed to load image'));
		img.src = src;
	});
}

/**
 * Temporarily apply inline padding to an element so the export captures more
 * breathing room around the chart. Returns a `restore()` callback.
 *
 * Uses `box-sizing: content-box` so the padding extends the element's outer
 * size (rather than shrinking the content area), giving us a wider viewport
 * for the html-to-image capture without shrinking the chart inside.
 */
function applyExportPadding(
	element: HTMLElement,
	pad: PngOptions['pad']
): () => void {
	if (!pad) return () => {};
	const { top = 0, right = 0, bottom = 0, left = 0 } = pad;
	if (top === 0 && right === 0 && bottom === 0 && left === 0) return () => {};

	const originalStyle = element.getAttribute('style');
	element.style.paddingTop = `${(parseFloat(getComputedStyle(element).paddingTop) || 0) + top}px`;
	element.style.paddingRight = `${(parseFloat(getComputedStyle(element).paddingRight) || 0) + right}px`;
	element.style.paddingBottom = `${(parseFloat(getComputedStyle(element).paddingBottom) || 0) + bottom}px`;
	element.style.paddingLeft = `${(parseFloat(getComputedStyle(element).paddingLeft) || 0) + left}px`;
	element.style.boxSizing = 'content-box';

	return () => {
		if (originalStyle === null) element.removeAttribute('style');
		else element.setAttribute('style', originalStyle);
	};
}

/**
 * Capture an element via html-to-image, then composite onto a fixed-size canvas
 * with letterboxing, optional white background, and optional watermark.
 *
 * Returns a PNG data URL ready to be downloaded or copied to the clipboard.
 */
async function renderPng(
	element: HTMLElement,
	metadata: ExportMetadata,
	opts: PngOptions
): Promise<string> {
	const {
		width = 1920,
		height = 1080,
		transparent = false,
		watermark = true,
		pixelRatio = 2,
		pad
	} = opts;

	// Wait for animations and any pending layout to settle
	await new Promise((r) => setTimeout(r, 300));

	// Apply per-chart export padding (no-op if pad is undefined or all-zero).
	const restorePadding = applyExportPadding(element, pad);

	// Wait one frame for the padding to take effect in layout.
	if (pad) {
		await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
	}

	// Pre-process: inline computed CSS on every SVG node so the captured DOM
	// doesn't depend on Tailwind classes that won't resolve inside foreignObject.
	// See SVG_INLINE_PROPS comment for the gory details.
	const restoreSvgStyles = inlineSvgStyles(element);

	// Capture the full chart container with all computed styles inlined.
	// html-to-image walks the DOM, reads getComputedStyle() for every node,
	// and inlines the result so the captured image renders identically standalone.
	let captureDataUrl: string;
	try {
		captureDataUrl = await toPng(element, {
			pixelRatio,
			backgroundColor: transparent ? undefined : '#ffffff',
			cacheBust: true,
			filter: exportFilter
		});
	} finally {
		restoreSvgStyles();
		restorePadding();
	}

	const img = await loadImage(captureDataUrl);

	// Composite onto a fixed-size canvas so we can letterbox into the requested preset
	// and apply the watermark consistently across sizes.
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('Could not get canvas context');

	if (!transparent) {
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(0, 0, width, height);
	}

	// Center & fit, preserving aspect ratio (letterbox)
	const scale = Math.min(width / img.width, height / img.height);
	const w = img.width * scale;
	const h = img.height * scale;
	const x = (width - w) / 2;
	const y = (height - h) / 2;
	ctx.drawImage(img, x, y, w, h);

	if (watermark) {
		addWatermark(canvas, metadata);
	}

	return canvas.toDataURL('image/png');
}

/**
 * Export the chart container element to a PNG file at the given preset size.
 * Captures the full container (title + description + chart) with computed styles inlined.
 */
export async function exportToPNG(
	element: HTMLElement,
	filename: string,
	metadata: ExportMetadata,
	options: PngOptions = {}
): Promise<void> {
	try {
		const dataUrl = await renderPng(element, metadata, options);
		triggerDownload(dataUrl, filename);
	} catch (error) {
		console.error('Error exporting to PNG:', error);
		throw new Error('Failed to export chart as PNG');
	}
}

/**
 * Copy the chart container element to the system clipboard as a PNG image.
 * The user can then paste directly into PowerPoint, Word, etc.
 *
 * Throws if the browser doesn't support `ClipboardItem` or `navigator.clipboard.write`.
 */
export async function copyImageToClipboard(
	element: HTMLElement,
	metadata: ExportMetadata,
	options: PngOptions = {}
): Promise<void> {
	if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
		throw new Error('Clipboard image copy is not supported in this browser');
	}

	try {
		const dataUrl = await renderPng(element, metadata, options);
		const blob = await (await fetch(dataUrl)).blob();
		await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
	} catch (error) {
		console.error('Error copying image to clipboard:', error);
		throw error instanceof Error ? error : new Error('Failed to copy image to clipboard');
	}
}

/**
 * Export data to CSV format
 */
export async function exportToCSV(
	data: any[],
	filename: string,
	metadata: ExportMetadata
): Promise<void> {
	try {
		if (!data || data.length === 0) {
			throw new Error('No data to export');
		}

		// Extract headers from first object
		const headers = Object.keys(data[0]);

		// Create CSV rows
		const rows = [
			// Metadata header
			`# Chart: ${metadata.chartType}`,
			`# Geography: ${metadata.geography || 'N/A'}`,
			`# Year: ${metadata.year || 'N/A'}`,
			`# Scenario: ${metadata.scenario || metadata.scenarios?.join(', ') || 'N/A'}`,
			`# Generated: ${new Date(metadata.timestamp).toISOString()}`,
			`# Source: ${metadata.source}`,
			'',
			// Data headers
			headers.join(','),
			// Data rows
			...data.map((row) =>
				headers
					.map((header) => {
						const value = row[header];
						// Handle dates, numbers, and strings
						if (value instanceof Date) {
							return value.toISOString();
						}
						if (typeof value === 'string' && value.includes(',')) {
							return `"${value}"`;
						}
						return value ?? '';
					})
					.join(',')
			)
		];

		// Create blob and download
		const csv = rows.join('\n');
		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.download = filename;
		link.href = url;
		link.click();
		URL.revokeObjectURL(url);
	} catch (error) {
		console.error('Error exporting to CSV:', error);
		throw new Error('Failed to export data as CSV');
	}
}

/**
 * Export data to JSON format with metadata
 */
export async function exportToJSON(
	data: any[],
	filename: string,
	metadata: ExportMetadata
): Promise<void> {
	try {
		// Create JSON structure with metadata
		const jsonData = {
			metadata: {
				...metadata,
				exportedAt: new Date().toISOString()
			},
			data
		};

		// Create blob and download
		const json = JSON.stringify(jsonData, null, 2);
		const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.download = filename;
		link.href = url;
		link.click();
		URL.revokeObjectURL(url);
	} catch (error) {
		console.error('Error exporting to JSON:', error);
		throw new Error('Failed to export data as JSON');
	}
}
