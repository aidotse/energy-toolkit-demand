<script lang="ts">
    let {parameterData, property} = $props();

    const output: string = property === 'end-year'
        ? ((parameterData?.years?.[parameterData?.years?.length-1] + 1) || '').toString()
        : property === 'start-year'
        ? (parameterData?.years?.[0] || '').toString()
        : '';
</script>

<span>
    {output}
</span>