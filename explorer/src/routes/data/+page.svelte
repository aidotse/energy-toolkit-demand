<script lang="ts">
	import PageContainer from '$lib/components/layout/PageContainer.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const spec = data.spec;
	const paths = Object.entries(spec.paths) as [string, Record<string, any>][];

	function paramDefault(param: any): string | null {
		return param.schema?.default !== undefined ? String(param.schema.default) : null;
	}

	function paramEnum(param: any): string[] | null {
		return param.schema?.enum || null;
	}

	function schemaProperties(schema: any): [string, any][] {
		if (!schema?.properties) return [];
		return Object.entries(schema.properties);
	}

	function getResponseSchema(responses: any): { contentType: string; schema: any } | null {
		const ok = responses?.['200'];
		if (!ok?.content) return null;
		const [contentType, mediaType] = Object.entries(ok.content)[0] as [string, any];
		return { contentType, schema: mediaType?.schema };
	}

	function getExample(responses: any): string | null {
		const ok = responses?.['200'];
		if (!ok?.content) return null;
		for (const mediaType of Object.values(ok.content) as any[]) {
			if (mediaType?.examples) {
				const first = Object.values(mediaType.examples)[0] as any;
				if (first?.value) return JSON.stringify(first.value, null, 2);
			}
			if (mediaType?.example) return typeof mediaType.example === 'string'
				? mediaType.example
				: JSON.stringify(mediaType.example, null, 2);
		}
		return null;
	}

	// Nested object params (like period) — expand their sub-properties
	function expandedParams(params: any[]): any[] {
		const result: any[] = [];
		for (const p of params) {
			if (p.schema?.type === 'object' && p.schema.properties) {
				for (const [name, prop] of Object.entries(p.schema.properties) as [string, any][]) {
					result.push({
						name: `${p.name}.${name}`,
						schema: prop,
						required: p.schema.required?.includes(name) ?? false,
						description: prop.description || ''
					});
				}
			} else {
				result.push(p);
			}
		}
		return result;
	}
</script>

<svelte:head>
	<title>Data & API — Behovskartan</title>
	<meta name="description" content="Tillgång till data och information om hur du använder vårt API" />
</svelte:head>

