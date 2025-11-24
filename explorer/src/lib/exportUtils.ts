/**
 * Export Utilities
 *
 * Functions for exporting charts to various formats (PNG, SVG, CSV, JSON).
 * All exports include metadata and follow consistent filename conventions.
 *
 * PNG exports always render at 1920x1080 resolution for PowerPoint compatibility,
 * regardless of the display size of the chart.
 */

export interface ExportMetadata {
	chartType: string;
	geography?: string;
	year?: number;
	scenario?: string;
	scenarios?: string[];
	timestamp: string;
	source: string;
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

	const text = `${metadata.source} | ${new Date(metadata.timestamp).toLocaleDateString()}`;
	const textWidth = ctx.measureText(text).width;

	const padding = 10;
	const x = position === 'bottom-right' ? canvas.width - textWidth - padding : padding;
	const y = canvas.height - padding;

	ctx.fillText(text, x, y);
}

/**
 * Export chart element to PNG at fixed 1920x1080 resolution
 * Uses native Canvas API to convert SVG to PNG
 */
export async function exportToPNG(
	element: HTMLElement,
	filename: string,
	metadata: ExportMetadata,
	options: {
		width?: number;
		height?: number;
		quality?: number;
		watermark?: boolean;
	} = {}
): Promise<void> {
	const { width = 1920, height = 1080, quality = 1.0, watermark = true } = options;

	try {
		// Wait for animations to settle
		await new Promise((resolve) => setTimeout(resolve, 300));

		// Find all SVG elements in the container
		const svgElements = Array.from(element.querySelectorAll('svg'));

		if (svgElements.length === 0) {
			throw new Error('No SVG elements found in chart');
		}

		console.log(`Found ${svgElements.length} SVG elements to export`);

		// Get the first SVG's dimensions as the base (they're all stacked)
		const firstSvg = svgElements[0] as SVGSVGElement;
		const rect = firstSvg.getBoundingClientRect();

		// Add padding to ensure we capture overflow content (axis labels, etc.)
		const padding = 80;
		const contentWidth = rect.width + padding * 2;
		const contentHeight = rect.height + padding * 2;

		console.log('Export dimensions:', {
			svgWidth: rect.width,
			svgHeight: rect.height,
			contentWidth,
			contentHeight,
			svgCount: svgElements.length
		});

		// Create a wrapper SVG that will contain all the chart SVGs stacked
		const wrapperSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		wrapperSvg.setAttribute('width', contentWidth.toString());
		wrapperSvg.setAttribute('height', contentHeight.toString());
		wrapperSvg.setAttribute('viewBox', `0 0 ${contentWidth} ${contentHeight}`);
		wrapperSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

		// Helper to copy computed styles inline
		const copyStyles = (sourceElement: Element, targetElement: Element) => {
			if (sourceElement instanceof SVGElement && targetElement instanceof SVGElement) {
				const computedStyle = window.getComputedStyle(sourceElement);

				// Copy key SVG presentation attributes
				const importantProps = [
					'fill', 'stroke', 'stroke-width', 'opacity',
					'fill-opacity', 'stroke-opacity', 'font-family',
					'font-size', 'text-anchor', 'transform'
				];

				for (const prop of importantProps) {
					const value = computedStyle.getPropertyValue(prop);
					if (value && value !== 'none') {
						targetElement.setAttribute(prop, value);
					}
				}
			}

			// Recursively copy styles for children
			const sourceChildren = Array.from(sourceElement.children);
			const targetChildren = Array.from(targetElement.children);
			for (let i = 0; i < Math.min(sourceChildren.length, targetChildren.length); i++) {
				copyStyles(sourceChildren[i], targetChildren[i]);
			}
		};

		// All SVGs stack at the same position with padding offset
		const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
		g.setAttribute('transform', `translate(${padding}, ${padding})`);

		// Clone all SVG elements into the same group (they stack on top of each other)
		for (const svg of svgElements) {
			const clonedSvg = svg.cloneNode(true) as SVGSVGElement;

			// Copy computed styles to preserve appearance
			copyStyles(svg, clonedSvg);

			// Copy all child elements from cloned SVG to group
			while (clonedSvg.firstChild) {
				g.appendChild(clonedSvg.firstChild);
			}
		}

		wrapperSvg.appendChild(g);

		// Serialize the wrapper SVG
		const serializer = new XMLSerializer();
		const svgString = serializer.serializeToString(wrapperSvg);

		console.log('Wrapper SVG created');

		// Convert to blob and create object URL
		const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
		const svgUrl = URL.createObjectURL(svgBlob);

		// Create canvas for final export
		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext('2d');

		if (!ctx) {
			throw new Error('Could not get canvas context');
		}

		// Fill white background
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(0, 0, width, height);

		// Load and draw the combined SVG
		const img = new Image();

		const dataUrl = await new Promise<string>((resolve, reject) => {
			img.onload = () => {
				// Calculate scaling to fit within target dimensions while maintaining aspect ratio
				const scale = Math.min(width / contentWidth, height / contentHeight);
				const scaledWidth = contentWidth * scale;
				const scaledHeight = contentHeight * scale;
				const x = (width - scaledWidth) / 2;
				const y = (height - scaledHeight) / 2;

				console.log('Drawing to canvas:', {
					scale, scaledWidth, scaledHeight, x, y
				});

				// Draw the image centered
				ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

				// Clean up
				URL.revokeObjectURL(svgUrl);

				// Get data URL
				resolve(canvas.toDataURL('image/png', quality));
			};

			img.onerror = (error) => {
				URL.revokeObjectURL(svgUrl);
				reject(new Error('Failed to load SVG as image'));
			};

			img.src = svgUrl;
		});

		// Add watermark if requested
		if (watermark) {
			const img = new Image();
			img.src = dataUrl;
			await new Promise((resolve) => {
				img.onload = resolve;
			});

			const canvas = document.createElement('canvas');
			canvas.width = width;
			canvas.height = height;
			const ctx = canvas.getContext('2d');
			if (ctx) {
				ctx.drawImage(img, 0, 0);
				addWatermark(canvas, metadata);
			}

			// Download with watermark
			const link = document.createElement('a');
			link.download = filename;
			link.href = canvas.toDataURL('image/png', quality);
			link.click();
		} else {
			// Download without watermark
			const link = document.createElement('a');
			link.download = filename;
			link.href = dataUrl;
			link.click();
		}
	} catch (error) {
		console.error('Error exporting to PNG:', error);
		throw new Error('Failed to export chart as PNG');
	}
}

