<script lang="ts">
	import { BarChart3, Zap, TrendingUp, ArrowRight } from 'lucide-svelte';

	const links = [
		{
			href: '/charts',
			icon: BarChart3,
			title: 'Interaktiva diagram',
			description: 'Utforska alla diagram med egna filter och scenarier.'
		},
		{
			href: '/reports/flex',
			icon: Zap,
			title: 'Flexibilitetsanalys',
			description: 'Fördjupa dig i hur flexibilitet kan minska effekttoppar.'
		},
		{
			href: '/reports/power',
			icon: TrendingUp,
			title: 'Effektanalys',
			description: 'Läs mer om effektbehov och dimensionerande timmar.'
		}
	];
</script>

<section class="mt-10 pt-8 border-t border-gray-200">
	<h2 class="text-lg font-semibold text-gray-900 mb-4">Utforska vidare</h2>
	<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
		{#each links as link}
			<a
				href={link.href}
				class="group flex flex-col gap-2 p-4 rounded-xl bg-gray-50 border border-gray-100
					hover:bg-teal-50 hover:border-teal-200 transition-all"
			>
				<div class="flex items-center gap-2 text-gray-700 group-hover:text-teal-700">
					<link.icon size={18} />
					<span class="font-medium text-sm">{link.title}</span>
					<ArrowRight size={14} class="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
				</div>
				<p class="text-xs text-gray-500 leading-relaxed">{link.description}</p>
			</a>
		{/each}
	</div>
</section>
