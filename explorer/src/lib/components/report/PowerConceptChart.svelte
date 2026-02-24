<!--
  PowerConceptChart - Two side-by-side area charts illustrating the core concept:
  same total energy (area under curve), different power profiles.
  Left: flat 100 MW constant for 24h = 2400 MWh
  Right: peaked profile with morning/evening peaks, same total 2400 MWh
-->
<script lang="ts">
	// Flat profile: constant 100 MW for 24 hours
	const flatValue = 100;

	// Peaked profile: morning/evening peaks, same 2400 MWh total
	// Hand-tuned so sum of hourly values = 2400
	const peakedValues = [
		55, 50, 48, 47, 50, 60, 85, 130, 155, 145, 130, 120,
		115, 110, 105, 110, 125, 155, 160, 140, 115, 90, 70, 60
	];

	const peakMax = Math.max(...peakedValues);

	// SVG layout
	const panelW = 280;
	const gap = 40;
	const width = panelW * 2 + gap;
	const height = 220;
	const pad = { top: 20, right: 10, bottom: 35, left: 45 };
	const plotW = panelW - pad.left - pad.right;
	const plotH = height - pad.top - pad.bottom;

	const maxY = 180;
	const minY = 0;

	function xScale(hour: number, offset: number) {
		return offset + pad.left + (hour / 23) * plotW;
	}

	function yScale(val: number) {
		return pad.top + plotH - ((val - minY) / (maxY - minY)) * plotH;
	}

	// Area path for flat profile
	const flatAreaPath = (() => {
		const y0 = yScale(0);
		const yVal = yScale(flatValue);
		const x0 = xScale(0, 0);
		const x1 = xScale(23, 0);
		return `M${x0},${y0} L${x0},${yVal} L${x1},${yVal} L${x1},${y0} Z`;
	})();

	// Area path for peaked profile
	const peakedAreaPath = (() => {
		const offset = panelW + gap;
		const y0 = yScale(0);
		let path = `M${xScale(0, offset)},${y0}`;
		for (let i = 0; i < 24; i++) {
			path += ` L${xScale(i, offset).toFixed(1)},${yScale(peakedValues[i]).toFixed(1)}`;
		}
		path += ` L${xScale(23, offset)},${y0} Z`;
		return path;
	})();

	// Line path for peaked profile (top edge only)
	const peakedLinePath = (() => {
		const offset = panelW + gap;
		return peakedValues
			.map((v, i) => `${i === 0 ? 'M' : 'L'}${xScale(i, offset).toFixed(1)},${yScale(v).toFixed(1)}`)
			.join(' ');
	})();

	// Right panel offset
	const rightOffset = panelW + gap;

	const xTicks = [0, 6, 12, 18, 23];
	const yTicks = [0, 50, 100, 150];
</script>

<figure class="my-8">
	<svg viewBox="0 0 {width} {height}" class="w-full max-w-2xl mx-auto" role="img" aria-label="Två area-diagram: samma energi (2 400 MWh) med jämn respektive ojämn lastprofil">
		<!-- LEFT PANEL: Flat profile -->
		<!-- Y-axis -->
		{#each yTicks as tick}
			<line x1={pad.left} y1={yScale(tick)} x2={panelW - pad.right} y2={yScale(tick)} stroke="#e5e7eb" stroke-width="1" />
			<text x={pad.left - 6} y={yScale(tick) + 4} text-anchor="end" class="fill-gray-400" font-size="10">{tick}</text>
		{/each}

		<!-- Area -->
		<path d={flatAreaPath} fill="#004d66" fill-opacity="0.25" />
		<line x1={xScale(0, 0)} y1={yScale(flatValue)} x2={xScale(23, 0)} y2={yScale(flatValue)} stroke="#004d66" stroke-width="2" />

		<!-- 100 MW label -->
		<text x={xScale(11.5, 0)} y={yScale(flatValue) - 8} text-anchor="middle" class="fill-gray-700 dark:fill-gray-300" font-size="11" font-weight="600">100 MW</text>

		<!-- Title -->
		<text x={pad.left + plotW / 2} y={12} text-anchor="middle" class="fill-gray-600 dark:fill-gray-400" font-size="12" font-weight="600">Jämn last</text>

		<!-- X-axis labels -->
		{#each xTicks as hr}
			<text x={xScale(hr, 0)} y={height - 6} text-anchor="middle" class="fill-gray-400" font-size="10">{String(hr).padStart(2, '0')}</text>
		{/each}

		<!-- Energy label -->
		<text x={xScale(11.5, 0)} y={yScale(50)} text-anchor="middle" class="fill-[#004d66] dark:fill-[#46a0c4]" font-size="13" font-weight="700" opacity="0.7">2 400 MWh</text>


		<!-- RIGHT PANEL: Peaked profile -->

		<!-- Y-axis -->
		{#each yTicks as tick}
			<line x1={rightOffset + pad.left} y1={yScale(tick)} x2={rightOffset + panelW - pad.right} y2={yScale(tick)} stroke="#e5e7eb" stroke-width="1" />
			<text x={rightOffset + pad.left - 6} y={yScale(tick) + 4} text-anchor="end" class="fill-gray-400" font-size="10">{tick}</text>
		{/each}

		<!-- Area -->
		<path d={peakedAreaPath} fill="#004d66" fill-opacity="0.25" />
		<path d={peakedLinePath} fill="none" stroke="#004d66" stroke-width="2" stroke-linejoin="round" />

		<!-- Peak annotation -->
		<line x1={rightOffset + pad.left} y1={yScale(peakMax)} x2={rightOffset + panelW - pad.right} y2={yScale(peakMax)} stroke="#b91c1c" stroke-width="1" stroke-dasharray="4,3" />
		<text x={rightOffset + panelW - pad.right + 2} y={yScale(peakMax) + 4} text-anchor="start" fill="#b91c1c" font-size="10" font-weight="600">{peakMax} MW</text>

		<!-- Title -->
		<text x={rightOffset + pad.left + plotW / 2} y={12} text-anchor="middle" class="fill-gray-600 dark:fill-gray-400" font-size="12" font-weight="600">Ojämn last</text>

		<!-- X-axis labels -->
		{#each xTicks as hr}
			<text x={xScale(hr, rightOffset)} y={height - 6} text-anchor="middle" class="fill-gray-400" font-size="10">{String(hr).padStart(2, '0')}</text>
		{/each}

		<!-- Energy label -->
		<text x={xScale(11.5, rightOffset)} y={yScale(50)} text-anchor="middle" class="fill-[#004d66] dark:fill-[#46a0c4]" font-size="13" font-weight="700" opacity="0.7">2 400 MWh</text>
	</svg>

	<figcaption class="text-center text-sm text-gray-500 dark:text-gray-400 mt-2">
		Samma totala energi (yta under kurvan) men olika effektprofiler. Den ojämna lasten kräver högre kapacitet i elnätet.
	</figcaption>
</figure>
