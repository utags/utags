<script lang="ts">
  export let show = true
  export let id = ''
  export let value: string | number = ''
  export let type = 'text'
  export let placeholder = ''
  export let disabled = false
  export let error = ''
  export let classNames = ''
  export let onBlur = () => {}
  export let onInput = () => {}
  export let onKeydown = () => {}
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
        on:blur={onBlur}
        on:input={onInput}
        on:keydown={onKeydown}
        class="input-element {classNames} {error ? 'error-state' : ''}"
        rows="3"></textarea>
    {:else}
      <input
        {id}
        {type}
        bind:value
        {placeholder}
        {disabled}
        on:blur={onBlur}
        on:input={onInput}
        on:keydown={onKeydown}
        class="input-element {classNames} {error ? 'error-state' : ''}" />
    {/if}

    {#if error}
      <div class="error-message">
        {error}
      </div>
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

    &.error-state {
      @apply border-red-500 ring-red-200 focus:border-red-500;
    }
  }

  .error-message {
    @apply mt-1 text-sm whitespace-pre-wrap text-red-500 dark:text-red-400;
  }
</style>