/**
 * Export SVG element to SVG file
 * Extracts SVG from LayerChart components
 */
export async function exportToSVG(
	element: HTMLElement,
	filename: string,
	metadata: ExportMetadata
): Promise<void> {
	try {
		// Find SVG element within the container
		const svgElement = element.querySelector('svg');
		if (!svgElement) {
			throw new Error('No SVG element found in chart');
		}

		// Clone SVG to avoid modifying original
		const clonedSvg = svgElement.cloneNode(true) as SVGElement;

		// Add metadata as SVG metadata element
		const metadataElement = document.createElementNS('http://www.w3.org/2000/svg', 'metadata');
		metadataElement.textContent = JSON.stringify(metadata, null, 2);
		clonedSvg.insertBefore(metadataElement, clonedSvg.firstChild);

		// Serialize SVG
		const serializer = new XMLSerializer();
		const svgString = serializer.serializeToString(clonedSvg);

		// Create blob and download
		const blob = new Blob([svgString], { type: 'image/svg+xml' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.download = filename;
		link.href = url;
		link.click();
		URL.revokeObjectURL(url);
	} catch (error) {
		console.error('Error exporting to SVG:', error);
		throw new Error('Failed to export chart as SVG');
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
				headers.map((header) => {
					const value = row[header];
					// Handle dates, numbers, and strings
					if (value instanceof Date) {
						return value.toISOString();
					}
					if (typeof value === 'string' && value.includes(',')) {
						return `"${value}"`;
					}
					return value ?? '';
				}).join(',')
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
