/**
 * View store for the home page
 *
 * Holds year/geography selections (synced with Map) and loader-provided
 * page data needed by chart components rendered from markdown content.
 */

function createViewStore() {
	let year = $state(2050);
	let geography = $state('total');
	let pageData = $state<any>(null);

	return {
		get year() { return year; },
		set year(v: number) { year = v; },
		get geography() { return geography; },
		set geography(v: string) { geography = v; },
		get pageData() { return pageData; },
		set pageData(v: any) { pageData = v; }
	};
}

export const viewStore = createViewStore();
