import { type Writable, writable, get } from 'svelte/store'
import { STORAGE_KEY_SYNC_SETTINGS } from '../config/constants.js'
import type {
  SyncServiceConfig,
  GithubCredentials,
  GithubTarget,
  WebDAVCredentials,
  WebDAVTarget,
  ApiCredentials,
  ApiTarget,
  BrowserExtensionCredentials,
  BrowserExtensionTarget,
} from '../sync/types.js'

// Define a type for all possible credential types
export type CredentialsType =
  | GithubCredentials
  | WebDAVCredentials
  | ApiCredentials

// Define a type for all possible target types
export type TargetType = GithubTarget | WebDAVTarget | ApiTarget

// Define the structure for sync service configurations
export type SyncSettings = {
  syncServices: SyncServiceConfig[]
  activeSyncServiceId: string | undefined // ID of the currently active sync service
}

// Default sync settings
const defaultSyncSettings: SyncSettings = {
  syncServices: [],
  activeSyncServiceId: undefined,
}

const validTypes = new Set([
  'github',
  'webdav',
  'customApi',
  'browserExtension',
])

function isValidType(type: string | undefined): boolean {
  return validTypes.has(type!)
}

// Function to load sync settings from localStorage
function loadSyncSettings(): SyncSettings {
  if (typeof localStorage !== 'undefined') {
    const savedSettings = localStorage.getItem(STORAGE_KEY_SYNC_SETTINGS)
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings) as SyncSettings
        // Ensure syncServices is always an array and contains valid services
        if (!Array.isArray(parsed.syncServices)) {
          return structuredClone(defaultSyncSettings)
        }

        // Filter out invalid or corrupted services
        const validServices = parsed.syncServices.filter(
          (service): service is SyncServiceConfig => {
            return (
              service &&
              typeof service === 'object' &&
              'id' in service &&
              'type' in service &&
              isValidType(service.type) &&
              'target' in service &&
              'credentials' in service
            )
          }
        )
        parsed.syncServices = validServices

        // Reset activeSyncServiceId if the active service was filtered out
        if (
          parsed.activeSyncServiceId &&
          !validServices.some((s) => s.id === parsed.activeSyncServiceId)
        ) {
          parsed.activeSyncServiceId = undefined
        }

        return { ...defaultSyncSettings, ...parsed }
      } catch (error) {
        console.error('Error parsing sync settings from localStorage:', error)
        return defaultSyncSettings
      }
    }
  }

  return defaultSyncSettings
}

// Create a writable store for sync settings
export const syncConfigStore: Writable<SyncSettings> =
  writable<SyncSettings>(loadSyncSettings())

// Subscribe to changes and save to localStorage
if (typeof localStorage !== 'undefined') {
  syncConfigStore.subscribe((value) => {
    try {
      localStorage.setItem(STORAGE_KEY_SYNC_SETTINGS, JSON.stringify(value))
    } catch (error) {
      console.error('Error saving sync settings to localStorage:', error)
    }
  })
}

// --- Browser Extension Discovery ---

/**
 * A writable store that indicates whether the browser extension discovery is in progress.
 */
export const isDiscovering = writable(false)

/**
 * A writable store that holds the discovered browser extension targets that have not yet been added.
 * Each item includes the target and its credentials.
 */
export const discoveredTargets = writable<SyncServiceConfig[]>([])

/**
 * Discovers available browser extension sync targets and prompts the user to add them.
 */
