<script>
    let { id, class: className = '' } = $props();
</script>

<section
    id={id}
    class="@container py-12 first:pt-24 {className}"
>
    <slot />
</section>