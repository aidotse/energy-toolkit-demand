/**
 * Tests for contentLoader.ts
 *
 * Tests the markdown content loading system with frontmatter support.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { loadContent, clearContentCache, getCachedContent, type Locale } from './contentLoader';

describe('contentLoader', () => {
	beforeEach(() => {
		// Clear cache before each test for isolation
		clearContentCache();
	});

	describe('loadContent', () => {
		it('should load Swedish content file with frontmatter', async () => {
			const content = await loadContent('sv', 'introduction');

			expect(content).not.toBeNull();
			expect(content?.default).toBeDefined();
			expect(content?.metadata).toBeDefined();
		});

		it('should load English content file with frontmatter', async () => {
			const content = await loadContent('en', 'introduction');

			expect(content).not.toBeNull();
			expect(content?.default).toBeDefined();
			expect(content?.metadata).toBeDefined();
		});

		it('should extract frontmatter metadata correctly', async () => {
			const content = await loadContent('sv', 'executive-summary');

			expect(content?.metadata.title).toBeDefined();
			expect(content?.metadata.description).toBeDefined();
			expect(content?.metadata.section).toBe('executive-summary');
			expect(content?.metadata.order).toBeDefined();
			expect(content?.metadata.tags).toBeDefined();
			expect(Array.isArray(content?.metadata.tags)).toBe(true);
		});

		it('should return null for non-existent content', async () => {
			const content = await loadContent('sv', 'non-existent-file');

			expect(content).toBeNull();
		});

		it('should cache loaded content', async () => {
			// Load content first time
			const content1 = await loadContent('sv', 'introduction');

			// Check it's cached
			const cached = getCachedContent('sv', 'introduction');
			expect(cached).not.toBeNull();
			expect(cached).toBe(content1);

			// Load again - should return cached version
			const content2 = await loadContent('sv', 'introduction');
			expect(content2).toBe(content1);
		});
	});

	describe('getCachedContent', () => {
		it('should return null for uncached content', () => {
			const cached = getCachedContent('sv', 'introduction');
			expect(cached).toBeNull();
		});

		it('should return cached content after loading', async () => {
			await loadContent('sv', 'introduction');

			const cached = getCachedContent('sv', 'introduction');
			expect(cached).not.toBeNull();
		});
	});

	describe('clearContentCache', () => {
		it('should clear all cached content', async () => {
			// Load some content
			await loadContent('sv', 'introduction');
			await loadContent('en', 'introduction');

			// Verify it's cached
			expect(getCachedContent('sv', 'introduction')).not.toBeNull();
			expect(getCachedContent('en', 'introduction')).not.toBeNull();

			// Clear cache
			clearContentCache();

			// Verify it's gone
			expect(getCachedContent('sv', 'introduction')).toBeNull();
			expect(getCachedContent('en', 'introduction')).toBeNull();
		});
	});

	describe('content files', () => {
		const testCases: Array<{ locale: Locale; slug: string }> = [
			{ locale: 'sv', slug: 'introduction' },
			{ locale: 'sv', slug: 'executive-summary' },
			{ locale: 'sv', slug: 'current-state' },
			{ locale: 'sv', slug: 'future-scenarios' },
			{ locale: 'sv', slug: 'key-insights' },
			{ locale: 'en', slug: 'introduction' },
			{ locale: 'en', slug: 'executive-summary' },
			{ locale: 'en', slug: 'current-state' },
			{ locale: 'en', slug: 'future-scenarios' },
			{ locale: 'en', slug: 'key-insights' }
		];

		testCases.forEach(({ locale, slug }) => {
			it(`should load ${locale}/${slug}.md`, async () => {
				const content = await loadContent(locale, slug);

				expect(content).not.toBeNull();
				expect(content?.default).toBeDefined();
				expect(content?.metadata).toBeDefined();
				expect(content?.metadata.title).toBeDefined();
				expect(content?.metadata.section).toBeDefined();
			});
		});
	});

	describe('metadata structure', () => {
		it('should have consistent metadata across all content files', async () => {
			const slugs = ['introduction', 'executive-summary', 'current-state', 'future-scenarios', 'key-insights'];

			for (const slug of slugs) {
				const content = await loadContent('sv', slug);

				// Required fields
				expect(content?.metadata.title).toBeDefined();
				expect(content?.metadata.section).toBeDefined();
				expect(content?.metadata.order).toBeDefined();

				// Optional but expected fields
				expect(content?.metadata.description).toBeDefined();
				expect(content?.metadata.lastUpdated).toBeDefined();
				expect(content?.metadata.tags).toBeDefined();
			}
		});
	});
});
