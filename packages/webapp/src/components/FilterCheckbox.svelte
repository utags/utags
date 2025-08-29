<script>
  let { value, checked, count, onchange } = $props()
</script>

<label
  title={value}
  data-key={value}
  data-checked={checked ? '' : null}
  class="flex flex-none items-center gap-2 truncate rounded-md px-1 py-1 text-sm text-gray-700 select-none hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800 {checked
    ? 'bg-blue-50 dark:bg-gray-700/60'
    : ''}">
  <input type="checkbox" class="peer hidden" {checked} {onchange} />
  <div
    class="relative h-3.25 w-3.25 shrink-0 rounded-xs border border-gray-300 bg-white peer-checked:border-blue-500 peer-checked:text-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:peer-checked:border-blue-400 dark:peer-checked:text-blue-400">
    {#if checked}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        class="absolute -top-[6px] h-4 w-4 text-current"
        fill="currentColor"
        stroke="currentColor">
        <path
          d="M1652.041,6454.475h5.26l-.707-11.549"
          transform="translate(3397.248 -5722.55) rotate(45)"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2" />
      </svg>
    {/if}
  </div>
  <span class="flex-1 truncate">{value}</span>
  <span class="ml-auto text-xs font-medium text-gray-400">{count}</span>
</label>
