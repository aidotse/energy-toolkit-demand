<script lang="ts">
	/**
	 * SegmentSelector Component
	 *
	 * Reusable segment selection control with pill buttons.
	 * Supports housing, industry, transport, and total segments.
	 *
	 * @component
	 */
	import { Home, Factory, Car, Layers, Building2, Server } from 'lucide-svelte';

	let {
		value,
		segments = ['total', 'housing', 'transport', 'industry'],
		onChange,
		variant = 'pills',
		size = 'md',
		class: className = ''
	}: {
		value: string;
		segments?: string[];
		onChange: (segment: string) => void;
		variant?: 'dropdown' | 'pills' | 'radio';
		size?: 'sm' | 'md' | 'lg';
		class?: string;
	} = $props();

	// Size classes for pills
	const pillSizeClasses = {
		sm: 'px-2 py-1 text-xs',
		md: 'px-3 py-1.5 text-sm',
		lg: 'px-4 py-2 text-base'
	};

	// Segment labels and icons
	const segmentConfig: Record<string, { label: string; icon: any }> = {
		total: { label: 'Alla', icon: Layers },
		housing: { label: 'Bostad', icon: Home },
		transport: { label: 'Transport', icon: Car },
		industry: { label: 'Industri', icon: Factory },
		services: { label: 'Service', icon: Building2 },
		datacenters: { label: 'Datacenter', icon: Server }
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
		{#each segments as segment}
			<option value={segment}>
				{segmentConfig[segment]?.label || segment}
			</option>
		{/each}
	</select>
{:else if variant === 'pills'}
	<div class="flex flex-wrap gap-2 {className}" role="radiogroup">
		{#each segments as segment}
			{@const config = segmentConfig[segment]}
			{@const Icon = config?.icon}
			<button
				type="button"
				onclick={() => handleChange(segment)}
				class="inline-flex items-center gap-1.5 rounded-full border-2 transition-all
				       {value === segment
						? 'border-primary bg-primary text-white shadow-sm'
						: 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-primary hover:shadow-sm'}
				       {pillSizeClasses[size]}
				       focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
				role="radio"
				aria-checked={value === segment}
			>
				{#if Icon}
					<Icon class="w-3.5 h-3.5" />
				{/if}
				<span>{config?.label || segment}</span>
			</button>
		{/each}
	</div>
{:else if variant === 'radio'}
	<div class="flex flex-col gap-2 {className}">
		{#each segments as segment}
			{@const config = segmentConfig[segment]}
			{@const Icon = config?.icon}
			<label class="flex items-center gap-2 cursor-pointer">
				<input
					type="radio"
					name="segment"
					value={segment}
					checked={value === segment}
					onchange={() => handleChange(segment)}
					class="w-4 h-4 text-primary focus:ring-primary focus:ring-2"
				/>
				{#if Icon}
					<Icon class="w-4 h-4 text-gray-600 dark:text-gray-400" />
				{/if}
				<span class="text-sm text-gray-700 dark:text-gray-300">
					{config?.label || segment}
				</span>
			</label>
		{/each}
	</div>
{/if}
