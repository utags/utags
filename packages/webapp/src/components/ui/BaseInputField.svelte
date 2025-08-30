<script lang="ts">
  export let show: boolean = true
  export let id: string
  export let value: string
  export let placeholder = ''
  export let disabled = false
  export let type = 'text'
  export let rows = 3
  export let classNames = ''
  export let onBlur: (e: Event) => void = () => {}
  export let onInput: (e: Event) => void = () => {}
  export let onKeydown: (e: KeyboardEvent) => void = () => {}
</script>

{#if show}
  <div class="input-field-container">
    <label for={id} class="input-label">
      <slot />
    </label>

    {#if type === 'textarea'}
      <textarea
        {id}
        bind:value
        {placeholder}
        {disabled}
        {rows}
        on:blur={onBlur}
        on:input={onInput}
        on:keydown={onKeydown}
        class="input-element {classNames}">
      </textarea>
    {:else}
      <input
        {type}
        {id}
        bind:value
        {placeholder}
        {disabled}
        on:blur={onBlur}
        on:input={onInput}
        on:keydown={onKeydown}
        class="input-element {classNames}" />
    {/if}
  </div>
{/if}

<style lang="postcss">
  @reference "../../tailwind.css";

  .input-field-container {
    @apply base-input-field-container;
  }

  .input-label {
    @apply base-input-label;
  }

  .input-element {
    @apply base-input-element;
  }
</style>
