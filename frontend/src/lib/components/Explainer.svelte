<script lang="ts">
	let { content } = $props();

	const files = import.meta.glob('../content/explainers/*.md');
	let Content = $state<typeof import('*.md').default>();

	$effect(() => {
		const path = `../content/explainers/${content}.md`;

        console.log(path)

		if (files[path]) {
			files[path]().then((mod: { default: typeof import('*.md').default }) => {
				Content = mod.default;
			});
		} else {
			console.error('File not found:', path);
		}
	});
</script>

{#if Content}
    <div class="prose">
        <Content />
    </div>
{:else}
	<p>Loading...</p>
{/if}