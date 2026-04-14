import { defineConfig } from 'vite';
import { paraglide } from '@inlang/paraglide-sveltekit/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import path from 'path';

export default defineConfig({
	plugins: [
		sveltekit(),
		paraglide({
			project: './project.inlang',
			outdir: './src/lib/paraglide'
		})
	],

	optimizeDeps: {
		// Pre-bundle these on vite startup. `@inlang/paraglide-sveltekit/internal`
		// is otherwise discovered on the first request, which invalidates already-
		// loaded chunks mid-hydration and crashes the page with a svelte internal
		// "undefined.call()" error. Including it here makes the cold start
		// deterministic.
		include: ['mapbox-gl', '@inlang/paraglide-sveltekit/internal']
	}
});
