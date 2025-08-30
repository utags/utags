<script>
  import BookmarkIcon from './svg/BookmarkIcon.svelte'
  import TagIcon from './svg/TagIcon.svelte'
  import DomainIcon from './svg/DomainIcon.svelte'

  let { bookmarksCount = 0, tagsCount = 0, domainsCount = 0 } = $props()
</script>

<div class="flex items-center gap-3 text-sm">
  <span class="flex items-center gap-1 text-blue-500">
    <BookmarkIcon />
    <span class="font-medium text-gray-700 dark:text-gray-300"
      >{bookmarksCount}</span>
  </span>
  <span class="text-gray-300 dark:text-gray-600">|</span>
  <span class="flex items-center gap-1 text-green-500">
    <TagIcon />
    <span class="font-medium text-gray-700 dark:text-gray-300"
      >{tagsCount}</span>
  </span>
  <span class="text-gray-300 dark:text-gray-600">|</span>
  <span class="flex items-center gap-1 text-purple-500">
    <DomainIcon />
    <span class="font-medium text-gray-700 dark:text-gray-300"
      >{domainsCount}</span>
  </span>
</div>