export async function discoverBrowserExtensionTargets(): Promise<void> {
  console.log('Discovering browser extension targets...')
  isDiscovering.set(true)
  discoveredTargets.set([]) // Clear previous discoveries
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { BrowserExtensionSyncAdapter } =
    await import('../sync/browser-extension-sync-adapter.js')
  const adapter = new BrowserExtensionSyncAdapter()

  adapter.on('targetFound', (event: Event) => {
    const target = (
      event as CustomEvent<{ extensionId: string; extensionName?: string }>
    ).detail

    if (!target || !target.extensionId) {
      return
    }

    const $syncConfigs = get(syncConfigStore).syncServices
    const alreadyExists = $syncConfigs.some(
      (service) =>
        service.type === 'browserExtension' &&
        (service.target as BrowserExtensionTarget)?.extensionId ===
          target.extensionId
    )
    if (alreadyExists) {
      return
    }

    const newTarget: SyncServiceConfig<
      BrowserExtensionCredentials,
      BrowserExtensionTarget
    > = {
      id: `new-${target.extensionId}`,
      name:
        target.extensionName || `Extension ${target.extensionId.slice(0, 8)}`,
      type: 'browserExtension',
      credentials: {},
      target: {
        extensionId: target.extensionId,
        extensionName: target.extensionName,
      },
      scope: 'all',
      enabled: false,
    }

    discoveredTargets.update((existing) => {
      const all = [...existing, newTarget]
      // remove duplicates
      return all.filter(
        (item, index, self) =>
          index ===
          self.findIndex(
            (t) =>
              (t.target as BrowserExtensionTarget).extensionId ===
              (item.target as BrowserExtensionTarget).extensionId
          )
      )
    })
  })

  try {
    // Initialize discovery without a specific config
    await adapter.discoverTargets()
  } catch (error) {
    console.error('Error during browser extension discovery:', error)
  } finally {
    // The adapter now self-destroys after discovery
    isDiscovering.set(false)
  }
}

export function promoteDiscoveredTarget(serviceId: string) {
  const target: SyncServiceConfig | undefined = get(discoveredTargets).find(
    (t) => t.id === serviceId
  )
  if (!target || target.type !== 'browserExtension') {
    return
  }

  const newService: SyncServiceConfig<
    BrowserExtensionCredentials,
    BrowserExtensionTarget
  > = {
    id: crypto.randomUUID(),
    type: target.type,
    name: target.name,
    credentials: target.credentials as BrowserExtensionCredentials,
    target: target.target as BrowserExtensionTarget,
    scope: 'all',
    mergeStrategy: {
      meta: 'merge',
      tags: 'union',
      defaultDate: Date.now(),
    },
    enabled: true, // Enable by default
    autoSyncEnabled: true, // Enable by default
    autoSyncInterval: 1, // 1 minute
    autoSyncOnChanges: true,
    autoSyncDelayOnChanges: 0.2, // 12 seconds
    lastSyncTimestamp: 0,
    lastDataChangeTimestamp: 0,
  }

  addSyncService(newService)

  discoveredTargets.update((targets) =>
    targets.filter((t) => t.id !== serviceId)
  )
}

// --- Sync Service Configuration Management ---

/**
 * Validates a sync service configuration.
 * @param config - The sync service configuration to validate.
 * @throws {Error} When the configuration is invalid.
 */
function validateSyncServiceConfig(config: SyncServiceConfig): void {
  // Validate service type
  if (!isValidType(config.type)) {
    throw new Error('Invalid sync service type')
  }

  // Validate required fields
  if (!config.target && config.type !== 'browserExtension') {
    throw new Error('Missing required field: target')
  }

  // Validate credentials
  if (
    !config.credentials ||
    (config.type === 'github' && !config.credentials.token) ||
    (config.type === 'webdav' &&
      (!config.credentials.username || !config.credentials.password)) ||
    (config.type === 'customApi' &&
      !config.credentials.token &&
      !config.credentials.apiKey)
  ) {
    throw new Error('Invalid credentials')
  }

  // Validate target based on service type
  if (config.type === 'github') {
    const target = config.target as GithubTarget
    if (!target.repo) {
      throw new Error('Invalid repository path')
    }
  } else if (config.type === 'webdav' || config.type === 'customApi') {
    const target = config.target as WebDAVTarget | ApiTarget
    if (!target.url || !target.url.startsWith('http')) {
      throw new Error(
        `Invalid ${config.type === 'webdav' ? 'WebDAV' : 'API'} URL format`
      )
    }
  }
}

