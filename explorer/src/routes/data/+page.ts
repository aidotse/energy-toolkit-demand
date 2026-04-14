import spec from '../../../static/openapi.json';
import type { PageLoad } from './$types';

export const prerender = true;

export const load: PageLoad = () => ({ spec });
