import aspectRatio from '@tailwindcss/aspect-ratio';
import containerQueries from '@tailwindcss/container-queries';
import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';
import type { Config } from 'tailwindcss';
import layerstack from '@layerstack/tailwind/plugin';
import { tailwindColors } from './src/lib/colors';

export default {
	content: [
		'./src/**/*.{html,js,svelte,ts}',
		'./node_modules/svelte-ux/**/*.{svelte,js}',
		'./node_modules/layerchart/**/*.{svelte,js}'
	],

	safelist: ['fill-transparent', 'contents', 'grid-cols-[1fr_auto]', 'tabular-nums'],

	theme: {
		extend: {
			fontFamily: {
				sans: [
					'-apple-system',
					'BlinkMacSystemFont',
					'"Segoe UI"',
					'Roboto',
					'"Helvetica Neue"',
					'Arial',
					'sans-serif'
				], // System fonts stack
				serif: ['Georgia', 'Cambria', '"Times New Roman"', 'Times', 'serif'], // Serif fonts
				mono: ['Menlo', 'Monaco', 'Consolas', '"Courier New"', 'monospace'] // Monospace fonts
			},
			spacing: {
				'14': '3.5rem', // 56px - nav height
				'22': '5.5rem', // 88px - nav + collapsed panel
				'46': '11.5rem' // 184px - nav + expanded panel
			},
			scale: {
				'98': '0.98' // For active button states
			},
			colors: tailwindColors
		}
	},

	ux: {
		themes: {
			light: {
				'color-scheme': 'light',
				primary: 'hsl(228.8755 100% 65.0987%)',
				secondary: 'hsl(214.9091 26.3158% 59.0196%)',
				accent: 'hsl(154.2 49.0196% 60%)',
				neutral: 'hsl(233.3333 27.2727% 12.9412%)',
				'surface-100': 'hsl(180 100% 100%)'
			}
		}
	},

	plugins: [typography, forms, containerQueries, aspectRatio, layerstack({ colorSpace: 'hsl' })]
} satisfies Config;
