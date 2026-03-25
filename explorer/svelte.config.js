import { mdsvex } from "mdsvex";
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import adapter from '@sveltejs/adapter-static';
import { directivePreprocess } from './src/lib/remark/directivePreprocess.js';

/** @type {import('@sveltejs/kit').Config} */
const config = {
    // Consult https://svelte.dev/docs/kit/integrations
    // for more information about preprocessors
    extensions: [".svelte", ".svx", ".md"],
    preprocess: [
        directivePreprocess(),    // Transform :::directive{props} → <Component> tags
        vitePreprocess(),
        mdsvex({
            extensions: [".svx", ".md"],
            layout: {
                reports: './src/lib/components/content/ReportLayout.svelte',
                _: './src/lib/components/content/MarkdownLayout.svelte'
            }
        })
    ],

    kit: {
		// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
		// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
		// See https://svelte.dev/docs/kit/adapters for more information about adapters.
		adapter: adapter(),
        alias: {
            $paraglide: './src/lib/paraglide'
        },
        prerender: {
            handleHttpError: ({ path, message }) => {
                // Static assets like openapi.json get prefixed with locale during prerender
                if (path.endsWith('/openapi.json')) return;
                // /data page requires live API for OpenAPI spec — skip during build
                if (path === '/data' || path.endsWith('/data')) return;
                throw new Error(message);
            }
        }
	},

};

export default config;
