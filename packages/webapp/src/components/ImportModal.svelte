<script lang="ts">
  import { onMount } from 'svelte'
  import Console from 'console-tagger'
  import {
    addEventListener,
    removeEventListener,
  } from 'browser-extension-utils'
  import Modal from './Modal.svelte'
  import DatePicker from './ui/DatePicker.svelte'
  import { type BookmarksData } from '../types/bookmarks.js'
  import { validateBookmarksFile } from '../lib/bookmark-import-utils'
  import {
    mergeBookmarks,
    type MergeStrategy,
    type SyncOption,
  } from '../lib/bookmark-merge-utils.js'
  import { bookmarkStorage } from '../lib/bookmark-storage.js'
  import {
    mergeMetaOptions,
    mergeTagsOptions,
    type MergeMetaStrategy,
    type MergeTagsStrategy,
  } from '../config/merge-options'

  const console = new Console({
    prefix: 'import-modal',
    color: {
      line: 'white',
      background: 'blue',
    },
  })

  type ImportProgress = {
    current: number
    total: number
    stats: {
      newBookmarks: number
      newDomains: Set<string>
      newTags: Set<string>
    }
  }
  let { showImportModal = $bindable(false) } = $props()

  let currentStep = $state(1)
  let file: File | undefined = $state(undefined)
  let fileType: 'json' | 'html' = $state('json')
  let stats:
    | {
        total: number
        noCreated: number
        new: number
        conflicts: number
        data: any
      }
    | undefined = $state(undefined)
  let progress: ImportProgress | undefined = $state(undefined)
  let isDragging = $state(false)

  const mergeStrategy = $state({
    meta: 'merge' as MergeMetaStrategy,
    tags: 'union' as MergeTagsStrategy,
    // conflict: 'skip' as 'skip' | 'overwrite' | 'rename',
    defaultDate: new Date(2000, 0, 1).getTime(),
  })

  onMount(() => {
    console.log(`onMount`)
    return () => {
      console.log(`onDestroy`)
    }
  })

  $effect(() => {
    if (showImportModal) {
      addEventListener(document, 'dragover', handleDragOver as EventListener)
      addEventListener(document, 'dragleave', handleDragLeave)
      addEventListener(document, 'drop', handleDrop as EventListener, true)
    }
    return () => {
      removeEventListener(document, 'dragover', handleDragOver as EventListener)
      removeEventListener(document, 'dragleave', handleDragLeave)
      removeEventListener(document, 'drop', handleDrop as EventListener, true)

      removeEventListener(
        globalThis,
        'importProgressUpdated',
        importProgressUpdatedHandler as EventListener
      )
      removeEventListener(globalThis, 'importFinished', importFinishedHandler)
    }
  })

  // 文件拖放处理
  function handleDragOver(e: DragEvent) {
    e.preventDefault()
    isDragging = true
  }

  function handleDragLeave() {
    isDragging = false
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    isDragging = false
    if (e.dataTransfer?.files.length) {
      handleFileSelect({
        target: { files: e.dataTransfer.files },
      } as unknown as Event)
    }
  }

  async function validateAndCount(
    file: File,
    fileType: 'json' | 'html' = 'json'
  ) {
    try {
      const result = await validateBookmarksFile(file, fileType)
      return {
        total: result.total,
        noCreated: result.noCreated,
        new: result.new,
        conflicts: result.conflicts,
        data: result.data, // 添加验证后的数据
      }
    } catch (error) {
      console.error('验证失败:', error)
      throw error // 重新抛出错误以便上层处理
    }
  }

  function resetImport() {
    currentStep = 1
    file = undefined
    stats = undefined
    progress = undefined
  }

  async function handleFileSelect(e: Event) {
    const target = e.target as HTMLInputElement
    if (!target.files || target.files.length === 0) {
      alert('请选择一个文件')
      return
    }
    if (target.files.length > 1) {
      alert('不支持同时上传多个文件，请选择一个文件')
      return
    }
    const selectedFile = target.files[0]
    if (!selectedFile) return
    console.log('selectedFile', selectedFile)

    file = selectedFile
    const fileName = selectedFile.name.toLowerCase()
    // 自动检测文件类型
    if (fileName.endsWith('.json')) {
      fileType = 'json'
    } else if (fileName.endsWith('.html')) {
      fileType = 'html'
    } else {
      alert('不支持的文件类型')
      throw new Error('不支持的文件类型')
    }
    console.log('fileType', fileType)

    // 验证文件并统计
    try {
      const result = await validateAndCount(selectedFile, fileType)
      stats = result
      console.log('验证通过，统计结果:', result)
      currentStep = 2
    } catch (error: any) {
      // 处理验证错误
      alert(error.message as string)
      resetImport()
    }
  }

  async function startImport() {
    if (!stats || !stats.data) {
      alert('请先选择并验证文件')
      currentStep = 1
      return
    }
    currentStep = 3

    // 监听导入状态变化
    addEventListener(
      globalThis,
      'importProgressUpdated',
      importProgressUpdatedHandler as EventListener
    )
    addEventListener(globalThis, 'importFinished', importFinishedHandler)

    console.log(
      $state.snapshot(stats.data),
      fileType,
      $state.snapshot(mergeStrategy)
    )
    // 使用验证阶段获取的数据而不是原始文件
    // importData(stats.data, mergeStrategy)
    // Get local bookmarks data
    const localData = await bookmarkStorage.getBookmarksData()

    // Prepare parameters for mergeBookmarks
    const remoteData = $state.snapshot(stats.data.data) as BookmarksData

    // Define a default sync option for import
    const syncOption: SyncOption = {
      currentSyncTime: Date.now(),
      lastSyncTime: 0, // For import, lastSyncTime can be 0
    }

    // Define the merge strategy, ensuring it matches the expected type
    const currentMergeStrategy: MergeStrategy = {
      meta: mergeStrategy.meta, // Assuming mergeStrategy.meta is 'newer', 'local', or 'remote'
      tags: mergeStrategy.tags, // Assuming mergeStrategy.tags is 'merge', 'local', or 'remote'
      defaultDate: mergeStrategy.defaultDate,
      // Add other strategy options if needed, e.g.:
      // skipExisting: false,
      // updateOverDelete: true,
      // overwriteLocalDeleted: false,
    }

    try {
      // Call mergeBookmarks with progress callback
      const { updatesForLocal, localDeletions } = await mergeBookmarks(
        localData,
        remoteData,
        currentMergeStrategy,
        syncOption,
        (progress) => {
          // Update progress for merge operation
          console.log(
            `Import progress: ${progress.processedItems}/${progress.totalItems} items processed`
          )
          // You can dispatch a custom event here to update UI if needed
          globalThis.dispatchEvent(
            new CustomEvent('importProgressUpdated', {
              detail: {
                current: progress.processedItems,
                total: progress.totalItems,
              },
            })
          )
        }
      )

      if (localDeletions.length > 0) {
        // Delete bookmarks first
        await bookmarkStorage.deleteBookmarks(localDeletions)
      }
      // Update bookmarks
      await bookmarkStorage.upsertBookmarks(Object.entries(updatesForLocal))

      // Dispatch import finished event with stats (can be enhanced)
      const importFinishedEvent = new CustomEvent('importFinished', {
        detail: {
          // You might want to calculate more detailed stats from the 'merged' and 'deleted' data
          mergedCount: Object.keys(updatesForLocal).length,
          deletedCount: localDeletions.length,
        },
      })
      globalThis.dispatchEvent(importFinishedEvent)

      console.log('Import successful:', { updatesForLocal, localDeletions })
    } catch (error: any) {
      console.error('Error during import:', error)
      // Handle error, e.g., show a message to the user
      alert(`导入失败: ${error.message as string}`)
      // Reset to a previous step or allow retry
      currentStep = 2 // Or resetImport()
    }
  }

  // 监听导入状态变化
  const importProgressUpdatedHandler = (e: CustomEvent) => {
    progress = e.detail as ImportProgress
    console.log('importProgressUpdated', progress)
  }
  const importFinishedHandler = () => {
    removeEventListener(
      globalThis,
      'importProgressUpdated',
      importProgressUpdatedHandler as EventListener
    )
    removeEventListener(globalThis, 'importFinished', importFinishedHandler)
    console.log('importFinished')

    // progress = {
    //   current: 0,
    //   total: 0,
    //   stats: {
    //     newBookmarks: 0,
    //     newDomains: new Set(),
    //     newTags: new Set(),
    //   },
    // }
  }
