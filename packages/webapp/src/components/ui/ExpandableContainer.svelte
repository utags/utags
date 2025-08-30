<script lang="ts">
  import { slide } from 'svelte/transition'
  import { cubicOut } from 'svelte/easing'
  let { expanded = true, keepElement = false, axis = 'y' } = $props()
</script>

{#if keepElement}
  <div
    class="transition-all duration-200 ease-in-out {axis === 'x'
      ? 'axis-x'
      : 'axis-y'}"
    class:collapsed={!expanded}>
    <slot />
  </div>
{:else if expanded}
  <div transition:slide={{ duration: 200, delay: 0, easing: cubicOut }}>
    <slot />
  </div>
{/if}

<style>
  /* FIXME: 需设定高度，才能有动画效果。目前不可用 */
  .axis-y {
    overflow-y: hidden;
    height: 100px;
  }
  .collapsed.axis-y {
    height: 0;
    min-height: 0;
    padding-bottom: 0;
  }
  .collapsed.axis-x {
    width: 0;
    min-width: 0;
    padding-right: 0;
  }
</style>
