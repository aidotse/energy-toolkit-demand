import type { ComponentType } from 'svelte';
import { Target, Database, Code, Users, FileJson, Globe } from 'lucide-svelte';

const ICON_MAP: Record<string, ComponentType> = {
	target: Target,
	database: Database,
	code: Code,
	users: Users,
	filejson: FileJson,
	globe: Globe
};

export function resolveIcon(name: string): ComponentType | undefined {
	return ICON_MAP[name.toLowerCase()];
}