<PageContainer maxWidth="max-w-5xl">
	<!-- Intro -->
	<header class="mb-10 px-1 sm:px-8 lg:px-20 pt-4 lg:pt-8">
		<h1 class="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Data & API</h1>
		<div class="prose prose-gray max-w-prose">
			<p>
				Alla scenarier i detta verktyg är tillgängliga via ett öppet API.
				Data genereras från historiska tidsserier och parametriserade scenarier som
				modellerar olika utvecklingsbanor för elektrifiering, ekonomisk tillväxt och
				teknologisk utveckling.
			</p>
			<p>
				API:et använder DuckDB för snabba frågor mot strukturerade Parquet-filer.
				All data är tillgänglig med olika tidsupplösningar och kan filtreras på
				geografi, segment och scenario.
			</p>
		</div>
	</header>

	<div class="px-1 sm:px-8 lg:px-20">
	<!-- Quick reference -->
	<section class="mb-10 p-5 bg-gray-50 rounded-lg">
		<h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Snabbstart</h2>
		<ol class="list-decimal list-inside text-sm text-gray-700 space-y-1 mb-4">
			<li><code class="text-xs bg-white px-1.5 py-0.5 rounded border">GET /parameters</code> — Hämta tillgängliga parametervärden</li>
			<li><code class="text-xs bg-white px-1.5 py-0.5 rounded border">GET /scenarios</code> — Hämta tillgängliga scenarier</li>
			<li><code class="text-xs bg-white px-1.5 py-0.5 rounded border">GET /demand</code> — Hämta tidsserier med valfria filter</li>
		</ol>
		<p class="text-xs text-gray-500">
			Svarsformat: JSON (standard) eller CSV (<code class="bg-white px-1 py-0.5 rounded border">?format=csv</code>).
			Geografiendpointen stöder även GeoJSON.
		</p>
	</section>

	<!-- Endpoint index -->
	<nav class="mb-10">
		<h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Endpoints</h2>
		<ul class="space-y-1">
			{#each paths as [path, methods]}
				{@const op = Object.values(methods)[0] as any}
				<li>
					<a href="#endpoint-{path.slice(1)}" class="flex items-center gap-3 py-1.5 text-sm hover:text-blue-600 transition-colors">
						<span class="font-mono text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">GET</span>
						<span class="font-mono text-gray-900">{path}</span>
						<span class="text-gray-400 hidden sm:inline">— {op.summary}</span>
					</a>
				</li>
			{/each}
		</ul>
	</nav>

	<!-- Endpoint details -->
	<div class="space-y-12">
		{#each paths as [path, methods]}
			{@const method = Object.keys(methods)[0]}
			{@const op = methods[method]}
			{@const resp = getResponseSchema(op.responses)}
			{@const example = getExample(op.responses)}
			{@const params = op.parameters ? expandedParams(op.parameters) : []}

			<section id="endpoint-{path.slice(1)}" class="scroll-mt-20">
				<div class="flex items-center gap-3 mb-1">
					<span class="font-mono text-sm font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded">{method.toUpperCase()}</span>
					<h2 class="text-xl font-bold font-mono text-gray-900">{path}</h2>
				</div>
				<p class="text-gray-600 mb-4">{op.summary}</p>

				{#if op.description}
					<div class="text-sm text-gray-600 leading-relaxed mb-4 max-w-prose whitespace-pre-line">
						{@html op.description
							.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
							.replace(/`(.*?)`/g, '<code class="text-xs bg-gray-100 px-1 py-0.5 rounded">$1</code>')
							.replace(/^#{1,3}\s+(.*)$/gm, '<p class="font-semibold text-gray-800 mt-3">$1</p>')
							.replace(/^- (.*?)$/gm, '<span class="block pl-4">— $1</span>')
							.trim()}
					</div>
				{/if}

				{#if params.length}
					<div class="mb-4">
						<h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Parameters</h3>
						<div class="border border-gray-200 rounded-lg overflow-hidden">
							<table class="w-full text-sm">
								<thead>
									<tr class="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
										<th class="px-4 py-2">Name</th>
										<th class="px-4 py-2">Type</th>
										<th class="px-4 py-2">Required</th>
										<th class="px-4 py-2">Description</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-gray-100">
									{#each params as param}
										{@const enumVals = paramEnum(param)}
										{@const defVal = paramDefault(param)}
										<tr>
											<td class="px-4 py-2 font-mono text-xs text-gray-900">{param.name}</td>
											<td class="px-4 py-2 text-xs text-gray-500">
												{param.schema?.type || 'string'}
												{#if enumVals}
													<br /><span class="text-gray-400">{enumVals.join(' | ')}</span>
												{/if}
											</td>
											<td class="px-4 py-2 text-xs">
												{#if param.required}
													<span class="text-amber-600 font-medium">required</span>
												{:else}
													<span class="text-gray-400">optional</span>
													{#if defVal !== null}
														<br /><span class="text-gray-400">default: {defVal}</span>
													{/if}
												{/if}
											</td>
											<td class="px-4 py-2 text-xs text-gray-600">{param.description || ''}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				{/if}

				{#if resp?.schema?.properties}
					<div class="mb-4">
						<h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Response</h3>
						<p class="text-xs text-gray-400 mb-2">{resp.contentType}</p>
						<div class="border border-gray-200 rounded-lg overflow-hidden">
							<table class="w-full text-sm">
								<thead>
									<tr class="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
										<th class="px-4 py-2">Field</th>
										<th class="px-4 py-2">Type</th>
										<th class="px-4 py-2">Description</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-gray-100">
									{#each schemaProperties(resp.schema) as [name, prop]}
										<tr>
											<td class="px-4 py-2 font-mono text-xs text-gray-900">{name}</td>
											<td class="px-4 py-2 text-xs text-gray-500">{prop.type || 'object'}</td>
											<td class="px-4 py-2 text-xs text-gray-600">{prop.description || ''}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				{/if}

				{#if example}
					<details class="group">
						<summary class="text-sm font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-700 select-none">
							Example response
						</summary>
						<pre class="mt-2 p-4 bg-gray-900 text-gray-100 rounded-lg text-xs overflow-x-auto max-h-80"><code>{example}</code></pre>
					</details>
				{/if}
			</section>
		{/each}
	</div>

	<!-- Tips -->
	<section class="mt-12 pt-8 border-t border-gray-200">
		<h2 class="text-lg font-semibold text-gray-900 mb-4">Användningstips</h2>
		<div class="grid sm:grid-cols-2 gap-4 text-sm text-gray-600">
			<div class="p-4 bg-gray-50 rounded-lg">
				<h3 class="font-semibold text-gray-800 mb-1">Server-side aggregering</h3>
				<p>Använd <code class="text-xs bg-white px-1 py-0.5 rounded border">geography=total</code> och <code class="text-xs bg-white px-1 py-0.5 rounded border">segment=total</code> för att låta servern aggregera åt dig.</p>
			</div>
			<div class="p-4 bg-gray-50 rounded-lg">
				<h3 class="font-semibold text-gray-800 mb-1">Upplösning & aggregering</h3>
				<p>För energi: <code class="text-xs bg-white px-1 py-0.5 rounded border">aggregation=sum</code>. För effekt: <code class="text-xs bg-white px-1 py-0.5 rounded border">aggregation=mean</code> eller <code class="text-xs bg-white px-1 py-0.5 rounded border">max</code>.</p>
			</div>
		</div>
	</section>

	<footer class="mt-8 pt-6 border-t border-gray-100 text-xs text-gray-400 flex justify-between">
		<p>Genererad från <a href="/openapi.json" class="underline hover:text-gray-600">openapi.json</a> — OpenAPI {spec.openapi}</p>
		<a href="https://github.com/aidotse/behovskartan" class="underline hover:text-gray-600">GitHub</a>
	</footer>
	</div>
</PageContainer>
