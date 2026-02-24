<script lang="ts">
	/**
	 * HighlightCard Component - Visually distinct highlighted content card
	 *
	 * General-purpose card for highlighting important information, project context,
	 * announcements, or any content that needs visual emphasis. More prominent
	 * than InsightBox, with gradient background and optional link.
	 *
	 * @component
	 */
	import { ArrowRight, Info } from 'lucide-svelte';
	import type { ComponentType } from 'svelte';
	import type { Snippet } from 'svelte';
	import { resolveIcon } from '$lib/utils/iconResolver';

	let {
		title,
		icon: iconProp = Info,
		variant = 'default',
		linkHref,
		linkText = 'Läs mer',
		children,
		class: className = ''
	}: {
		title: string;
		icon?: ComponentType | string;
		variant?: 'default' | 'primary' | 'success' | 'warning';
		linkHref?: string;
		linkText?: string;
		children: Snippet;
		class?: string;
	} = $props();

	const Icon = $derived(
		typeof iconProp === 'string' ? (resolveIcon(iconProp) ?? Info) : iconProp
	);

	// Variant configurations
	const variantConfig = {
		default: {
			bgGradient: 'from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900',
			border: 'border-gray-300 dark:border-gray-600',
			iconBg: 'bg-gray-200 dark:bg-gray-700',
			iconColor: 'text-gray-700 dark:text-gray-300',
			titleColor: 'text-gray-900 dark:text-gray-50',
			linkColor: 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
		},
		primary: {
			bgGradient: 'from-primary-50/30 to-primary-100/40 dark:from-primary-900/10 dark:to-primary-900/20',
			border: 'border-primary-200 dark:border-primary-800',
			iconBg: 'bg-primary-100/50 dark:bg-primary-900/20',
			iconColor: 'text-primary-600 dark:text-primary-400',
			titleColor: 'text-primary-700 dark:text-primary-400',
			linkColor: 'text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300'
		},
		success: {
			bgGradient: 'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/30',
			border: 'border-green-300 dark:border-green-700',
			iconBg: 'bg-green-100 dark:bg-green-900/30',
			iconColor: 'text-green-600 dark:text-green-400',
			titleColor: 'text-gray-900 dark:text-gray-50',
			linkColor: 'text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300'
		},
		warning: {
			bgGradient: 'from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-900/30',
			border: 'border-amber-300 dark:border-amber-700',
			iconBg: 'bg-amber-100 dark:bg-amber-900/30',
			iconColor: 'text-amber-600 dark:text-amber-400',
			titleColor: 'text-gray-900 dark:text-gray-50',
			linkColor: 'text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300'
		}
	};

	const config = $derived(variantConfig[variant]);
</script>

<div
	class="highlight-card bg-gradient-to-br {config.bgGradient} border-2 {config.border} rounded p-6 shadow-sm {className}"
>
	<!-- Icon header -->
	<div class="flex items-center gap-3 mb-4">
		<div
			class="flex-shrink-0 w-10 h-10 rounded-full {config.iconBg} flex items-center justify-center"
		>
			<Icon size={20} class={config.iconColor} />
		</div>
		<h3 class="text-lg font-semibold {config.titleColor}">
			{title}
		</h3>
	</div>

	<!-- Content -->
	<div class="content text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
		{@render children()}
	</div>

	<!-- Optional link -->
	{#if linkHref}
		<a
			href={linkHref}
			class="inline-flex items-center gap-2 text-sm font-medium {config.linkColor} transition-colors duration-200 group"
		>
			<span>{linkText}</span>
			<ArrowRight
				size={16}
				class="transition-transform duration-200 group-hover:translate-x-1"
			/>
		</a>
	{/if}
</div>

<style>
	.content :global(p) {
		@apply mb-3 last:mb-0;
	}

	.content :global(ul),
	.content :global(ol) {
		@apply mb-3 pl-5;
	}

	.content :global(ul li),
	.content :global(ol li) {
		@apply mt-1;
	}

	.content :global(strong) {
		@apply font-semibold text-gray-900 dark:text-gray-100;
	}
</style>
