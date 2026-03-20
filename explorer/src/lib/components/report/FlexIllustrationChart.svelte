<!--
  FlexIllustrationChart - Two overlaid 24h curves showing same total energy
  with/without flexibility. Demonstrates how flex lowers peak power.
-->
<script lang="ts">
	import { viz } from '$lib/colors';

	// "Utan flex" — pronounced morning/evening peaks
	const withoutFlex = [
		60, 55, 52, 50, 55, 70, 100, 145, 160, 150, 135, 125,
		120, 115, 110, 115, 130, 160, 165, 145, 120, 95, 75, 65
	];

	// "Med flex" — smoothed profile, same total energy
	// Sum matches withoutFlex sum (2637)
	const withFlex = [
		85, 83, 82, 80, 82, 88, 100, 120, 130, 128, 122, 118,
		115, 112, 110, 112, 118, 130, 132, 125, 115, 102, 92, 88
	];

	const peakWithout = Math.max(...withoutFlex);
	const peakWith = Math.max(...withFlex);

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

	function makeAreaPath(values: number[]) {
		const y0 = y(0);
		let path = `M${x(0)},${y0}`;
		for (let i = 0; i < values.length; i++) {
			path += ` L${x(i).toFixed(1)},${y(values[i]).toFixed(1)}`;
		}
		path += ` L${x(values.length - 1)},${y0} Z`;
		return path;
	}

	function makeLinePath(values: number[]) {
		return values
			.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`)
			.join(' ');
	}

	// Arrow position for reduction annotation
	const arrowX = width - pad.right + 30;

	const xTicks = [0, 3, 6, 9, 12, 15, 18, 21];
	const yTicks = [0, 50, 100, 150];
</script>

<figure class="my-8">
	<svg viewBox="0 0 {width} {height}" class="w-full max-w-xl mx-auto" role="img" aria-label="Dygnskurvor med och utan flexibilitet">
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

		<!-- "Utan flex" area + line -->
		<path d={makeAreaPath(withoutFlex)} fill={viz.teal[900]} fill-opacity="0.15" />
		<path d={makeLinePath(withoutFlex)} fill="none" stroke={viz.teal[900]} stroke-width="2.5" stroke-linejoin="round" />

		<!-- "Med flex" area + line -->
		<path d={makeAreaPath(withFlex)} fill={viz.teal[500]} fill-opacity="0.15" />
		<path d={makeLinePath(withFlex)} fill="none" stroke={viz.teal[500]} stroke-width="2.5" stroke-linejoin="round" />

		<!-- Peak lines -->
		<line x1={pad.left} y1={y(peakWithout)} x2={width - pad.right} y2={y(peakWithout)} stroke={viz.teal[900]} stroke-width="1" stroke-dasharray="5,4" />
		<text x={width - pad.right + 4} y={y(peakWithout) + 4} text-anchor="start" fill={viz.teal[900]} font-size="10" font-weight="600">{peakWithout} MW</text>

		<line x1={pad.left} y1={y(peakWith)} x2={width - pad.right} y2={y(peakWith)} stroke={viz.teal[500]} stroke-width="1" stroke-dasharray="5,4" />
		<text x={width - pad.right + 4} y={y(peakWith) + 4} text-anchor="start" fill={viz.teal[500]} font-size="10" font-weight="600">{peakWith} MW</text>

		<!-- Reduction arrow -->
		<line x1={arrowX} y1={y(peakWithout) + 4} x2={arrowX} y2={y(peakWith) - 4} stroke={viz.emphasis} stroke-width="1.5" marker-end="url(#arrowDown)" marker-start="url(#arrowUp)" />
		<text x={arrowX + 2} y={(y(peakWithout) + y(peakWith)) / 2 + 4} text-anchor="start" fill={viz.emphasis} font-size="9" font-weight="600">
			-{Math.round((1 - peakWith / peakWithout) * 100)}%
		</text>

		<!-- Arrow markers -->
		<defs>
			<marker id="arrowDown" viewBox="0 0 6 6" refX="3" refY="6" markerWidth="6" markerHeight="6" orient="auto">
				<path d="M0,0 L3,6 L6,0" fill={viz.emphasis} />
			</marker>
			<marker id="arrowUp" viewBox="0 0 6 6" refX="3" refY="0" markerWidth="6" markerHeight="6" orient="auto">
				<path d="M0,6 L3,0 L6,6" fill={viz.emphasis} />
			</marker>
		</defs>
	</svg>

	<!-- Legend -->
	<div class="flex flex-wrap justify-center gap-x-6 gap-y-1 mt-3">
		<span class="flex items-center gap-1.5 text-sm text-gray-600">
			<span class="inline-block w-5 h-0.5 rounded" style="background-color: {viz.teal[900]};"></span>
			Utan flex
		</span>
		<span class="flex items-center gap-1.5 text-sm text-gray-600">
			<span class="inline-block w-5 h-0.5 rounded" style="background-color: {viz.teal[500]};"></span>
			Med flex
		</span>
	</div>

	<figcaption class="text-center text-sm text-gray-500 mt-2">
		Samma totala energi men utjämnad profil. Flexibilitet sänker toppeffekten utan att minska elförbrukningen.
	</figcaption>
</figure>
