/**
 * Default map bounds for the choropleth view: [[sw_lng, sw_lat], [ne_lng, ne_lat]].
 * Replace these with the extent of your own geojson. The example ships with four
 * toy regions centred on the (0–5, 0–5) lat/lng box.
 */
export const DEFAULT_MAP_BOUNDS: [[number, number], [number, number]] = [
	[-1, -1],
	[5, 5]
];

export const FIT_BOUNDS_OPTIONS = {
	padding: { top: 20, bottom: 20, left: 20, right: 20 },
	maxZoom: 7
};
