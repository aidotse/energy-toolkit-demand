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
	let pageData = $state<PageData | null>(null);

	return {
		get year() { return year; },
		set year(v: number) { year = v; },
		get geography() { return geography; },
		set geography(v: string) { geography = v; },
		get pageData() { return pageData; },
		set pageData(v: PageData | null) { pageData = v; }
	};
}

export const viewStore = createViewStore();
