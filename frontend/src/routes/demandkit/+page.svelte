<script lang="ts">
    import Sidebar from '$lib/components/sidebar/Sidebar.svelte';
    import * as m from '$paraglide/messages';

    let toggleControls = $state(true);
</script>

<div class="max-w-7xl mx-auto pt-16">
    <Sidebar {toggleControls} />
    <h1 class="text-3xl font-bold pt-8 pb-4">{m['toolkit_page']()}</h1>
    <p>
        Den här webbapplikationen är baserad på...
    </p>
</div>