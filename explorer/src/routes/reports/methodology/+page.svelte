<script lang="ts">
	import ContentShell from '$lib/components/content/ContentShell.svelte';
	import ReportHeaderNav from '$lib/components/content/ReportHeaderNav.svelte';
</script>

<ContentShell slug="reports/methodology">
	{#snippet header()}
		<ReportHeaderNav />
	{/snippet}
</ContentShell>
