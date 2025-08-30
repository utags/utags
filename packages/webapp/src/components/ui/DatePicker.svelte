<script lang="ts">
  import { type Snippet } from 'svelte'
  /**
   * DatePicker component for selecting dates and times
   * Provides a clean interface for datetime input with proper validation
   * Supports date, time (hours, minutes, seconds) selection
   */

  // Props
  interface Props {
    show?: boolean
    id?: string
    value?: string | number
    disabled?: boolean
    error?: string
    classNames?: string
    min?: string
    max?: string
    placeholder?: string
    onInput?: () => void
    children?: Snippet
  }

  let {
    show = true,
    id = '',
    value = $bindable(''),
    disabled = false,
    error = '',
    classNames = '',
    min = '',
    max = '',
    placeholder = 'Select a date and time',
    onInput = () => {},
    children,
  }: Props = $props()

  /**
   * Convert timestamp to datetime-local format (yyyy-MM-ddThh:mm)
   * @param timestamp - Unix timestamp in milliseconds
   * @returns Formatted datetime string for datetime-local input
   */
  function formatTimestampToDatetimeLocal(timestamp: number): string {
    if (!timestamp || isNaN(timestamp)) {
      return ''
    }
    const date = new Date(timestamp)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  // Convert value to string for date input and handle two-way binding
  let dateValue = $state(
    typeof value === 'number'
      ? formatTimestampToDatetimeLocal(value)
      : value || ''
  )

  // Sync external value changes to internal dateValue
  $effect(() => {
    dateValue =
      typeof value === 'number'
        ? formatTimestampToDatetimeLocal(value)
        : value || ''
  })

  /**
   * Handle datetime input change
   * Ensures the value is properly formatted and synced back to parent
   */
  function handleDateTimeChange(event: Event) {
    const target = event.target as HTMLInputElement
    dateValue = target.value
    value =
      typeof value === 'number'
        ? new Date(target.value).getTime()
        : target.value
    onInput() // Call the onInput callback
  }
</script>

{#if show}
  <div class="date-picker-container">
    <label for={id} class="date-picker-label">
      {#if children}
        {@render children()}
      {/if}
    </label>

    <input
      {id}
      type="datetime-local"
      bind:value={dateValue}
      {disabled}
      {min}
      {max}
      {placeholder}
      step="1"
      onchange={handleDateTimeChange}
      class="date-picker-input {classNames} {error ? 'error-state' : ''}" />

    {#if error}
      <div class="error-message">
        {error}
      </div>
    {/if}
  </div>
{/if}

<style lang="postcss">
  @reference "../../tailwind.css";

  .date-picker-container {
    @apply base-input-field-container;
  }

  .date-picker-label {
    @apply base-input-label;
  }

  .date-picker-input {
    @apply base-input-element;
    @apply cursor-pointer;

    &:disabled {
      @apply cursor-not-allowed opacity-50;
    }

    &.error-state {
      @apply border-red-500 ring-red-200 focus:border-red-500;
    }

    /* Custom styling for datetime input */
    &::-webkit-calendar-picker-indicator {
      @apply cursor-pointer opacity-70 hover:opacity-100;
    }

    /* Dark mode support for calendar icon */
    :global(.dark) &::-webkit-calendar-picker-indicator {
      filter: invert(1);
    }

    /* Ensure proper width for datetime-local input */
    &[type='datetime-local'] {
      @apply min-w-0;
    }
  }

  .error-message {
    @apply mt-1 text-sm whitespace-pre-wrap text-red-500 dark:text-red-400;
  }
</style>
