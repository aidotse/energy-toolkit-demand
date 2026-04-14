#!/usr/bin/env node
/**
 * Fetch a static PNG snapshot of the mapbox style at the default Sweden view
 * and save it to explorer/static/data/map-snapshot.png. The snapshot is used
 * as the placeholder background in MapBox.svelte while the interactive map
 * loads, so users see a styled map from the first frame.
 *
 * Run manually when the mapbox style URL changes (it's rare):
 *     cd explorer && npm run fetch-map-snapshot
 *
 * Requires VITE_MAPBOX_TOKEN and VITE_MAPBOX_STYLE_LIGHT in explorer/.env.
 *
 * Calibration notes — read this if you touch the constants below:
 *
 * The desktop home layout mounts the map inside a container that is overlayed
 * by a content card on the left. MapBox.svelte applies `fadeLeftPad = 0.45 *
 * containerWidth` of extra left padding inside fitBounds so that Sweden
 * renders in the *right* portion of the canvas, clear of the card.
 *
 * Because of that asymmetric padding, `map.getCenter()` does NOT return the
 * raw canvas-centre longitude — it returns the centre of the padded viewport.
 * The Static Images API, however, treats its center parameter as the raw
 * image centre (no padding awareness). So we can't just feed
 * `map.getCenter()` into the URL — we need the geographic point that the
 * mapbox-gl canvas actually shows at pixel (canvasW/2, canvasH/2), which is
 * `map.unproject([canvasW/2, canvasH/2])`.
 *
 * Concrete numbers on a 1920×1080 viewport with the current layout:
 *   canvas size    : 1270 × 1024
 *   map.getCenter(): (15.0000, 63.2712)   ← centre of padded viewport
 *   canvas centre  : (5.0874, 63.2712)    ← what Static API needs
 *   map.getZoom()  : 4.3399               ← Static API matches at the same z
 *
 * (Earlier attempts using `getCenter()` produced a snapshot where Sweden was
 * centred horizontally in the image instead of pushed right. Earlier attempts
 * using zoom + 1 were compensating for that wrong centre, not a real tile-
 * size difference. Keep zoom aligned with map.getZoom().)
 *
 * If the style, page layout, or viewport changes in a way that alters the
 * canvas width or fitBounds padding:
 *   1. Start the dev server, load http://localhost:5173/ on a 1920×1080
 *      viewport and let the map settle.
 *   2. In DevTools console:
 *        const m = document.querySelectorAll('.mapboxgl-map')[1];  // desktop
 *        // or expose map via MapBox.svelte and read globalThis.__mapboxMapDesktop
 *        const c = m.unproject([m.getCanvas().clientWidth/2,
 *                                m.getCanvas().clientHeight/2]);
 *        ({ lng: c.lng, lat: c.lat, zoom: m.getZoom(),
 *           w: m.getCanvas().clientWidth, h: m.getCanvas().clientHeight })
 *   3. Plug those into CENTER_LNG / CENTER_LAT / STATIC_ZOOM / SIZE below.
 *   4. Re-run this script.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const explorerRoot = path.resolve(__dirname, '..');
const envPath = path.join(explorerRoot, '.env');
const outPath = path.join(explorerRoot, 'static', 'data', 'map-snapshot.png');

// Calibrated against mapbox-gl.js on a 1920×1080 viewport. See header comment
// for the why behind unprojecting the raw canvas centre instead of using
// map.getCenter().
const CENTER_LNG = 5.0874;
const CENTER_LAT = 63.2712;
const STATIC_ZOOM = 4.34;
const SIZE = '1270x1024';

function parseEnv(filePath) {
	const out = {};
	for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
		const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
		if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
	}
	return out;
}

const env = parseEnv(envPath);
const token = env.VITE_MAPBOX_TOKEN;
const styleUrl = env.VITE_MAPBOX_STYLE_LIGHT;
if (!token || !styleUrl) {
	console.error('Missing VITE_MAPBOX_TOKEN or VITE_MAPBOX_STYLE_LIGHT in explorer/.env');
	process.exit(1);
}

const styleId = styleUrl.replace(/^mapbox:\/\/styles\//, '');
const url = `https://api.mapbox.com/styles/v1/${styleId}/static/${CENTER_LNG},${CENTER_LAT},${STATIC_ZOOM}/${SIZE}?access_token=${token}`;

console.log(`Fetching map snapshot for style ${styleId}`);
const res = await fetch(url);
if (!res.ok) {
	console.error(`Mapbox Static API returned ${res.status}: ${await res.text()}`);
	process.exit(1);
}

const buf = Buffer.from(await res.arrayBuffer());
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, buf);
console.log(`Wrote ${outPath} (${(buf.length / 1024).toFixed(1)} KB)`);
