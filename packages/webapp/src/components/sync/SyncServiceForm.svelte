<script lang="ts">
  import { onMount } from 'svelte'
  import Modal from '../Modal.svelte'
  import {
    addSyncService,
    updateSyncService,
  } from '../../stores/sync-config-store.js'

  import InputField from '../ui/InputField.svelte'
  import DatePicker from '../ui/DatePicker.svelte'
  import Switch from '../Switch.svelte'
  import type { SyncServiceConfig } from '../../sync/types.js'
  import type { MergeStrategy } from '../../lib/bookmark-merge-utils.js'
  import {
    mergeMetaOptions,
    mergeTagsOptions,
  } from '../../config/merge-options.js'

  type FormConfig = Omit<SyncServiceConfig, 'mergeStrategy'> & {
    mergeStrategy: MergeStrategy
  }

  let { showForm = $bindable(), service = null } = $props<{
    showForm: boolean
    service?: SyncServiceConfig | null
  }>()

  let config = $state<FormConfig>({
    id: '',
    name: '',
    type: 'github',
    enabled: true,
    autoSyncEnabled: true,
    autoSyncOnChanges: true,
    autoSyncInterval: 15,
    autoSyncDelayOnChanges: 1,
    scope: 'all',
    credentials: {
      username: '',
      password: '',
      token: '',
      apiKey: '',
    },
    target: {
      url: '',
      repo: '',
      path: '',
      branch: '',
      authTestEndpoint: '',
    },
    mergeStrategy: {
      meta: 'merge',
      tags: 'union',
      defaultDate: 0,
      preferOldestCreated: true,
      preferNewestUpdated: true,
    },
  })

  onMount(() => {
    if (service) {
      config.id = service.id
      config.name = service.name
      config.type = service.type
      config.enabled = service.enabled
      config.autoSyncEnabled = service.autoSyncEnabled
      config.autoSyncInterval = service.autoSyncInterval
      config.autoSyncOnChanges = service.autoSyncOnChanges
      config.autoSyncDelayOnChanges = service.autoSyncDelayOnChanges
      if (service.credentials) {
        config.credentials = { ...config.credentials, ...service.credentials }
      }
      if (service.target) {
        config.target = { ...config.target, ...service.target }
      }
      if (service.mergeStrategy) {
        config.mergeStrategy = {
          ...config.mergeStrategy,
          ...service.mergeStrategy,
        }
      }
    } else {
      config.id = crypto.randomUUID()
    }
  })

  // Validation error state
  let validationErrors = $state<string[]>([])

  /**
   * Validates the form configuration before submission
   * @returns Array of validation error messages
   */
  function validateForm(): string[] {
    const errors: string[] = []

    // Validate service name (required)
    if (!config.name || config.name.trim().length === 0) {
      errors.push('Service name is required')
    } else if (config.name.trim().length > 100) {
      errors.push('Service name must be less than 100 characters')
    }

    // Validate auto sync interval (must be positive number)
    if (config.autoSyncInterval !== undefined) {
      if (config.autoSyncInterval <= 0) {
        errors.push('Auto sync interval must be greater than 0 minutes')
      } else if (config.autoSyncInterval > 1440) {
        errors.push(
          'Auto sync interval must be less than 1440 minutes (24 hours)'
        )
      }
    }

    // Validate auto sync delay (must be positive number)
    if (config.autoSyncDelayOnChanges !== undefined) {
      if (config.autoSyncDelayOnChanges <= 0) {
        errors.push('Auto sync delay must be greater than 0 minutes')
      } else if (config.autoSyncDelayOnChanges > 60) {
        errors.push('Auto sync delay must be less than 60 minutes')
      }
    }

    // Validate merge strategy default date format (if provided)
    if (config.mergeStrategy.defaultDate) {
      const dateValue = new Date(config.mergeStrategy.defaultDate)
      if (isNaN(dateValue.getTime())) {
        errors.push('Default date must be a valid date')
      } else if (dateValue > new Date()) {
        errors.push('Default date cannot be in the future')
      }
    }

    // Type-specific validation
    switch (config.type) {
      case 'github':
        if (
          !config.credentials.token ||
          config.credentials.token.trim().length === 0
        ) {
          errors.push('GitHub token is required')
        }
        if (!config.target.repo || config.target.repo.trim().length === 0) {
          errors.push('Repository name is required')
        } else if (!/^[\w.-]+\/[\w.-]+$/.test(config.target.repo.trim())) {
          errors.push('Repository name must be in format "owner/repo"')
        }
        // Path and branch are optional for GitHub, no validation needed
        break

      case 'webdav':
        if (
          !config.credentials.username ||
          config.credentials.username.trim().length === 0
        ) {
          errors.push('WebDAV username is required')
        }
        if (
          !config.credentials.password ||
          config.credentials.password.trim().length === 0
        ) {
          errors.push('WebDAV password is required')
        }
        if (!config.target.url || config.target.url.trim().length === 0) {
          errors.push('WebDAV URL is required')
        } else {
          try {
            const url = new URL(config.target.url.trim())
            if (!['http:', 'https:'].includes(url.protocol)) {
              errors.push('WebDAV URL must use HTTP or HTTPS protocol')
            }
          } catch {
            errors.push('WebDAV URL must be a valid URL')
          }
        }
        // Path is optional for WebDAV, no validation needed
        break

      case 'customApi':
        if (!config.credentials.token && !config.credentials.apiKey) {
          errors.push('Either token or API key is required for custom API')
        }
        if (!config.target.url || config.target.url.trim().length === 0) {
          errors.push('API base URL is required')
        } else {
          try {
            const url = new URL(config.target.url.trim())
            if (!['http:', 'https:'].includes(url.protocol)) {
              errors.push('API URL must use HTTP or HTTPS protocol')
            }
          } catch {
            errors.push('API URL must be a valid URL')
          }
        }
        // Path is optional for Custom API, no validation needed
        break

      case 'browserExtension':
        // Browser extension doesn't require additional validation
        break

      default:
        errors.push('Invalid service type selected')
        break
    }

    return errors
  }

  function handleSubmit() {
    // Clear previous validation errors
    validationErrors = []

    // Validate form
    const errors = validateForm()
    if (errors.length > 0) {
      validationErrors = errors
      return
    }

    let serviceToSave: SyncServiceConfig

    const baseConfig = {
      id: config.id,
      name: config.name.trim(),
      type: config.type,
      enabled: config.enabled,
      autoSyncEnabled: config.autoSyncEnabled,
      autoSyncOnChanges: config.autoSyncOnChanges,
      autoSyncInterval: config.autoSyncInterval,
      autoSyncDelayOnChanges: config.autoSyncDelayOnChanges,
      scope: config.scope,
      mergeStrategy: {
        ...config.mergeStrategy,
        defaultDate: config.mergeStrategy.defaultDate || 0,
      },
    }

    switch (config.type) {
      case 'github':
        serviceToSave = {
          ...baseConfig,
          type: 'github',
          credentials: {
            token: config.credentials.token?.trim() || '',
          },
          target: {
            repo: config.target.repo?.trim() || '',
            path: config.target.path?.trim() || '',
            branch: config.target.branch?.trim() || '',
          },
        }
        break
      case 'webdav':
        serviceToSave = {
          ...baseConfig,
          type: 'webdav',
          credentials: {
            username: config.credentials.username?.trim() || '',
            password: config.credentials.password?.trim() || '',
          },
          target: {
            url: config.target.url?.trim() || '',
            path: config.target.path?.trim() || '',
          },
        }
        break
      case 'customApi':
        serviceToSave = {
          ...baseConfig,
          type: 'customApi',
          credentials: {
            token: config.credentials.token?.trim() || '',
            apiKey: config.credentials.apiKey?.trim() || '',
          },
          target: {
            url: config.target.url?.trim() || '',
            path: config.target.path?.trim() || '',
            authTestEndpoint: config.target.authTestEndpoint?.trim() || '',
          },
        }
        break
      case 'browserExtension':
        serviceToSave = {
          ...baseConfig,
          type: 'browserExtension',
          credentials: service ? service.credentials : {},
          target: service ? service.target : {},
        }
        break
      default:
        // Should not happen
        return
    }

    if (service) {
      // Preserve sync metadata when updating service
      serviceToSave = {
        ...serviceToSave,
        lastSyncTimestamp: service.lastSyncTimestamp,
        lastDataChangeTimestamp: service.lastDataChangeTimestamp,
        lastSyncLocalDataHash: service.lastSyncLocalDataHash,
        lastSyncMeta: service.lastSyncMeta,
      }
      updateSyncService(serviceToSave)
    } else {
      addSyncService(serviceToSave)
    }
    showForm = false
  }

  /**
   * Clears validation errors when user starts editing
   */
  function clearValidationErrors() {
    if (validationErrors.length > 0) {
      validationErrors = []
    }
  }

  function onInputEnter() {
    handleSubmit()
  }
