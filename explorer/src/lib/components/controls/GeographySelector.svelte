<script lang="ts">
	/**
	 * GeographySelector Component
	 *
	 * Reusable geography selection control.
	 * Displays human-readable labels for geography codes.
	 *
	 * @component
	 */
	import { MapPin } from 'lucide-svelte';

	let {
		value,
		geographies = ['total', 'SE01', 'SE02', 'SE03', 'SE04'],
		geographiesMetadata = [],
		onChange,
		variant = 'dropdown',
		size = 'md',
		class: className = ''
	}: {
		value: string;
		geographies?: string[];
		geographiesMetadata?: Array<{ id: string; name: string; type?: string }>;
		onChange: (geography: string) => void;
		variant?: 'dropdown' | 'pills';
		size?: 'sm' | 'md' | 'lg';
		class?: string;
	} = $props();

	// Build label map from metadata or use fallback labels
	const geographyLabels = $derived.by(() => {
		const labels: Record<string, string> = { total: 'Sverige' };

		// Add labels from metadata if available
		if (geographiesMetadata && geographiesMetadata.length > 0) {
			geographiesMetadata.forEach((geo) => {
				if (geo.id && geo.name) {
					labels[geo.id] = geo.name;
				}
			});
		} else {
			// Fallback hardcoded labels
			labels['SE01'] = 'SE1 (Luleå)';
			labels['SE02'] = 'SE2 (Sundsvall)';
			labels['SE03'] = 'SE3 (Stockholm)';
			labels['SE04'] = 'SE4 (Malmö)';
		}

		return labels;
	});

	// Size classes for pills
	const pillSizeClasses = {
		sm: 'px-2 py-1 text-xs',
		md: 'px-3 py-1.5 text-sm',
		lg: 'px-4 py-2 text-base'
	};

	function handleChange(newValue: string) {
		onChange(newValue);
	}

	function handleSelectChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		onChange(target.value);
	}
</script>

{#if variant === 'dropdown'}
	<select
		value={value}
		onchange={handleSelectChange}
		class="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600
		       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
		       focus:ring-2 focus:ring-primary focus:border-transparent
		       {className}"
	>
		{#each geographies as geography}
			<option value={geography}>
				{geographyLabels[geography] || geography}
			</option>
		{/each}
	</select>
{:else if variant === 'pills'}
	<div class="flex flex-wrap gap-2 {className}" role="radiogroup">
		{#each geographies as geography}
			<button
				type="button"
				onclick={() => handleChange(geography)}
				class="inline-flex items-center gap-1.5 rounded-full border-2 transition-all
				       {value === geography
						? 'border-primary bg-primary text-white shadow-sm'
						: 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-primary hover:shadow-sm'}
				       {pillSizeClasses[size]}
				       focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
				role="radio"
				aria-checked={value === geography}
			>
				<MapPin class="w-3.5 h-3.5" />
				<span>{geographyLabels[geography] || geography}</span>
			</button>
		{/each}
	</div>
{/if}
