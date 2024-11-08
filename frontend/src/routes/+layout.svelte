<script lang="ts">
	import "../app.css";
	import { i18n } from '$lib/i18n';
	import { ParaglideJS } from '@inlang/paraglide-sveltekit';
	import { Map } from 'mapbox-gl';
	import '@site/src/node_modules/mapbox-gl/dist/mapbox-gl.css';
	let { children } = $props();
</script>

<ParaglideJS {i18n}>
	{@render children()}
</ParaglideJS>
