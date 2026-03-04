/**
 * View store for the home page
 *
 * Bridges page-loader data to inline chart components rendered from markdown
 * content. The home page loader fetches config, parameters, geojson, etc. and
 * passes them as `data` to the page. Charts embedded via ::ChartEmbed{} need
 * access to year, geography, and the full loader payload — this store provides
 * that reactive bridge so components don't need prop-drilling.
 */

import type { Parameters } from '../../types/api';

interface PageData {
	parameters?: Parameters;
	[key: string]: unknown;
}

function createViewStore() {
	let year = $state(2050);
	let geography = $state('total');
	let segment = $state<string[]>(['total']);
	let pageData = $state<PageData | null>(null);

	return {
		get year() { return year; },
		set year(v: number) { year = v; },
		get geography() { return geography; },
		set geography(v: string) { geography = v; },
		get segment() { return segment; },
		set segment(v: string[]) { segment = v; },
		get pageData() { return pageData; },
		set pageData(v: PageData | null) { pageData = v; },

		/** Look up geography display name from pageData */
		get geographyName(): string {
			if (geography === 'total' || geography === '00') return 'Sverige';
			const geos = (pageData as any)?.geographies || [];
			const geo = geos.find((g: any) => g.geo_id === geography || g.id === geography);
			return geo?.geo_name || geo?.name || geography;
		},

		/** Single segment ID if exactly one non-total selected, else 'total' */
		get activeSegment(): string {
			return segment.length === 1 && segment[0] !== 'total' ? segment[0] : 'total';
		}
	};
}

export const viewStore = createViewStore();
