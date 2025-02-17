<script lang="ts">
    import { PieChart, Text } from 'layerchart';
    import { formatNumber } from '$lib/utilities';

    let { sectorData } = $props();

</script>

<div class="h-[300px] p-4">
    <PieChart 
        data={sectorData}
        key="sector"
        value="value"
        innerRadius={-20}
        cornerRadius={2}
        padAngle={0.02}
        legend={{ placement: "top-left", orientation: "vertical" }}
    >
        <svelte:fragment slot="aboveMarks">
            <Text
            value={formatNumber(sectorData.reduce((sum, item) => sum + item.value, 0),"M","Wh")}
            textAnchor="middle"
            verticalAnchor="middle"
            class="text-4xl"
            dy={4}
            />
            <Text
            value="total"
            textAnchor="middle"
            verticalAnchor="middle"
            class="text-sm fill-surface-content/50"
            dy={26}
            />
        </svelte:fragment>  
    </PieChart>
</div>