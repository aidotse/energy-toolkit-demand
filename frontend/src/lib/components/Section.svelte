<script>
    let { id } = $props();
</script>

<section id={id} class="flex flex-col flex-1 mx-6 lg:mx-24 2xl:mx-auto 2xl:max-w-screen-lg">
    <slot />
</section>