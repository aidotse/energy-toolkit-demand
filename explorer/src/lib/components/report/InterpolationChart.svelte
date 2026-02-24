<!--
  InterpolationChart - Pure SVG illustrating linear interpolation between 5-year data points.
  Shows 6 anchor points (Energimyndigheten's data) connected by straight lines,
  with small dots at each interpolated year. Owns its data internally.
-->
<script lang="ts">
	const anchorYears = [2025, 2030, 2035, 2040, 2045, 2050];
	const anchorValues = [140, 155, 175, 200, 230, 260];

	// Generate interpolated yearly points
	const allPoints: { year: number; value: number; isAnchor: boolean }[] = [];
	for (let i = 0; i < anchorYears.length - 1; i++) {
		const y0 = anchorYears[i];
		const y1 = anchorYears[i + 1];
		const v0 = anchorValues[i];
		const v1 = anchorValues[i + 1];
		for (let y = y0; y < y1; y++) {
			const t = (y - y0) / (y1 - y0);
			allPoints.push({ year: y, value: v0 + t * (v1 - v0), isAnchor: y === y0 });
		}
	}
	allPoints.push({
		year: anchorYears[anchorYears.length - 1],
		value: anchorValues[anchorValues.length - 1],
		isAnchor: true
	});

	// SVG layout
	const width = 600;
	const height = 260;
	const pad = { top: 20, right: 20, bottom: 40, left: 50 };
	const plotW = width - pad.left - pad.right;
	const plotH = height - pad.top - pad.bottom;

	const minY = 120;
	const maxY = 280;

	function x(year: number) {
		return pad.left + ((year - 2025) / (2050 - 2025)) * plotW;
	}
	function y(val: number) {
		return pad.top + plotH - ((val - minY) / (maxY - minY)) * plotH;
	}

	// Line path
	const linePath = allPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.year).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');

	// Y-axis ticks
	const yTicks = [140, 160, 180, 200, 220, 240, 260];
</script>

<figure class="my-8">
	<svg viewBox="0 0 {width} {height}" class="w-full max-w-xl mx-auto" role="img" aria-label="Illustration av linjär interpolering mellan femårspunkter">
		<!-- Grid lines -->
		{#each yTicks as tick}
			<line
				x1={pad.left}
				y1={y(tick)}
				x2={width - pad.right}
				y2={y(tick)}
				stroke="#e5e7eb"
				stroke-width="1"
			/>
			<text
				x={pad.left - 8}
				y={y(tick) + 4}
				text-anchor="end"
				class="fill-gray-400"
				font-size="11"
			>{tick}</text>
		{/each}

		<!-- Y-axis label -->
		<text
			x={14}
			y={pad.top + plotH / 2}
			text-anchor="middle"
			transform="rotate(-90, 14, {pad.top + plotH / 2})"
			class="fill-gray-500"
			font-size="12"
		>TWh</text>

		<!-- X-axis labels -->
		{#each anchorYears as yr}
			<text
				x={x(yr)}
				y={height - 8}
				text-anchor="middle"
				class="fill-gray-500"
				font-size="12"
			>{yr}</text>
		{/each}

		<!-- Line -->
		<path d={linePath} fill="none" stroke="#004d66" stroke-width="2" />

		<!-- Interpolated points (small) -->
		{#each allPoints.filter(p => !p.isAnchor) as p}
			<circle cx={x(p.year)} cy={y(p.value)} r="3" fill="#004d66" />
		{/each}

		<!-- Anchor points (large, hollow) -->
		{#each allPoints.filter(p => p.isAnchor) as p}
			<circle cx={x(p.year)} cy={y(p.value)} r="6" fill="white" stroke="#004d66" stroke-width="2.5" />
		{/each}
	</svg>

	<figcaption class="text-center text-sm text-gray-500 dark:text-gray-400 mt-2">
		○ = Energimyndighetens datapunkter &nbsp; ● = Interpolerade årsvärden
	</figcaption>
</figure>
