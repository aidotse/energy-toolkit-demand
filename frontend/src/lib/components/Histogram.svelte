<script lang="ts">
    import { BarChart } from 'layerchart';

    let { histogramData } = $props();

</script>

<div class="h-[300px] ml-8 mb-14 mr-2 mt-1">
    <BarChart
        data={histogramData}
        x="x0"
        y="length"
        bandPadding={0.2}
        props={{
        xAxis: { tweened: true },
        yAxis: { format: "metric", tweened: true },
        bars: {tweened: true, radius: 2, stroke: 'none' },
        }}    
    />
</div>