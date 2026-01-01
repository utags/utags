import { describe, it, expect, beforeEach, vi } from 'vitest'
import { get } from 'svelte/store'
import type { SyncServiceConfig } from '../sync/types.js'
import {
  syncConfigStore,
  addSyncService,
  updateSyncService,
  removeSyncService,
  hasSyncService,
  setActiveSyncService,
  getSyncServiceById,
  discoverBrowserExtensionTargets,
  promoteDiscoveredTarget,
  discoveredTargets,
  type SyncSettings,
} from './sync-config-store.js'

const mockAdapter = {
  on: vi.fn(),
  discoverTargets: vi.fn(),
  destroy: vi.fn(),
}

vi.mock('../sync/browser-extension-sync-adapter.js', () => ({
  BrowserExtensionSyncAdapter: vi.fn().mockImplementation(() => mockAdapter),
}))

vi.stubGlobal('crypto', {
  randomUUID: vi.fn(),
})

describe('sync-config-store', () => {
  // Mock localStorage
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
  }
  globalThis.localStorage = localStorageMock as any

  // Sample sync service configurations for testing
  const githubConfig: SyncServiceConfig = {
    id: 'github-1',
    type: 'github',
    name: 'GitHub Sync',
    enabled: true,
    scope: 'all',
    target: {
      repo: 'user/repo',
      branch: 'main',
      path: '/bookmarks',
    },
    credentials: {
      token: 'github-token',
    },
  }

  const webdavConfig: SyncServiceConfig = {
    id: 'webdav-1',
    type: 'webdav',
    name: 'WebDAV Sync',
    enabled: true,
    scope: 'all',
    target: {
      url: 'https://webdav.example.com',
      path: '/bookmarks',
    },
    credentials: {
      username: 'user',
      password: 'pass',
    },
  }

  const customApiConfig: SyncServiceConfig = {
    id: 'api-1',
    type: 'customApi',
    name: 'Custom API Sync',
    enabled: true,
    scope: 'all',
    target: {
      url: 'https://api.example.com',
      path: '/sync',
    },
    credentials: {
      token: 'api-token',
    },
  }

  beforeEach(() => {
    // Clear all mocks and reset store
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    syncConfigStore.set({ syncServices: [], activeSyncServiceId: undefined })
  })

  // Sample browser extension service configuration
  const browserExtensionConfig: SyncServiceConfig = {
    id: 'browser-ext-1',
    type: 'browserExtension',
    name: 'Browser Extension Sync',
    enabled: true,
    scope: 'all',
    credentials: {
      token: 'extension-token',
    },
    target: undefined,
  }

  describe('validateSyncServiceConfig', () => {
    it('should throw error for invalid service type', () => {
      const invalidConfig = {
        ...githubConfig,
        type: 'invalid' as any,
      }
      expect(() => {
        addSyncService(invalidConfig)
      }).toThrow('Invalid sync service type')
    })

    it('should throw error for missing target in non-browserExtension service', () => {
      const invalidConfig = {
        ...githubConfig,
        target: undefined,
      }
      expect(() => {
        addSyncService(invalidConfig)
      }).toThrow('Missing required field: target')
    })

    it('should allow missing target for browserExtension service', () => {
      expect(() => {
        addSyncService(browserExtensionConfig)
      }).not.toThrow()
    })

    it('should throw error for invalid GitHub credentials', () => {
      const invalidConfig = {
        ...githubConfig,
        credentials: {},
      }
      expect(() => {
        addSyncService(invalidConfig)
      }).toThrow('Invalid credentials')
    })

    it('should throw error for invalid WebDAV credentials', () => {
      const invalidConfig = {
        ...webdavConfig,
        credentials: {
          username: 'user',
          // Missing password
        },
      }
      expect(() => {
        addSyncService(invalidConfig)
      }).toThrow('Invalid credentials')
    })

    it('should throw error for invalid GitHub repository path', () => {
      const invalidConfig = {
        ...githubConfig,
        target: {
          ...githubConfig.target,
          repo: '',
        },
      }
      expect(() => {
        addSyncService(invalidConfig)
      }).toThrow('Invalid repository path')
    })

    it('should throw error for invalid WebDAV URL format', () => {
      const invalidConfig = {
        ...webdavConfig,
        target: {
          ...webdavConfig.target,
          url: 'invalid-url',
        },
      }
      expect(() => {
        addSyncService(invalidConfig)
      }).toThrow('Invalid WebDAV URL format')
    })

    it('should allow customApi service with apiKey', () => {
      const apiConfigWithApiKey: SyncServiceConfig = {
        ...customApiConfig,
        id: 'api-with-apikey',
        credentials: {
          apiKey: 'my-api-key',
        },
      }
      expect(() => {
        addSyncService(apiConfigWithApiKey)
      }).not.toThrow()
    })

    it('should throw error for invalid Custom API credentials', () => {
      const invalidConfig = {
        ...customApiConfig,
        credentials: {},
      }
      expect(() => {
        addSyncService(invalidConfig)
      }).toThrow('Invalid credentials')
    })

    it('should throw error for invalid Custom API URL format', () => {
      const invalidConfig = {
        ...customApiConfig,
        target: {
          ...customApiConfig.target,
          url: 'invalid-url',
        },
      }
      expect(() => {
        addSyncService(invalidConfig)
      }).toThrow('Invalid API URL format')
    })
  })

  describe('addSyncService', () => {
    it('should add a new GitHub sync service', () => {
      addSyncService(githubConfig)
      const store = get(syncConfigStore)
      expect(store.syncServices).toHaveLength(1)
      expect(store.syncServices[0]).toEqual(githubConfig)
    })

    it('should add multiple sync services', () => {
      addSyncService(githubConfig)
      addSyncService(webdavConfig)
      const store = get(syncConfigStore)
      expect(store.syncServices).toHaveLength(2)
      expect(store.syncServices).toContainEqual(githubConfig)
      expect(store.syncServices).toContainEqual(webdavConfig)
    })

    it('should throw error when adding service with duplicate ID', () => {
      addSyncService(githubConfig)
      expect(() => {
        addSyncService(githubConfig)
      }).toThrow('Service ID already exists')
    })
  })

  describe('updateSyncService', () => {
    it('should update an existing sync service', () => {
      addSyncService(githubConfig)
      const updatedConfig = {
        ...githubConfig,
        name: 'Updated GitHub Sync',
        target: {
          ...githubConfig.target,
          branch: 'develop',
        },
      }
      updateSyncService(updatedConfig)
      const store = get(syncConfigStore)
      expect(store.syncServices[0]).toEqual(updatedConfig)
    })

    it('should reset sync metadata when critical configuration changes', () => {
      const configWithMeta = {
        ...githubConfig,
        lastSyncTimestamp: 123_456_789,
        lastDataChangeTimestamp: 123_456_789,
        lastSyncLocalDataHash: 'hash123',
        lastSyncMeta: {
          timestamp: 123_456_789,
          version: 'v1',
          sha: 'hash123',
        },
      }
      addSyncService(configWithMeta)

      const updatedConfig = {
        ...configWithMeta,
        target: {
          ...configWithMeta.target,
          repo: 'user/new-repo',
        },
      }
      updateSyncService(updatedConfig)
      const store = get(syncConfigStore)
      const updated = store.syncServices[0]
      expect(updated.lastSyncTimestamp).toBeUndefined()
      expect(updated.lastDataChangeTimestamp).toBeUndefined()
      expect(updated.lastSyncLocalDataHash).toBeUndefined()
      expect(updated.lastSyncMeta).toBeUndefined()
    })

    it('should not reset sync metadata when non-critical configuration changes', () => {
      const configWithMeta = {
        ...githubConfig,
        lastSyncTimestamp: 123_456_789,
        lastDataChangeTimestamp: 123_456_789,
        lastSyncLocalDataHash: 'hash123',
        lastSyncMeta: {
          timestamp: 123_456_789,
          version: 'v1',
          sha: 'hash123',
        },
      }
      addSyncService(configWithMeta)

      const updatedConfig = {
        ...configWithMeta,
        name: 'Updated Name',
        enabled: false,
      }
      updateSyncService(updatedConfig)
      const store = get(syncConfigStore)
      const updated = store.syncServices[0]
      expect(updated.lastSyncTimestamp).toBe(123_456_789)
      expect(updated.lastDataChangeTimestamp).toBe(123_456_789)
      expect(updated.lastSyncLocalDataHash).toBe('hash123')
      expect(updated.lastSyncMeta).toEqual(configWithMeta.lastSyncMeta)
    })

    it('should reset sync metadata for all critical configuration changes', () => {
      const configWithMeta = {
        ...webdavConfig,
        lastSyncTimestamp: 123_456_789,
        lastDataChangeTimestamp: 123_456_789,
        lastSyncLocalDataHash: 'hash123',
        lastSyncMeta: {
          timestamp: 123_456_789,
          version: 'v1',
          sha: 'hash123',
        },
      }
      addSyncService(configWithMeta)

      // Test URL change
      let updatedConfig = {
        ...configWithMeta,
        target: {
          ...configWithMeta.target,
          url: 'https://new-webdav.example.com',
        },
      }
      updateSyncService(updatedConfig)
      let store = get(syncConfigStore)
      let updated = store.syncServices[0]
      expect(updated.lastSyncTimestamp).toBeUndefined()
      expect(updated.lastDataChangeTimestamp).toBeUndefined()
      expect(updated.lastSyncLocalDataHash).toBeUndefined()
      expect(updated.lastSyncMeta).toBeUndefined()

      // Reset store for the next test case by re-adding the service with metadata
      // This ensures the test for the 'path' change is independent
      syncConfigStore.set({ syncServices: [], activeSyncServiceId: undefined })
      addSyncService(configWithMeta)
      store = get(syncConfigStore)
      updated = store.syncServices[0]
      expect(updated.lastSyncTimestamp).toEqual(
        configWithMeta.lastSyncTimestamp
      )
      expect(updated.lastDataChangeTimestamp).toEqual(
        configWithMeta.lastDataChangeTimestamp
      )
      expect(updated.lastSyncLocalDataHash).toEqual(
        configWithMeta.lastSyncLocalDataHash
      )
      expect(updated.lastSyncMeta).toEqual(configWithMeta.lastSyncMeta)

      // Test path change
      updatedConfig = {
        ...configWithMeta,
        target: {
          ...configWithMeta.target,
          path: '/new-path',
        },
      }
      updateSyncService(updatedConfig)
      store = get(syncConfigStore)
      updated = store.syncServices[0]
      expect(updated.lastSyncTimestamp).toBeUndefined()
      expect(updated.lastDataChangeTimestamp).toBeUndefined()
      expect(updated.lastSyncLocalDataHash).toBeUndefined()
      expect(updated.lastSyncMeta).toBeUndefined()
    })

    it('should throw error when trying to change service type', () => {
      addSyncService(githubConfig)
      const invalidUpdate = {
        ...githubConfig,
        type: 'webdav' as const,
      }
      expect(() => {
        updateSyncService(invalidUpdate)
      }).toThrow('Cannot change sync service type from github to webdav')
    })

    it('should return unchanged settings when service not found', () => {
      const nonExistentConfig = {
        ...githubConfig,
        id: 'non-existent',
      }
      const beforeUpdate = get(syncConfigStore)
      updateSyncService(nonExistentConfig)
      const afterUpdate = get(syncConfigStore)
      expect(afterUpdate).toEqual(beforeUpdate)
    })

    it('should throw error when updating with invalid config', () => {
      addSyncService(githubConfig)
      const invalidUpdate = {
        ...githubConfig,
        credentials: {},
      }
      expect(() => {
        updateSyncService(invalidUpdate)
      }).toThrow('Invalid credentials')
    })
  })

  describe('removeSyncService', () => {
    beforeEach(() => {
      addSyncService(githubConfig)
      addSyncService(webdavConfig)
    })

    it('should remove a sync service', () => {
      removeSyncService(githubConfig.id)
      const store = get(syncConfigStore)
      expect(store.syncServices).toHaveLength(1)
      expect(store.syncServices[0]).toEqual(webdavConfig)
    })

    it('should reset activeSyncServiceId when removing active service', () => {
      setActiveSyncService(githubConfig.id)
      removeSyncService(githubConfig.id)
      const store = get(syncConfigStore)
      expect(store.activeSyncServiceId).toBeUndefined()
    })

    it('should keep activeSyncServiceId when removing non-active service', () => {
      setActiveSyncService(githubConfig.id)
      removeSyncService(webdavConfig.id)
      const store = get(syncConfigStore)
      expect(store.activeSyncServiceId).toBe(githubConfig.id)
    })

    it('should handle removing non-existent service', () => {
      const store = get(syncConfigStore)
      const beforeRemove = store.syncServices.length
      removeSyncService('non-existent')
      expect(store.syncServices).toHaveLength(beforeRemove)
    })
  })

  describe('hasSyncService', () => {
    it('should return true for existing service', () => {
      addSyncService(githubConfig)
      expect(hasSyncService(githubConfig.id)).toBe(true)
    })

    it('should return false for non-existent service', () => {
      expect(hasSyncService('non-existent')).toBe(false)
    })
  })

  describe('setActiveSyncService', () => {
    beforeEach(() => {
      // Reset the store before each test in this block
      syncConfigStore.set({ syncServices: [], activeSyncServiceId: undefined })
      addSyncService(githubConfig)
      addSyncService(webdavConfig)
    })

    it('should set active sync service', () => {
      setActiveSyncService(githubConfig.id)
      const store = get(syncConfigStore)
      expect(store.activeSyncServiceId).toBe(githubConfig.id)
    })

    it('should unset active sync service when passing undefined', () => {
      setActiveSyncService(githubConfig.id)
      setActiveSyncService(undefined)
      const store = get(syncConfigStore)
      expect(store.activeSyncServiceId).toBeUndefined()
    })

    it('should not set non-existent service as active', () => {
      setActiveSyncService('non-existent')
      const store = get(syncConfigStore)
      expect(store.activeSyncServiceId).toBeUndefined()
    })

    it('should not set disabled service as active', () => {
      const disabledConfig = {
        ...githubConfig,
        id: 'disabled-service',
        enabled: false,
      }
      addSyncService(disabledConfig)
      setActiveSyncService(disabledConfig.id)
      const store = get(syncConfigStore)
      expect(store.activeSyncServiceId).toBeUndefined()
    })
  })

  describe('getSyncServiceById', () => {
    beforeEach(() => {
      addSyncService(githubConfig)
    })

    it('should return service by id', () => {
      const store = get(syncConfigStore)
      const service = getSyncServiceById(store, githubConfig.id)
      expect(service).toEqual(githubConfig)
    })

    it('should return undefined for non-existent service', () => {
      const store = get(syncConfigStore)
      const service = getSyncServiceById(store, 'non-existent')
      expect(service).toBeUndefined()
    })
  })

  describe('localStorage integration', () => {
    const largeConfig = {
      ...githubConfig,
      // Add large data to test storage limits
      lastSyncMeta: {
        timestamp: Date.now(),
        version: 'v1',
        sha: 'a'.repeat(1024 * 1024), // 1MB of data
      },
    }
    it('should load settings from localStorage', async () => {
      const savedSettings = {
        syncServices: [githubConfig],
        activeSyncServiceId: githubConfig.id,
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedSettings))

      // Re-initialize store by importing the module again
      vi.resetModules()
      const { syncConfigStore } = await import('./sync-config-store.js')
      const store = get(syncConfigStore)
      expect(store).toEqual(savedSettings)
    })

    it('should save settings to localStorage when updated', () => {
      addSyncService(githubConfig)
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'utags-sync-settings',
        expect.any(String)
      )
      const lastCall = localStorageMock.setItem.mock.calls.length - 1
      const savedData = JSON.parse(
        localStorageMock.setItem.mock.calls[lastCall][1] as string
      ) as SyncSettings
      expect(savedData.syncServices).toContainEqual(githubConfig)
    })

    it('should handle invalid localStorage data', () => {
      localStorageMock.getItem.mockReturnValue('invalid json')
      const store = get(syncConfigStore)
      expect(store).toEqual({
        syncServices: [],
        activeSyncServiceId: undefined,
      })
    })

    it('should handle missing syncServices array in localStorage', () => {
      localStorageMock.getItem.mockReturnValue(
        JSON.stringify({ activeSyncServiceId: 'some-id' })
      )
      const store = get(syncConfigStore)
      expect(store.syncServices).toEqual([])
    })

    it('should handle localStorage quota exceeded error', () => {
      // Mock localStorage.setItem to throw quota exceeded error
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('QuotaExceededError')
      })

      // Adding a service with large data should not throw but log error
      const consoleSpy = vi.spyOn(console, 'error')
      addSyncService(largeConfig)
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error saving sync settings to localStorage:',
        expect.any(Error)
      )
      consoleSpy.mockRestore()
    })

    it('should filter out invalid services from localStorage', async () => {
      const invalidServices = {
        syncServices: [
          githubConfig,
          { id: 'invalid' }, // Missing required fields
          null,
          undefined,
          { ...webdavConfig, type: 'invalid' }, // Invalid type
        ],
        activeSyncServiceId: githubConfig.id,
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(invalidServices))

      // Re-initialize store
      vi.resetModules()
      const { syncConfigStore: newStore } =
        await import('./sync-config-store.js')
      const store = get(newStore)
      expect(store.syncServices).toHaveLength(1)
      expect(store.syncServices[0]).toEqual(githubConfig)
      expect(store.activeSyncServiceId).toBe(githubConfig.id)
    })

    it('should handle syncServices not being an array in localStorage', async () => {
      const invalidSettings = {
        syncServices: { not: 'an array' },
        activeSyncServiceId: 'some-id',
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(invalidSettings))

      vi.resetModules()
      const { syncConfigStore: newStore } =
        await import('./sync-config-store.js')
      const store = get(newStore)
      expect(store.syncServices).toEqual([])
      expect(store.activeSyncServiceId).toBeUndefined()
    })

    it('should clear activeSyncServiceId if the active service is invalid and filtered out', async () => {
      const invalidServices = {
        syncServices: [
          githubConfig, // a valid service
          { ...webdavConfig, id: 'active-but-invalid', type: 'invalid' },
        ],
        activeSyncServiceId: 'active-but-invalid',
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(invalidServices))

      vi.resetModules()
      const { syncConfigStore: newStore } =
        await import('./sync-config-store.js')
      const store = get(newStore)
      expect(store.syncServices).toHaveLength(1)
      expect(store.syncServices[0]).toEqual(githubConfig)
      expect(store.activeSyncServiceId).toBeUndefined()
    })
  })

  describe('Browser Extension Discovery', () => {
    beforeEach(async () => {
      // Reset mocks and stores before each test
      vi.resetModules()
      vi.clearAllMocks()
      const { BrowserExtensionSyncAdapter } =
        await import('../sync/browser-extension-sync-adapter.js')
      vi.mocked(BrowserExtensionSyncAdapter).mockReturnValue(mockAdapter as any)
      discoveredTargets.set([])
    })

    it('should discover and add new browser extension targets', async () => {
      // Simulate finding a target
      mockAdapter.on.mockImplementation((event, callback) => {
        if (event === 'targetFound') {
          callback(
            new CustomEvent('targetFound', {
              detail: {
                extensionId: 'ext-123',
                extensionName: 'Test Extension',
              },
            })
          )
        }
      })

      await discoverBrowserExtensionTargets()

      const targets: SyncServiceConfig[] = get(discoveredTargets)
      expect(targets).toHaveLength(1)
      expect(targets[0]).toEqual(
        expect.objectContaining({
          name: 'Test Extension',
          type: 'browserExtension',
          target: {
            extensionId: 'ext-123',
            extensionName: 'Test Extension',
          },
        })
      )
      expect(targets[0].id).toBeDefined()
    })

    it('should not add an already configured extension target', async () => {
      // Pre-configure the service
      addSyncService({
        id: 'existing-ext-123',
        type: 'browserExtension',
        name: 'Existing Extension',
        enabled: true,
        scope: 'all',
        target: { extensionId: 'ext-123' },
        credentials: {},
      })

      // Simulate finding the same target again
      mockAdapter.on.mockImplementation((event, callback) => {
        if (event === 'targetFound') {
          callback(
            new CustomEvent('targetFound', {
              detail: {
                extensionId: 'ext-123',
                extensionName: 'Test Extension',
              },
            })
          )
        }
      })

      await discoverBrowserExtensionTargets()

      const targets: SyncServiceConfig[] = get(discoveredTargets)
      expect(targets).toHaveLength(0)
    })

    it('should promote a discovered target to a sync service', async () => {
      // Mock randomUUID to get a predictable ID for the discovered service
      vi.mocked(crypto.randomUUID).mockReturnValue('promoted-uuid-123-456-789')

      // Discover a target first
      mockAdapter.on.mockImplementation((event, callback) => {
        if (event === 'targetFound') {
          callback(
            new CustomEvent('targetFound', {
              detail: {
                extensionId: 'ext-to-promote',
                extensionName: 'Promotable Extension',
              },
            })
          )
        }
      })

      await discoverBrowserExtensionTargets()
      const targetsBeforePromote: SyncServiceConfig[] = get(discoveredTargets)
      expect(targetsBeforePromote).toHaveLength(1)

      const serviceToPromote = targetsBeforePromote[0]
      promoteDiscoveredTarget(serviceToPromote.id)

      // Check if it's removed from discovered targets
      const targetsAfterPromote: SyncServiceConfig[] = get(discoveredTargets)
      expect(targetsAfterPromote).toHaveLength(0)

      // Check if it's added to sync services
      const store = get(syncConfigStore)
      const promotedService = store.syncServices.find(
        (s) => s.target.extensionId === serviceToPromote.target.extensionId
      )
      expect(promotedService).toBeDefined()
      expect(promotedService?.name).toBe('Promotable Extension')
      expect(promotedService?.enabled).toBe(true)
      expect(promotedService?.type).toBe('browserExtension')
      expect((promotedService?.target).extensionId).toBe('ext-to-promote')
    })

    it('should discover multiple browser extension targets', async () => {
      // Simulate finding multiple targets
      mockAdapter.on.mockImplementation((event, callback) => {
        if (event === 'targetFound') {
          // First target
          callback(
            new CustomEvent('targetFound', {
              detail: {
                extensionId: 'ext-1',
                extensionName: 'Extension One',
              },
            })
          )
          // Second target
          callback(
            new CustomEvent('targetFound', {
              detail: {
                extensionId: 'ext-2',
                extensionName: 'Extension Two',
              },
            })
          )
          // Third target without name
          callback(
            new CustomEvent('targetFound', {
              detail: {
                extensionId: 'ext-3',
              },
            })
          )
        }
      })

      await discoverBrowserExtensionTargets()

      const targets: SyncServiceConfig[] = get(discoveredTargets)
      expect(targets).toHaveLength(3)

      // Check first target
      expect(targets[0]).toEqual(
        expect.objectContaining({
          name: 'Extension One',
          type: 'browserExtension',
          target: {
            extensionId: 'ext-1',
            extensionName: 'Extension One',
          },
        })
      )

      // Check second target
      expect(targets[1]).toEqual(
        expect.objectContaining({
          name: 'Extension Two',
          type: 'browserExtension',
          target: {
            extensionId: 'ext-2',
            extensionName: 'Extension Two',
          },
        })
      )

      // Check third target (without name)
      expect(targets[2]).toEqual(
        expect.objectContaining({
          name: 'Extension ext-3',
          type: 'browserExtension',
          target: {
            extensionId: 'ext-3',
            extensionName: undefined,
          },
        })
      )
    })

    it('should handle discovery errors gracefully', async () => {
      // Reset the mock to not trigger any targetFound events
      mockAdapter.on.mockImplementation(() => {})
      // Simulate discovery error
      mockAdapter.discoverTargets.mockRejectedValue(
        new Error('Discovery failed')
      )

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await discoverBrowserExtensionTargets()

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error during browser extension discovery:',
        expect.any(Error)
      )

      const targets: SyncServiceConfig[] = get(discoveredTargets)
      expect(targets).toHaveLength(0)

      consoleSpy.mockRestore()
    })

    it('should remove duplicate discovered targets', async () => {
      // Simulate finding the same target multiple times
      mockAdapter.on.mockImplementation((event, callback) => {
        if (event === 'targetFound') {
          // Add the same target twice
          callback(
            new CustomEvent('targetFound', {
              detail: {
                extensionId: 'ext-duplicate',
                extensionName: 'Duplicate Extension',
              },
            })
          )
          callback(
            new CustomEvent('targetFound', {
              detail: {
                extensionId: 'ext-duplicate',
                extensionName: 'Duplicate Extension Again',
              },
            })
          )
        }
      })

      await discoverBrowserExtensionTargets()

      const targets: SyncServiceConfig[] = get(discoveredTargets)
      expect(targets).toHaveLength(1)
      expect(targets[0].target.extensionId).toBe('ext-duplicate')
      expect(targets[0].target.extensionName).toBe('Duplicate Extension')
    })

    it('should handle promoting non-existent target gracefully', () => {
      // Try to promote a target that doesn't exist
      promoteDiscoveredTarget('non-existent-id')

      // Should not throw error and store should remain unchanged
      const store = get(syncConfigStore)
      expect(store.syncServices).toHaveLength(0)

      const targets: SyncServiceConfig[] = get(discoveredTargets)
      expect(targets).toHaveLength(0)
    })

    it('should clear discovered targets before new discovery', async () => {
      // Add some initial discovered targets
      discoveredTargets.set([
        {
          id: 'old-target',
          name: 'Old Target',
          type: 'browserExtension',
          enabled: false,
          scope: 'all',
          target: { extensionId: 'old-ext' },
          credentials: {},
        },
      ])

      // Simulate finding a new target
      mockAdapter.on.mockImplementation((event, callback) => {
        if (event === 'targetFound') {
          callback(
            new CustomEvent('targetFound', {
              detail: {
                extensionId: 'new-ext',
                extensionName: 'New Extension',
              },
            })
          )
        }
      })

      await discoverBrowserExtensionTargets()

      const targets: SyncServiceConfig[] = get(discoveredTargets)
      expect(targets).toHaveLength(1)
      expect(targets[0].target.extensionId).toBe('new-ext')
      expect(targets[0].name).toBe('New Extension')
    })

    it('should generate fallback name when extension name is missing', async () => {
      // Simulate finding a target without extensionName
      mockAdapter.on.mockImplementation((event, callback) => {
        if (event === 'targetFound') {
          callback(
            new CustomEvent('targetFound', {
              detail: {
                extensionId: 'ext-no-name-12345678',
              },
            })
          )
        }
      })

      await discoverBrowserExtensionTargets()

      const targets: SyncServiceConfig[] = get(discoveredTargets)
      expect(targets).toHaveLength(1)
      expect(targets[0].name).toBe('Extension ext-no-n')
      expect(targets[0].target.extensionId).toBe('ext-no-name-12345678')
      expect(targets[0].target.extensionName).toBeUndefined()
    })

    it('should promote multiple discovered targets independently', async () => {
      vi.mocked(crypto.randomUUID)
        .mockReturnValueOnce('11111111-2222-3333-4444-555555555555')
        .mockReturnValueOnce('66666666-7777-8888-9999-aaaaaaaaaaaa')

      // Discover multiple targets first
      mockAdapter.on.mockImplementation((event, callback) => {
        if (event === 'targetFound') {
          callback(
            new CustomEvent('targetFound', {
              detail: {
                extensionId: 'ext-promote-1',
                extensionName: 'Extension One',
              },
            })
          )
          callback(
            new CustomEvent('targetFound', {
              detail: {
                extensionId: 'ext-promote-2',
                extensionName: 'Extension Two',
              },
            })
          )
        }
      })

      await discoverBrowserExtensionTargets()
      const targetsBeforePromote: SyncServiceConfig[] = get(discoveredTargets)
      expect(targetsBeforePromote).toHaveLength(2)

      // Promote first target
      promoteDiscoveredTarget(targetsBeforePromote[0].id)

      const targetsAfterFirstPromote: SyncServiceConfig[] =
        get(discoveredTargets)
      expect(targetsAfterFirstPromote).toHaveLength(1)

      let store = get(syncConfigStore)
      expect(store.syncServices).toHaveLength(1)
      expect(store.syncServices[0].target.extensionId).toBe('ext-promote-1')

      // Promote second target
      promoteDiscoveredTarget(targetsAfterFirstPromote[0].id)

      const targetsAfterSecondPromote: SyncServiceConfig[] =
        get(discoveredTargets)
      expect(targetsAfterSecondPromote).toHaveLength(0)

      store = get(syncConfigStore)
      expect(store.syncServices).toHaveLength(2)
      expect(store.syncServices[1].target.extensionId).toBe('ext-promote-2')
    })

    it('should set correct default properties for promoted targets', async () => {
      vi.mocked(crypto.randomUUID).mockReturnValue(
        '12345678-1234-5678-9abc-123456789abc'
      )

      // Discover a target
      mockAdapter.on.mockImplementation((event, callback) => {
        if (event === 'targetFound') {
          callback(
            new CustomEvent('targetFound', {
              detail: {
                extensionId: 'ext-defaults',
                extensionName: 'Test Defaults',
              },
            })
          )
        }
      })

      await discoverBrowserExtensionTargets()
      const targets: SyncServiceConfig[] = get(discoveredTargets)
      const targetToPromote = targets[0]

      promoteDiscoveredTarget(targetToPromote.id)

      const store = get(syncConfigStore)
      const promotedService = store.syncServices[0]

      // Verify basic properties
      expect(promotedService.id).toBe('12345678-1234-5678-9abc-123456789abc')
      expect(promotedService.name).toBe('Test Defaults')
      expect(promotedService.type).toBe('browserExtension')
      expect(promotedService.credentials).toEqual({})
      expect(promotedService.target).toEqual({
        extensionId: 'ext-defaults',
        extensionName: 'Test Defaults',
      })

      // Verify default configuration values
      expect(promotedService.enabled).toBe(true)
      expect(promotedService.scope).toBe('all')
      expect(promotedService.autoSyncEnabled).toBe(true)
      expect(promotedService.autoSyncInterval).toBe(1)
      expect(promotedService.autoSyncOnChanges).toBe(true)
      expect(promotedService.autoSyncDelayOnChanges).toBe(0.2)
      expect(promotedService.lastSyncTimestamp).toBe(0)
      expect(promotedService.lastDataChangeTimestamp).toBe(0)

      // Verify merge strategy defaults
      expect(promotedService.mergeStrategy).toBeDefined()
      expect(promotedService.mergeStrategy).toEqual(
        expect.objectContaining({
          meta: 'merge',
          tags: 'union',
          defaultDate: expect.any(Number),
        })
      )
      expect(promotedService.mergeStrategy!.defaultDate).toBeGreaterThan(0)
    })
  })
})
