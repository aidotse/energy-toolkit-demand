/**
 * Content Loader Utility - Load and cache markdown content
 *
 * Provides functions to load markdown content files with caching support.
 * Content is organized by locale (sv, en) and content type.
 * Supports frontmatter metadata extraction from markdown files.
 *
 * @example
 * ```markdown
 * ---
 * title: "Energy Demand Forecast"
 * section: "time-evolution"
 * order: 1
 * ---
 * Your markdown content here...
 * ```
 *
 * @module contentLoader
 */

export type Locale = 'sv' | 'en';

export interface ContentMetadata {
	// Standard fields
	title?: string;
	description?: string;
	section?: string;
	order?: number;
	lastUpdated?: string;
	author?: string;
	tags?: string[];
	// Any additional custom fields
	[key: string]: any;
}

export interface ContentFile {
	default: any; // The Svelte component (compiled markdown)
	metadata: ContentMetadata; // Frontmatter from markdown file
}

// Use Vite's glob import to statically import all markdown files
// This is evaluated at build time, not runtime
const contentModules = import.meta.glob('../content/**/*.md', { eager: false });

// In-memory cache for loaded content
const contentCache = new Map<string, ContentFile>();

/**
 * Extract metadata from MDsveX module exports
 * MDsveX exports frontmatter fields directly on the module
 */
function extractMetadata(module: any): ContentMetadata {
	const metadata: ContentMetadata = {};
	const knownFields = [
		'title',
		'description',
		'section',
		'order',
		'lastUpdated',
		'author',
		'tags'
	];

	// Extract known frontmatter fields
	for (const field of knownFields) {
		if (module[field] !== undefined) {
			metadata[field] = module[field];
		}
	}

	// If there's already a metadata object, merge it
	if (module.metadata) {
		Object.assign(metadata, module.metadata);
	}

	return metadata;
}

/**
 * Load a markdown content file by locale and slug
 *
 * @param locale - Language locale (sv or en)
 * @param slug - Content file slug (without extension)
 * @returns Promise resolving to the content component and metadata
 */
export async function loadContent(locale: Locale, slug: string): Promise<ContentFile | null> {
	const cacheKey = `${locale}/${slug}`;

	// Return cached content if available
	if (contentCache.has(cacheKey)) {
		return contentCache.get(cacheKey)!;
	}

	try {
		// Build the path that matches the glob pattern
		const path = `../content/${locale}/${slug}.md`;

		// Get the import function from the glob modules
		const importFn = contentModules[path];

		if (!importFn) {
			console.error(`Content file not found: ${path}`);
			console.error('Available paths:', Object.keys(contentModules));
			return null;
		}

		// Load the module
		const module = (await importFn()) as any;

		// Extract metadata from module exports
		const metadata = extractMetadata(module);

		// Create normalized content object
		const content: ContentFile = {
			default: module.default,
			metadata
		};

		// Cache the content
		contentCache.set(cacheKey, content);

		return content;
	} catch (error) {
		console.error(`Failed to load content: ${locale}/${slug}`, error);
		return null;
	}
}

/**
 * Load all content files for a given locale
 *
 * @param locale - Language locale (sv or en)
 * @returns Promise resolving to array of content files with their slugs
 */
export async function loadAllContent(
	locale: Locale
): Promise<Array<{ slug: string; content: ContentFile }>> {
	// This would require a build-time manifest or glob import
	// For now, return empty array - to be implemented with Vite glob import
	console.warn('loadAllContent not yet implemented - requires Vite glob import');
	return [];
}

/**
 * Preload content files for faster access
 *
 * @param locale - Language locale
 * @param slugs - Array of content slugs to preload
 */
export async function preloadContent(locale: Locale, slugs: string[]): Promise<void> {
	await Promise.all(slugs.map((slug) => loadContent(locale, slug)));
}

/**
 * Clear the content cache
 */
export function clearContentCache(): void {
	contentCache.clear();
}

/**
 * Get cached content without loading
 *
 * @param locale - Language locale
 * @param slug - Content file slug
 * @returns Cached content or null if not cached
 */
export function getCachedContent(locale: Locale, slug: string): ContentFile | null {
	const cacheKey = `${locale}/${slug}`;
	return contentCache.get(cacheKey) || null;
}
