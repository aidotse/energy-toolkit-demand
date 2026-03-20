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
			bgGradient: 'from-gray-50 to-gray-100',
			border: 'border-gray-300',
			iconBg: 'bg-gray-200',
			iconColor: 'text-gray-700',
			titleColor: 'text-gray-900',
			linkColor: 'text-gray-700 hover:text-gray-900'
		},
		primary: {
			bgGradient: 'from-primary-50/30 to-primary-100/40',
			border: 'border-primary-200',
			iconBg: 'bg-primary-100/50',
			iconColor: 'text-primary-600',
			titleColor: 'text-primary-700',
			linkColor: 'text-primary-600 hover:text-primary-700'
		},
		success: {
			bgGradient: 'from-green-50 to-green-100',
			border: 'border-green-300',
			iconBg: 'bg-green-100',
			iconColor: 'text-green-600',
			titleColor: 'text-gray-900',
			linkColor: 'text-green-600 hover:text-green-700'
		},
		warning: {
			bgGradient: 'from-amber-50 to-amber-100',
			border: 'border-amber-300',
			iconBg: 'bg-amber-100',
			iconColor: 'text-amber-600',
			titleColor: 'text-gray-900',
			linkColor: 'text-amber-600 hover:text-amber-700'
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
	<div class="content text-sm text-gray-700 leading-relaxed mb-4">
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
		@apply font-semibold text-gray-900;
	}
</style>
