<!--
  ContentShell - Reusable page wrapper for content-driven pages

  Detects locale, loads the matching .svx/.md content file,
  and renders page chrome (PageContainer, back link, title, description)
  around the content component.
-->
<script lang="ts">
	import PageContainer from '$lib/components/layout/PageContainer.svelte';
	import { loadLocalizedContent, type ContentFile } from '$lib/contentLoader';

	import type { Snippet } from 'svelte';

	let {
		slug,
		backLink,
		backLabel,
		header
	}: {
		slug: string;
		backLink?: string;
		backLabel?: string;
		header?: Snippet;
	} = $props();

	let content = $state<ContentFile | null>(null);
	let ContentComponent = $derived<any>(content?.default);
	let loading = $state(true);
	let error = $state(false);

	$effect(() => {
		loading = true;
		error = false;
		loadLocalizedContent(slug).then((result) => {
			content = result;
			loading = false;
			if (!result) error = true;
		});
	});
</script>

<svelte:head>
	<title>{content?.metadata?.title ? `${content.metadata.title} — Behovskartan` : 'Behovskartan'}</title>
	{#if content?.metadata?.description}
		<meta name="description" content={content.metadata.description} />
	{/if}
</svelte:head>

<PageContainer>
	{#if loading}
		<div class="animate-pulse space-y-4">
			<div class="h-8 bg-gray-200 rounded w-1/3"></div>
			<div class="h-4 bg-gray-200 rounded w-2/3"></div>
			<div class="h-64 bg-gray-200 rounded"></div>
		</div>
	{:else if error}
		<p class="text-red-600">Content not found: {slug}</p>
	{:else if content}
		{#if header}
			{@render header()}
		{/if}

		<div class="px-1 sm:px-8 lg:px-20 pt-4 lg:pt-8">
			{#if content.metadata.title}
				<h1 class="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
					{content.metadata.title}
				</h1>
			{/if}
			{#if content.metadata.description}
				<p class="text-lg font-medium text-gray-700 mb-8 max-w-3xl">
					{content.metadata.description}
				</p>
			{/if}

			{#if ContentComponent}
				<ContentComponent />
			{/if}
		</div>
	{/if}
</PageContainer>