</script>

<Modal
  title="导入书签"
  bind:isOpen={showImportModal}
  showCancel={currentStep < 3}
  showConfirm={currentStep === 3}
  onClose={resetImport}
  confirmText={currentStep === 3 ? '完成' : '取消'}
  onConfirm={() => {
    resetImport()
    showImportModal = false
  }}>
  <div class="step-indicator mb-6 flex justify-center gap-2">
    {#each [1, 2, 3] as step}
      <div
        class={`h-3 w-3 rounded-full ${currentStep === step ? 'bg-blue-500' : 'bg-gray-300'}`}
        aria-label={`步骤 ${step}`}>
      </div>
    {/each}
  </div>

  {#if currentStep === 1}
    <div class="import-step-1 text-center">
      <div
        class={`drop-zone ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
        onclick={(e: MouseEvent) => {
          const target = e.target as HTMLElement
          if (!target.closest('.import-step-1 label')) {
            document.getElementById('fileInput')?.click()
          }
        }}
        ondragover={handleDragOver}
        ondragleave={handleDragLeave}
        ondrop={handleDrop}>
        <svg
          class="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p class="mt-2">拖放文件到这里或</p>
        <label
          class="mt-4 inline-block cursor-pointer rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:bg-blue-600 dark:hover:bg-blue-700">
          选择文件
          <input
            id="fileInput"
            type="file"
            class="hidden"
            accept=".json,.html"
            onchange={handleFileSelect} />
        </label>
        <p class="mt-2 text-sm text-gray-500">
          支持JSON格式或浏览器导出的HTML书签文件
        </p>
      </div>
    </div>
  {:else if currentStep === 2 && !!stats}
    <div class="import-step-2">
      <div class="stats-card dark:border-gray-700 dark:bg-gray-800">
        <h3 class="text-lg font-medium dark:text-gray-200">导入摘要</h3>
        <div class="stats-grid">
          <div class="dark:text-gray-200">
            <span class="stat-value dark:text-white">{stats.total}</span>
            <span class="stat-label dark:text-gray-400">总书签数</span>
          </div>
          <div class="dark:text-gray-200">
            <span class="stat-value dark:text-white">{stats.new}</span>
            <span class="stat-label dark:text-gray-400">新增书签</span>
          </div>
          <div class="dark:text-gray-200">
            <span class="stat-value dark:text-white">{stats.conflicts}</span>
            <span class="stat-label dark:text-gray-400">冲突书签</span>
          </div>
          {#if stats.noCreated > 0}
            <div class="dark:text-gray-200">
              <span class="stat-value dark:text-white">{stats.noCreated}</span>
              <span class="stat-label dark:text-gray-400">无创建日期</span>
            </div>
          {/if}
        </div>

        {#if stats.noCreated > 0}
          <div class="mt-4 rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800">
            <p class="font-medium">
              发现 {stats.noCreated} 个书签缺少创建日期。请为这些书签设置默认创建日期。
            </p>
            <p class="mt-1">
              创建日期影响书签排序和合并结果，请尽可能填写较早的日期
            </p>
            <div class="mt-2">
              <DatePicker
                bind:value={mergeStrategy.defaultDate}
                max={new Date().toISOString().split('T')[0]}
                classNames="rounded border px-2 py-1">
                默认创建日期:
              </DatePicker>
            </div>
          </div>
        {/if}
      </div>

      <div class="strategy-options mt-6">
        <table class="w-full border-collapse">
          <thead>
            <tr class="border-b border-gray-200">
              <th class="px-4 py-2 text-left">选项类型</th>
              <th class="px-4 py-2 text-left">处理方式</th>
            </tr>
          </thead>
          <tbody>
            <tr class="border-b border-gray-200">
              <td class="px-4 py-3 font-medium">书签字段处理</td>
              <td class="px-4 py-3">
                <div class="flex flex-wrap gap-4">
                  {#each mergeMetaOptions as option}
                    <label class="inline-flex items-center">
                      <input
                        type="radio"
                        class="mr-2"
                        bind:group={mergeStrategy.meta}
                        value={option.value} />
                      <span>{option.label}</span>
                    </label>
                  {/each}
                </div>
              </td>
            </tr>
            <tr class="border-b border-gray-200">
              <td class="px-4 py-3 font-medium">标签处理</td>
              <td class="px-4 py-3">
                <div class="flex flex-wrap gap-4">
                  {#each mergeTagsOptions as option}
                    <label class="inline-flex items-center">
                      <input
                        type="radio"
                        class="mr-2"
                        bind:group={mergeStrategy.tags}
                        value={option.value} />
                      <span>{option.label}</span>
                    </label>
                  {/each}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <button
        class="mt-8 w-full rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-700"
        onclick={startImport}>
        开始导入
      </button>
    </div>
  {:else}
    <div class="import-step-3">
      <h3 class="mb-4 text-lg font-medium">导入进度</h3>

      {#if progress}
        <div class="progress-bar-container">
          <progress
            value={progress?.current || 0}
            max={progress?.total || 100}
            class="h-2 w-full rounded-full">
          </progress>
          <div class="progress-text">
            {Math.round(
              ((progress?.current || 0) / (progress?.total || 100)) * 100
            )}%
          </div>
        </div>

        {#if progress?.stats}
          <div class="stats-grid mt-6">
            <div>
              <span class="stat-value"
                >{progress?.current || 0}/{progress?.total || 0}</span>
              <span class="stat-label">已处理</span>
            </div>
            <div>
              <span class="stat-value"
                >{progress?.stats?.newBookmarks || 0}</span>
              <span class="stat-label">新增书签</span>
            </div>
            <div>
              <span class="stat-value"
                >{progress?.stats?.newTags?.size || 0}</span>
              <span class="stat-label">新增标签</span>
            </div>
            <div>
              <span class="stat-value"
                >{progress?.stats?.newDomains?.size || 0}</span>
              <span class="stat-label">新增域名</span>
            </div>
          </div>
        {/if}
      {:else}
        <div class="rounded-lg bg-gray-100 p-4 text-center text-gray-600">
          正在准备导入数据...
        </div>
      {/if}

      <div class="mt-6 rounded-lg bg-blue-50 p-4">
        <h4 class="font-medium text-blue-800">导入完成后将自动刷新书签列表</h4>
        <p class="mt-1 text-sm text-blue-600">
          您可以在导入完成后查看详细统计信息
        </p>
      </div>
    </div>
  {/if}
</Modal>

<style lang="postcss">
  @reference "tailwindcss";
  .drop-zone {
    @apply rounded-lg border-2 border-dashed p-8 transition-colors;
  }

  .stats-grid {
    @apply grid grid-cols-2 gap-4 md:grid-cols-4;
  }

  .stat-value {
    @apply text-2xl font-bold text-gray-900 dark:text-white;
  }

  .stat-label {
    @apply text-sm text-gray-500 dark:text-gray-400;
  }

  .radio-group {
    @apply mt-2 space-y-2;
  }

  .radio-option {
    @apply flex items-center space-x-2 rounded p-2 hover:bg-gray-100 dark:hover:bg-gray-700;
  }

  progress {
    &::-webkit-progress-bar {
      @apply rounded-full bg-gray-200;
    }
    &::-webkit-progress-value {
      @apply rounded-full bg-blue-500;
    }
  }

  .stats-card {
    @apply rounded-lg border border-gray-200 p-4 dark:border-gray-700 dark:bg-gray-800;
  }
</style>
