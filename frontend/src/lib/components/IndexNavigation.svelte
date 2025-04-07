<script lang="ts">
    let {index, handleAnchorClick} = $props();

</script>

<section class="mb-6">
    <h3 class="pb-2 font-bold text-lg text-gray-800">Navigera</h3>
    <ul>
        {#each index as item}
            <li>
                <a href={"#" + item.id} class="group relative flex items-center pl-4 py-1 text-gray-700" onclick={handleAnchorClick}>
                    <span class="absolute left-0 h-[90%] w-px bg-slate-500 transition-all duration-300 opacity-50 group-hover:w-1"></span>
                    {item.text}
                </a>
            </li>
        {/each}
    </ul>
</section>
