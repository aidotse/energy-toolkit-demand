<!--
  GrowthLevelGrid - Displays the 6 growth parameter levels.
  Renders a compact grid showing the range from -15% to +15%. Owns its data internally.
-->
<script lang="ts">
	const levels = [
		{ label: '\u221215 %', desc: 'Kraftig minskning' },
		{ label: '\u221210 %', desc: 'Tydlig minskning' },
		{ label: '\u22125 %', desc: 'Måttlig minskning' },
		{ label: '+5 %', desc: 'Måttlig ökning' },
		{ label: '+10 %', desc: 'Tydlig ökning' },
		{ label: '+15 %', desc: 'Kraftig ökning' }
	];
</script>

<div class="grid grid-cols-2 sm:grid-cols-3 gap-2 my-6">
	{#each levels as level}
		<div class="text-center p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
			<span class="text-sm font-mono font-bold text-indigo-600 dark:text-indigo-400">{level.label}</span>
			<p class="text-xs text-gray-500 dark:text-gray-500 mt-0.5">{level.desc}</p>
		</div>
	{/each}
</div>