</script>

<Modal
  bind:isOpen={showForm}
  title={service ? 'Edit Sync Service' : 'Add Sync Service'}
  onConfirm={handleSubmit}
  {onInputEnter}>
  <div class="space-y-4 p-1">
    <!-- Validation Errors Display -->
    {#if validationErrors.length > 0}
      <div class="rounded-md bg-red-50 p-4 dark:bg-red-900/20">
        <div class="flex">
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800 dark:text-red-200">
              Please fix the following errors:
            </h3>
            <div class="mt-2 text-sm text-red-700 dark:text-red-300">
              <ul class="list-disc space-y-1 pl-5">
                {#each validationErrors as error}
                  <li>{error}</li>
                {/each}
              </ul>
            </div>
          </div>
        </div>
      </div>
    {/if}
    <div
      class="flex items-center justify-between border-b border-gray-200 pb-4 dark:border-gray-700">
      <span class="text-sm font-medium text-gray-700 dark:text-gray-300"
        >Service Status</span>
      <Switch bind:checked={config.enabled} />
    </div>

    <InputField
      bind:value={config.name}
      placeholder="My Sync Service"
      onInput={clearValidationErrors}>
      Service Name:
    </InputField>

    <div class="space-y-3">
      <h3 class="text-lg font-medium text-gray-900 dark:text-white">
        Sync Server Information
      </h3>
      <label
        for="service-type"
        class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
        >Service Type:</label>
      <select
        id="service-type"
        bind:value={config.type}
        disabled={!!service}
        class="mt-1 block w-full rounded-md border-gray-300 py-2 pr-10 pl-3 text-base focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
        <option value="github">GitHub</option>
        <option value="webdav">WebDAV</option>
        {#if service?.type === 'customApi'}
          <option value="customApi" selected>Custom API</option>
        {/if}
        {#if service?.type === 'browserExtension'}
          <option value="browserExtension" selected>Browser Extension</option>
        {/if}
        <!-- <option value="customApi">Custom API</option>
        <option value="browserExtension">Browser Extension</option> -->
      </select>
      {#if config.type === 'webdav'}
        <InputField
          bind:value={config.target.url}
          placeholder="https://example.com/dav"
          onInput={clearValidationErrors}>
          WebDAV URL:
        </InputField>
        <InputField
          bind:value={config.target.path}
          placeholder="utags/bookmarks.json"
          onInput={clearValidationErrors}>
          Path:
        </InputField>
        <InputField
          bind:value={config.credentials.username}
          placeholder="Username"
          onInput={clearValidationErrors}>
          Username:
        </InputField>
        <InputField
          type="password"
          bind:value={config.credentials.password}
          placeholder="Password"
          onInput={clearValidationErrors}>
          Password:
        </InputField>
      {/if}

      {#if config.type === 'github'}
        <InputField
          bind:value={config.target.repo}
          placeholder="owner/repo"
          onInput={clearValidationErrors}>
          Repository Name:
        </InputField>
        <InputField
          bind:value={config.target.path}
          placeholder="utags/bookmarks.json"
          onInput={clearValidationErrors}>
          File Path:
        </InputField>
        <InputField
          bind:value={config.target.branch}
          placeholder="main"
          onInput={clearValidationErrors}>
          Branch:
        </InputField>
        <InputField
          type="password"
          bind:value={config.credentials.token}
          placeholder="GitHub Personal Access Token"
          onInput={clearValidationErrors}>
          Token:
        </InputField>
      {/if}

      {#if config.type === 'customApi'}
        <InputField
          bind:value={config.target.url}
          placeholder="https://api.example.com/v1"
          onInput={clearValidationErrors}>
          API Base URL:
        </InputField>
        <InputField
          bind:value={config.target.path}
          placeholder="utags-bookmarks.json"
          onInput={clearValidationErrors}>
          Path:
        </InputField>
        <InputField
          bind:value={config.target.authTestEndpoint}
          placeholder="auth/status"
          onInput={clearValidationErrors}>
          Auth Test Endpoint:
        </InputField>
        <InputField
          type="password"
          bind:value={config.credentials.token}
          placeholder="Bearer Token"
          onInput={clearValidationErrors}>
          Token:
        </InputField>
        <InputField
          type="password"
          bind:value={config.credentials.apiKey}
          placeholder="API Key"
          onInput={clearValidationErrors}>
          API Key:
        </InputField>
      {/if}
    </div>
    <div class="space-y-3 border-t border-gray-200 pt-4 dark:border-gray-700">
      <h3 class="text-lg font-medium text-gray-900 dark:text-white">
        Auto-sync Behavior
      </h3>
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300"
          >Auto Sync Enabled</span>
        <Switch bind:checked={config.autoSyncEnabled} />
      </div>

      <InputField
        type="number"
        bind:value={config.autoSyncInterval}
        onInput={clearValidationErrors}>
        Auto-sync Interval (minutes):
      </InputField>

      <div class="flex items-center justify-between">
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300"
          >Auto-sync on changes</span>
        <Switch bind:checked={config.autoSyncOnChanges} />
      </div>
      <InputField
        type="number"
        bind:value={config.autoSyncDelayOnChanges}
        onInput={clearValidationErrors}>
        Auto-sync Delay on Changes (minutes):
      </InputField>
    </div>

    <div class="space-y-3 border-t border-gray-200 pt-4 dark:border-gray-700">
      <h3 class="text-lg font-medium text-gray-900 dark:text-white">
        Merge Strategy
      </h3>
      <div>
        <label
          for="meta-strategy"
          class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >Metadata Merge Strategy:</label>
        <select
          id="meta-strategy"
          bind:value={config.mergeStrategy.meta}
          class="mt-1 block w-full rounded-md border-gray-300 py-2 pr-10 pl-3 text-base focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
          {#each mergeMetaOptions as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </div>
      <div>
        <label
          for="tags-strategy"
          class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >Tags Merge Strategy:</label>
        <select
          id="tags-strategy"
          bind:value={config.mergeStrategy.tags}
          class="mt-1 block w-full rounded-md border-gray-300 py-2 pr-10 pl-3 text-base focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
          {#each mergeTagsOptions as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </div>
      <DatePicker
        bind:value={config.mergeStrategy.defaultDate}
        onInput={clearValidationErrors}>
        Default Date for Invalid Timestamps:
      </DatePicker>
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300"
          >Prefer Oldest Created Timestamp</span>
        <Switch bind:checked={config.mergeStrategy.preferOldestCreated} />
      </div>
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300"
          >Prefer Newest Updated Timestamp</span>
        <Switch bind:checked={config.mergeStrategy.preferNewestUpdated} />
      </div>
    </div>
  </div>
</Modal>
