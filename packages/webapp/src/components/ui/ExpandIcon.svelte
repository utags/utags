<script lang="ts">
  import { ChevronRight } from 'lucide-svelte'
  export let expanded: boolean = false
  export let show: boolean = true
  export let animate: boolean = true
</script>

<span class="h-4 w-4">
  {#if show}
    <ChevronRight
      size={16}
      class="{animate ? 'ease transition-transform duration-200' : ''} {expanded
        ? 'rotate-90'
        : 'rotate-0'}" />
  {/if}
</span>
