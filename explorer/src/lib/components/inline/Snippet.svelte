<script lang="ts">
    let {parameterData, property} = $props();

    const output = $derived.by(() => {
        if (property === 'end-year') {
            return ((parameterData?.years?.[parameterData?.years?.length-1] + 1) || '').toString();
        }
        if (property === 'start-year') {
            return (parameterData?.years?.[0] || '').toString();
        }
        return '';
    });
</script>

<span>
    {output}
</span>