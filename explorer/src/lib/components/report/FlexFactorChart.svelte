<!--
  FlexFactorChart - Three overlaid 24h line curves showing how increasing
  flex-factor draws the demand curve toward the mean. Housing segment profile.
  Original (1.0), Flex 0.8, Flex 0.6, plus dashed mean line.
-->
<script lang="ts">
	import { viz } from '$lib/colors';

	// Housing segment — pronounced morning/evening peaks (illustrative MW values)
	const original = [
		60, 55, 52, 50, 55, 70, 100, 145, 160, 150, 135, 125,
		120, 115, 110, 115, 130, 160, 165, 145, 120, 95, 75, 65
	];

	const mean = original.reduce((a, b) => a + b, 0) / original.length;

	// Apply flex formula: mean + factor * (original - mean)
	function applyFlex(values: number[], factor: number) {
		return values.map((v) => mean + factor * (v - mean));
	}

	const flex08 = applyFlex(original, 0.8);
	const flex06 = applyFlex(original, 0.6);

	// SVG layout
	const width = 600;
	const height = 280;
	const pad = { top: 20, right: 60, bottom: 40, left: 50 };
	const plotW = width - pad.left - pad.right;
	const plotH = height - pad.top - pad.bottom;

	const minY = 0;
	const maxY = 190;

	function x(hour: number) {
		return pad.left + (hour / 23) * plotW;
	}

	function y(val: number) {
		return pad.top + plotH - ((val - minY) / (maxY - minY)) * plotH;
	}

	function makeLinePath(values: number[]) {
		return values
			.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`)
			.join(' ');
	}

	const xTicks = [0, 3, 6, 9, 12, 15, 18, 21];
	const yTicks = [0, 50, 100, 150];

	const curves = [
		{ data: original, color: viz.teal[900], label: 'Original (1,0)' },
		{ data: flex08, color: viz.teal[500], label: 'Flex 0,8' },
		{ data: flex06, color: viz.teal[100], label: 'Flex 0,6' }
	];
</script>

<figure class="my-8">
	<svg viewBox="0 0 {width} {height}" class="w-full max-w-xl mx-auto" role="img" aria-label="Flex-faktorns effekt på dygnskurvan: tre kurvor konvergerar mot medelvärdet">
		<!-- Grid lines -->
		{#each yTicks as tick}
			<line x1={pad.left} y1={y(tick)} x2={width - pad.right} y2={y(tick)} stroke={viz.grid} stroke-width="1" />
			<text x={pad.left - 8} y={y(tick) + 4} text-anchor="end" class="fill-gray-400" font-size="11">{tick}</text>
		{/each}

		<!-- Y-axis label -->
		<text
			x={14}
			y={pad.top + plotH / 2}
			text-anchor="middle"
			transform="rotate(-90, 14, {pad.top + plotH / 2})"
			class="fill-gray-500"
			font-size="12"
		>MW</text>

		<!-- X-axis labels -->
		{#each xTicks as hr}
			<text x={x(hr)} y={height - 8} text-anchor="middle" class="fill-gray-500" font-size="11">{String(hr).padStart(2, '0')}:00</text>
		{/each}

		<!-- Mean line (dashed) -->
		<line
			x1={pad.left}
			y1={y(mean)}
			x2={width - pad.right}
			y2={y(mean)}
			stroke={viz.axis}
			stroke-width="1.5"
			stroke-dasharray="6,4"
		/>
		<text
			x={width - pad.right + 4}
			y={y(mean) + 4}
			text-anchor="start"
			fill={viz.axis}
			font-size="10"
			font-weight="600"
		>Medelvärde</text>

		<!-- Curves — draw in reverse order so original is on top -->
		{#each [...curves].reverse() as curve}
			<path
				d={makeLinePath(curve.data)}
				fill="none"
				stroke={curve.color}
				stroke-width="2.5"
				stroke-linejoin="round"
			/>
		{/each}
	</svg>

	<!-- Legend -->
	<div class="flex flex-wrap justify-center gap-x-6 gap-y-1 mt-3">
		{#each curves as curve}
			<span class="flex items-center gap-1.5 text-sm text-gray-600">
				<span class="inline-block w-5 h-0.5 rounded" style="background-color: {curve.color};"></span>
				{curve.label}
			</span>
		{/each}
		<span class="flex items-center gap-1.5 text-sm text-gray-600">
			<span class="inline-block w-5 border-t-2 border-dashed" style="border-color: {viz.axis};"></span>
			Medelvärde
		</span>
	</div>

	<figcaption class="text-center text-sm text-gray-500 mt-2">
		Bostadssegmentets dygnskurva med tre flex-nivåer. Ju lägre flex-faktor, desto närmare medelvärdet hamnar kurvan.
	</figcaption>
</figure>