/**
 * Adds a new sync service configuration.
 * @param config - The sync service configuration to add.
 * @throws {Error} When the configuration is invalid or service ID already exists.
 */
export function addSyncService(config: SyncServiceConfig): void {
  // Validate configuration
  validateSyncServiceConfig(config)

  syncConfigStore.update((settings) => {
    if (settings.syncServices.some((service) => service.id === config.id)) {
      throw new Error('Service ID already exists')
    }

    return {
      ...settings,
      syncServices: [...settings.syncServices, config],
    }
  })
}

/**
 * Updates an existing sync service configuration.
 *
 * @param updatedConfig The updated sync service configuration.
 * @throws {Error} When trying to update a service with a different type.
 */
export function updateSyncService(updatedConfig: SyncServiceConfig): void {
  syncConfigStore.update((settings) => {
    const existingService = settings.syncServices.find(
      (service) => service.id === updatedConfig.id
    )

    if (!existingService) {
      return settings
    }

    // Check type change before validation
    if (existingService.type !== updatedConfig.type) {
      throw new Error(
        `Cannot change sync service type from ${existingService.type} to ${updatedConfig.type}`
      )
    }

    // Validate updated configuration
    validateSyncServiceConfig(updatedConfig)

    return {
      ...settings,
      syncServices: settings.syncServices.map((service) => {
        if (service.id !== updatedConfig.id) {
          return service
        }

        // Check if critical sync configuration has changed
        const shouldResetSync =
          (service.type === 'github' &&
            (service.target.repo !== updatedConfig.target.repo ||
              service.target.branch !== updatedConfig.target.branch ||
              service.target.path !== updatedConfig.target.path)) ||
          (service.type === 'webdav' &&
            (service.target.url !== updatedConfig.target.url ||
              service.target.path !== updatedConfig.target.path)) ||
          (service.type === 'customApi' &&
            (service.target.url !== updatedConfig.target.url ||
              service.target.path !== updatedConfig.target.path))

        // Reset sync metadata if critical configuration changed
        return shouldResetSync
          ? {
              ...updatedConfig,
              lastSyncTimestamp: undefined,
              lastDataChangeTimestamp: undefined,
              lastSyncLocalDataHash: undefined,
              lastSyncMeta: undefined,
            }
          : updatedConfig
      }),
    }
  })
}

/**
 * Removes a sync service configuration by its ID.
 * @param serviceId - The ID of the sync service to remove.
 */
export function removeSyncService(serviceId: string): void {
  syncConfigStore.update((settings) => ({
    ...settings,
    syncServices: settings.syncServices.filter(
      (service) => service.id !== serviceId
    ),
    // If the removed service was active, reset activeSyncServiceId
    activeSyncServiceId:
      settings.activeSyncServiceId === serviceId
        ? undefined
        : settings.activeSyncServiceId,
  }))
}

/**
 * Checks if a sync service with the given ID exists.
 * @param serviceId - The ID of the sync service to check.
 * @returns True if the service exists, false otherwise.
 */
export function hasSyncService(serviceId: string): boolean {
  return getSyncServiceById(get(syncConfigStore), serviceId) !== undefined
}

/**
 * Sets the active sync service.
 * @param serviceId - The ID of the sync service to set as active.
 */
export function setActiveSyncService(serviceId: string | undefined): void {
  syncConfigStore.update((settings) => {
    const service = serviceId
      ? settings.syncServices.find((s) => s.id === serviceId)
      : undefined
    const isServiceValid = service && service.enabled
    return {
      ...settings,
      activeSyncServiceId: isServiceValid ? serviceId : undefined,
    }
  })
}

/**
 * Gets a specific sync service configuration by its ID.
 * @param settings - The sync settings object.
 * @param serviceId - The ID of the sync service.
 * @returns The sync service configuration or undefined if not found.
 */
export function getSyncServiceById(
  settings: SyncSettings,
  serviceId: string
): SyncServiceConfig | undefined {
  return settings.syncServices.find((service) => service.id === serviceId)
}
