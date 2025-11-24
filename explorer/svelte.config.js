import { mdsvex } from "mdsvex";
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
    // Consult https://svelte.dev/docs/kit/integrations
    // for more information about preprocessors
    extensions: [".svelte", ".svx", ".md"],
    preprocess: [
        vitePreprocess(),
        mdsvex({
            extensions: [".svx", ".md"],
            // Extract frontmatter as metadata export
            layout: {
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
        }
	},

};

export default config;
