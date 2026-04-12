/**
 * Tests for contentLoader.ts
 *
 * Tests the markdown content loading system with frontmatter support.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { loadContent, clearContentCache, getCachedContent, type Locale } from './contentLoader';

describe('contentLoader', () => {
	// Content loading through Vite's glob pulls in all .md / .svx files lazily.
	// The first cold load in a fresh chromium browser can take > 10s because it
	// warms up MDsveX + the directive preprocessor + every referenced component.
	// 20s gives enough headroom on slower CI workers.
	const LOAD_TIMEOUT = 20_000;

	beforeEach(() => {
		// Clear cache before each test for isolation
		clearContentCache();
	});

	describe('loadContent', () => {
		it(
			'should load Swedish page content file with frontmatter',
			async () => {
				const content = await loadContent('sv', 'pages/about');

				expect(content).not.toBeNull();
				expect(content?.default).toBeDefined();
				expect(content?.metadata).toBeDefined();
			},
			LOAD_TIMEOUT
		);

		it(
			'should load Swedish report content file with frontmatter',
			async () => {
				const content = await loadContent('sv', 'reports/methodology');

				expect(content).not.toBeNull();
				expect(content?.default).toBeDefined();
				expect(content?.metadata).toBeDefined();
			},
			LOAD_TIMEOUT
		);

		it(
			'should extract frontmatter metadata correctly',
			async () => {
				const content = await loadContent('sv', 'pages/about');

				expect(content?.metadata.title).toBeDefined();
				expect(content?.metadata.description).toBeDefined();
			},
			LOAD_TIMEOUT
		);

		it('should return null for non-existent content', async () => {
			const content = await loadContent('sv', 'non-existent-file');

			expect(content).toBeNull();
		});

		it(
			'should cache loaded content',
			async () => {
				// Load content first time
				const content1 = await loadContent('sv', 'pages/about');

				// Check it's cached
				const cached = getCachedContent('sv', 'pages/about');
				expect(cached).not.toBeNull();
				expect(cached).toBe(content1);

				// Load again - should return cached version
				const content2 = await loadContent('sv', 'pages/about');
				expect(content2).toBe(content1);
			},
			LOAD_TIMEOUT
		);
	});

	describe('getCachedContent', () => {
		it('should return null for uncached content', () => {
			const cached = getCachedContent('sv', 'pages/about');
			expect(cached).toBeNull();
		});

		it('should return cached content after loading', async () => {
			await loadContent('sv', 'pages/about');

			const cached = getCachedContent('sv', 'pages/about');
			expect(cached).not.toBeNull();
		});
	});

	describe('clearContentCache', () => {
		it('should clear all cached content', async () => {
			// Load some content
			await loadContent('sv', 'pages/about');
			await loadContent('sv', 'reports/methodology');

			// Verify it's cached
			expect(getCachedContent('sv', 'pages/about')).not.toBeNull();
			expect(getCachedContent('sv', 'reports/methodology')).not.toBeNull();

			// Clear cache
			clearContentCache();

			// Verify it's gone
			expect(getCachedContent('sv', 'pages/about')).toBeNull();
			expect(getCachedContent('sv', 'reports/methodology')).toBeNull();
		});
	});

	describe('content files', () => {
		// Only include files without directive components — files that reference
		// Svelte components via `::Component{}` syntax fail to load in the test
		// browser because the preprocessor-resolved components are not wired up.
		const testCases: Array<{ locale: Locale; slug: string }> = [
			{ locale: 'sv', slug: 'pages/about' },
			{ locale: 'sv', slug: 'pages/data' }
		];

		testCases.forEach(({ locale, slug }) => {
			it(`should load ${locale}/${slug}`, async () => {
				const content = await loadContent(locale, slug);

				expect(content).not.toBeNull();
				expect(content?.default).toBeDefined();
				expect(content?.metadata).toBeDefined();
				expect(content?.metadata.title).toBeDefined();
			});
		});
	});

	describe('metadata structure', () => {
		it('should have title and description across content files', async () => {
			// Only files without directive-embedded components (see note above).
			const slugs = ['pages/about', 'pages/data'];

			for (const slug of slugs) {
				const content = await loadContent('sv', slug);

				// Required fields present across all content
				expect(content?.metadata.title).toBeDefined();
				expect(content?.metadata.description).toBeDefined();
			}
		});
	});
});
