import * as universal_hooks from '../../../src/hooks.ts';

export { matchers } from './matchers.js';

export const nodes = [
	() => import('./nodes/0'),
	() => import('./nodes/1'),
	() => import('./nodes/2')
];

export const server_loads = [];

export const dictionary = {
		"/": [2]
	};

export const hooks = {
	handleError: (({ error }) => { console.error(error) }),

	reroute: universal_hooks.reroute || (() => {})
};

export { default as root } from '../root.js';