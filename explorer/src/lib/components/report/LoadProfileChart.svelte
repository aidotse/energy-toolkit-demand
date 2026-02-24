<!--
  LoadProfileChart - Renders normalized 24-hour load profiles for all 5 segments.
  Fetches data from /data/load-profiles.json. Shows overlaid line chart with legend.
-->
<script lang="ts">
	import { getSegmentColor } from '$lib/chartConfig';

	type SegmentData = { values: number[]; label: string };
	type ProfileData = { hours: number[]; segments: Record<string, SegmentData> };

	let data: ProfileData | null = $state(null);

	const segmentOrder = ['housing', 'services', 'industry', 'transport', 'datacenters'];

	$effect(() => {
		fetch('/data/load-profiles.json')
			.then((r) => r.json())
			.then((d: ProfileData) => {
				data = d;
			});
	});

	// SVG layout
	const width = 600;
	const height = 300;
	const pad = { top: 15, right: 15, bottom: 40, left: 50 };
	const plotW = width - pad.left - pad.right;
	const plotH = height - pad.top - pad.bottom;

	function x(hour: number) {
		return pad.left + (hour / 23) * plotW;
	}

	function y(val: number, minV: number, maxV: number) {
		return pad.top + plotH - ((val - minV) / (maxV - minV)) * plotH;
	}

	function makePath(values: number[], minV: number, maxV: number) {
		return values
			.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v, minV, maxV).toFixed(1)}`)
			.join(' ');
	}

	// Computed range across all segments
	let range = $derived.by(() => {
		if (!data) return { min: 0, max: 0.08 };
		let min = Infinity;
		let max = -Infinity;
		for (const seg of segmentOrder) {
			const vals = data.segments[seg]?.values;
			if (!vals) continue;
			for (const v of vals) {
				if (v < min) min = v;
				if (v > max) max = v;
			}
		}
		// Add some padding
		const spread = max - min;
		return { min: min - spread * 0.05, max: max + spread * 0.05 };
	});

	const xTicks = [0, 3, 6, 9, 12, 15, 18, 21];
</script>

{#if data}
	<figure class="my-8">
		<svg viewBox="0 0 {width} {height}" class="w-full max-w-xl mx-auto" role="img" aria-label="Normaliserade lastprofiler per segment, 24-timmarscykel">
			<!-- Grid lines -->
			{#each [0, 0.25, 0.5, 0.75, 1] as frac}
				{@const val = range.min + frac * (range.max - range.min)}
				<line
					x1={pad.left}
					y1={y(val, range.min, range.max)}
					x2={width - pad.right}
					y2={y(val, range.min, range.max)}
					stroke="#e5e7eb"
					stroke-width="1"
				/>
			{/each}

			<!-- Y-axis label -->
			<text
				x={12}
				y={pad.top + plotH / 2}
				text-anchor="middle"
				transform="rotate(-90, 12, {pad.top + plotH / 2})"
				class="fill-gray-500"
				font-size="11"
			>Normaliserad effekt</text>

			<!-- X-axis labels -->
			{#each xTicks as hr}
				<text
					x={x(hr)}
					y={height - 10}
					text-anchor="middle"
					class="fill-gray-500"
					font-size="11"
				>{String(hr).padStart(2, '0')}:00</text>
			{/each}

			<!-- Segment lines -->
			{#each segmentOrder as seg}
				{@const vals = data.segments[seg]?.values}
				{@const color = getSegmentColor(seg).bg}
				{#if vals}
					<path
						d={makePath(vals, range.min, range.max)}
						fill="none"
						stroke={color}
						stroke-width="2.5"
						stroke-linejoin="round"
					/>
				{/if}
			{/each}
		</svg>

		<!-- Legend -->
		<div class="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-3">
			{#each segmentOrder as seg}
				{@const color = getSegmentColor(seg).bg}
				{@const label = data.segments[seg]?.label ?? seg}
				<span class="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
					<span class="inline-block w-4 h-0.5 rounded" style="background-color: {color};"></span>
					{label}
				</span>
			{/each}
		</div>
	</figure>
{/if}
