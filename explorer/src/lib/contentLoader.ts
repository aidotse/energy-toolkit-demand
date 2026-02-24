/**
 * Content Loader Utility - Load and cache markdown/svx content
 *
 * Provides functions to load content files with caching support.
 * Content is organized by locale (sv, en) and content type.
 * Supports frontmatter metadata extraction.
 *
 * - `.svx` files: Svelte + markdown (can import components, use $state, etc.)
 * - `.md` files: Pure markdown prose
 *
 * @module contentLoader
 */

import { languageTag } from '$paraglide/runtime';

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
	layout?: string;
	// Any additional custom fields
	[key: string]: any;
}

export interface ContentFile {
	default: any; // The Svelte component (compiled markdown/svx)
	metadata: ContentMetadata; // Frontmatter from file
}

// Use Vite's glob import to statically import all content files
// Eager: false means they're lazy-loaded on demand
const contentModules = import.meta.glob('../content/**/*.{md,svx}', { eager: false });

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
		'tags',
		'layout'
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
 * Load a content file by locale and slug.
 * Tries .svx first, then .md.
 *
 * @param locale - Language locale (sv or en)
 * @param slug - Content file slug (without extension), e.g. "reports/methodology"
 * @returns Promise resolving to the content component and metadata
 */
export async function loadContent(locale: Locale, slug: string): Promise<ContentFile | null> {
	const cacheKey = `${locale}/${slug}`;

	// Return cached content if available
	if (contentCache.has(cacheKey)) {
		return contentCache.get(cacheKey)!;
	}

	// Try .svx first, then .md
	const extensions = ['.svx', '.md'];

	for (const ext of extensions) {
		try {
			const path = `../content/${locale}/${slug}${ext}`;
			const importFn = contentModules[path];

			if (!importFn) continue;

			const module = (await importFn()) as any;
			const metadata = extractMetadata(module);

			const content: ContentFile = {
				default: module.default,
				metadata
			};

			contentCache.set(cacheKey, content);
			return content;
		} catch (error) {
			console.error(`Failed to load content: ${locale}/${slug}${ext}`, error);
		}
	}

	console.error(`Content file not found: ${locale}/${slug}`);
	console.error('Available paths:', Object.keys(contentModules));
	return null;
}

/**
 * Load content using the current Paraglide locale.
 * Falls back to Swedish if the requested locale has no content.
 *
 * @param slug - Content file slug (without extension)
 * @returns Promise resolving to the content component and metadata
 */
export async function loadLocalizedContent(slug: string): Promise<ContentFile | null> {
	const locale = languageTag() as Locale;

	// Try current locale first
	const content = await loadContent(locale, slug);
	if (content) return content;

	// Fall back to Swedish
	if (locale !== 'sv') {
		return loadContent('sv', slug);
	}

	return null;
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
	const prefix = `../content/${locale}/`;
	const results: Array<{ slug: string; content: ContentFile }> = [];

	for (const [path, importFn] of Object.entries(contentModules)) {
		if (!path.startsWith(prefix)) continue;

		// Extract slug: remove prefix and extension
		const slug = path.slice(prefix.length).replace(/\.(svx|md)$/, '');

		try {
			const module = (await importFn()) as any;
			const metadata = extractMetadata(module);
			results.push({
				slug,
				content: { default: module.default, metadata }
			});
		} catch (error) {
			console.error(`Failed to load content: ${path}`, error);
		}
	}

	return results;
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
