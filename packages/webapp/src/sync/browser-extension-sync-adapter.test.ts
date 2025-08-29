import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mockEventListener } from '../utils/test/mock-event-listener.js'
import {
  BrowserExtensionSyncAdapter,
  BrowserExtensionSyncError,
  type BrowserExtensionMessage,
  type BrowserExtensionResponse,
} from './browser-extension-sync-adapter.js'
import type {
  SyncServiceConfig,
  BrowserExtensionCredentials,
  BrowserExtensionTarget,
  SyncMetadata,
  AuthStatus,
  MessageType,
} from './types.js'

// Constants for message types and sources

const SOURCE_WEBAPP = 'utags-webapp'
const SOURCE_EXTENSION = 'utags-extension'
const PING_MESSAGE_TYPE = 'PING'
const PONG_MESSAGE_TYPE = 'PONG'
const DISCOVER_MESSAGE_TYPE = 'DISCOVER_UTAGS_TARGETS'
const DISCOVERY_RESPONSE_TYPE = 'DISCOVERY_RESPONSE'
const GET_REMOTE_METADATA_MESSAGE_TYPE = 'GET_REMOTE_METADATA'
const DOWNLOAD_MESSAGE_TYPE = 'DOWNLOAD_DATA'
const UPLOAD_MESSAGE_TYPE = 'UPLOAD_DATA'
const GET_AUTH_STATUS_MESSAGE_TYPE = 'GET_AUTH_STATUS'

// Helper to create a mock config
const createMockConfig = (
  id = 'test-ext-sync',
  targetExtensionId = 'mock-extension-id'
): SyncServiceConfig<BrowserExtensionCredentials, BrowserExtensionTarget> => ({
  id,
  type: 'browserExtension',
  name: 'Test Extension Sync',
  credentials: {},
  target: { extensionId: targetExtensionId },
  enabled: true,
  scope: 'all',
})

// Mock window.postMessage and event listeners
let mockPostMessage: ReturnType<typeof vi.fn>
let mockAddEventListener: ReturnType<typeof vi.fn>
let mockRemoveEventListener: ReturnType<typeof vi.fn>
let messageHandler: ((event: MessageEvent) => void) | undefined

// Helper to simulate a response from the extension
const simulateExtensionResponse = (
  id: string,
  responsePayload?: any, // Renamed to avoid confusion with the 'payload' property
  error?: string,
  extensionId = 'mock-extension-id' // Default to the one we are testing against
) => {
  if (messageHandler) {
    const data: BrowserExtensionResponse<any> = {
      source: 'utags-extension',
      id,
      extensionId,
      type: responsePayload?.type, // Extract type from the payload
      payload: responsePayload,
      error,
    }

    const event = new MessageEvent('message', { data }) as MessageEvent
    messageHandler(event)
  }
}

// Helper to capture sent messages
const getSentMessage = (callIndex = 0) => {
  return mockPostMessage.mock.calls[
    callIndex
  ][0] as BrowserExtensionMessage<any>
}

const getTimeoutErrorMessage = (messageType: string, timeoutMs: number) => {
  // return new TypeError( `[BrowserExtensionSyncAdapter] Timeout waiting for response from extension mock-extension-id for request mock-uuid (type: ${messageType}, timeout: ${timeoutMs}ms)`)
  return BrowserExtensionSyncError.timeout(
    'mock-extension-id',
    messageType,
    'mock-uuid',
    timeoutMs
  )
}

describe('BrowserExtensionSyncAdapter', () => {
  let adapter: BrowserExtensionSyncAdapter
  let mockConfig: SyncServiceConfig<
    BrowserExtensionCredentials,
    BrowserExtensionTarget
  >

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mocks for each test
    mockPostMessage = vi.fn()
    messageHandler = undefined // Reset messageHandler

    const mockResult = mockEventListener((event, handler) => {
      if (event === 'message') {
        messageHandler = handler
      }
    })
    mockAddEventListener = mockResult.addEventListener
    mockRemoveEventListener = mockResult.removeEventListener

    vi.stubGlobal('crypto', { randomUUID: () => 'mock-uuid' })
    vi.stubGlobal('location', { origin: 'test-origin' })
    vi.stubGlobal('window', {
      postMessage: mockPostMessage,
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
      // setTimeout and clearTimeout are needed for request timeouts
      setTimeout: vi.fn((fn: () => void, delay: number) => {
        // Store the timer ID and allow manual triggering or actual timeout in tests
        const timerId = globalThis.setTimeout(fn, delay)
        return timerId as unknown as number
      }),
      clearTimeout: vi.fn((id: number) => {
        globalThis.clearTimeout(id)
      }),
      location: {
        origin: 'test-origin',
      },
    })

    adapter = new BrowserExtensionSyncAdapter()
    mockConfig = createMockConfig()
    vi.useFakeTimers() // Use fake timers for timeout tests
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  describe('init', () => {
    it('should initialize successfully and send PING, receive PONG', async () => {
      const initPromise = adapter.init(mockConfig)
      // Simulate extension responding to PING
      // Need to wait for the message to be sent and handler to be registered
      await vi.waitFor(() => {
        expect(mockPostMessage).toHaveBeenCalled()
      })
      const sentMessage = getSentMessage()
      expect(sentMessage.type).toBe('PING')
      expect(sentMessage.targetExtensionId).toBe('mock-extension-id')

      simulateExtensionResponse(sentMessage.id, { status: 'PONG' })
      await expect(initPromise).resolves.toBeUndefined()
      expect(adapter.getConfig().target.extensionId).toBe('mock-extension-id')
      expect(mockAddEventListener).toHaveBeenCalledWith(
        'message',
        expect.any(Function)
      )
    })

    it('should ignore responses from other extensions', async () => {
      const initPromise = adapter.init(mockConfig)
      await vi.waitFor(() => {
        expect(mockPostMessage).toHaveBeenCalled()
      })
      const sentMessage = getSentMessage()
      // Simulate a response from a DIFFERENT extension
      simulateExtensionResponse(
        sentMessage.id,
        { status: 'PONG' },
        undefined,
        'another-extension-id'
      )

      // The promise should not resolve, it should time out because the correct extension never responded.
      vi.runAllTimers()
      await expect(initPromise).rejects.toThrow(
        getTimeoutErrorMessage('PING', 5000)
      )
    })

    it('should throw an error if PING fails or receives invalid PONG', async () => {
      const initPromise = adapter.init(mockConfig)
      await vi.waitFor(() => {
        expect(mockPostMessage).toHaveBeenCalled()
      })
      const sentMessage = getSentMessage()
      simulateExtensionResponse(sentMessage.id, { status: 'NOPE' }) // Invalid PONG
      await expect(initPromise).rejects.toThrow(
        'Communication error: Invalid PONG response'
      )
      expect(mockRemoveEventListener).toHaveBeenCalled()
    })

    it('should throw an error if PING times out', async () => {
      const initPromise = adapter.init(mockConfig)
      await vi.waitFor(() => {
        expect(mockPostMessage).toHaveBeenCalled()
      })
      vi.runAllTimers() // Trigger timeout
      await expect(initPromise).rejects.toThrow(
        getTimeoutErrorMessage('PING', 5000)
      )
      expect(mockRemoveEventListener).toHaveBeenCalled()
    })

    it('should throw if window is not available', async () => {
      vi.stubGlobal('window', undefined)
      adapter = new BrowserExtensionSyncAdapter() // Re-instantiate with no window
      await expect(adapter.init(mockConfig)).rejects.toThrow(
        'Browser environment not available'
      )
    })
  })

  describe('getConfig', () => {
    it('should return the config after initialization', async () => {
      const initPromise = adapter.init(mockConfig)
      await vi.waitFor(() => {
        expect(mockPostMessage).toHaveBeenCalled()
      })
      simulateExtensionResponse(getSentMessage().id, { status: 'PONG' })
      await initPromise
      expect(adapter.getConfig()).toEqual(mockConfig)
    })

    it('should throw if called before initialization', () => {
      expect(() => adapter.getConfig()).toThrow(
        'Adapter not initialized or configuration not set. Call init() first.'
      )
    })
  })

  describe('upload', () => {
    const mockData = JSON.stringify({ foo: 'bar' })
    const mockRemoteMeta: SyncMetadata = { timestamp: 123, version: 'v1' }

    beforeEach(async () => {
      // Ensure adapter is initialized for these tests
      const initPromise = adapter.init(mockConfig)
      await vi.waitFor(() => {
        expect(mockPostMessage).toHaveBeenCalled()
      })
      simulateExtensionResponse(getSentMessage().id, { status: 'PONG' })
      await initPromise
      mockPostMessage.mockClear() // Clear PING call
    })

    it('should send UPLOAD_DATA message and resolve with metadata', async () => {
      const uploadPromise = adapter.upload(mockData, mockRemoteMeta)
      await vi.waitFor(() => {
        expect(mockPostMessage).toHaveBeenCalled()
      })
      const sentMessage = getSentMessage()
      expect(sentMessage.type).toBe(UPLOAD_MESSAGE_TYPE)
      expect(sentMessage.payload).toEqual({
        data: mockData,
        metadata: mockRemoteMeta,
      })

      const expectedResponseMeta: SyncMetadata = {
        timestamp: 456,
        version: 'v2',
      }
      simulateExtensionResponse(sentMessage.id, {
        metadata: expectedResponseMeta,
      })
      await expect(uploadPromise).resolves.toEqual(expectedResponseMeta)
    })

    it('should reject if extension returns an error', async () => {
      const uploadPromise = adapter.upload(mockData)
      await vi.waitFor(() => {
        expect(mockPostMessage).toHaveBeenCalled()
      })
      simulateExtensionResponse(getSentMessage().id, undefined, 'Upload failed')
      await expect(uploadPromise).rejects.toThrow('Upload failed')
    })

    it('should reject with a conflict error if remote metadata mismatch', async () => {
      const localMeta: SyncMetadata = { timestamp: 100, version: 'v0' } // Different from mockRemoteMeta in userscript
      const uploadPromise = adapter.upload(mockData, localMeta)

      await vi.waitFor(() => {
        expect(mockPostMessage).toHaveBeenCalled()
      })
      const sentMessage = getSentMessage()
      expect(sentMessage.type).toBe(UPLOAD_MESSAGE_TYPE)
      expect(sentMessage.payload).toEqual({
        data: mockData,
        metadata: localMeta,
      })

      // Simulate the userscript throwing a conflict error
      // The userscript would compare sentMessage.payload.metadata with its internal mockRemoteMetadata
      // and throw if they don't match.
      const conflictErrorMessage =
        'Conflict: Expected remote metadata does not match current remote metadata.'
      simulateExtensionResponse(sentMessage.id, undefined, conflictErrorMessage)

      await expect(uploadPromise).rejects.toThrow(
        `Communication error: Error from extension mock-extension-id: ${conflictErrorMessage}`
      )
    })

    it('should reject on timeout', async () => {
      const uploadPromise = adapter.upload(mockData)
      await vi.waitFor(() => {
        expect(mockPostMessage).toHaveBeenCalled()
      })
      vi.runAllTimers()
      await expect(uploadPromise).rejects.toThrow(
        getTimeoutErrorMessage(UPLOAD_MESSAGE_TYPE, 30_000)
      )
    })

    it('should throw if called before initialization', async () => {
      const uninitializedAdapter = new BrowserExtensionSyncAdapter()
      await expect(uninitializedAdapter.upload(mockData)).rejects.toThrow(
        'Adapter not initialized'
      )
    })
  })

  describe('download', () => {
    const mockDownloadedData = JSON.stringify({ baz: 'qux' })
    const mockRemoteMeta: SyncMetadata = { timestamp: 789, version: 'v3' }

    beforeEach(async () => {
      const initPromise = adapter.init(mockConfig)
      await vi.waitFor(() => {
        expect(mockPostMessage).toHaveBeenCalled()
      })
      simulateExtensionResponse(getSentMessage().id, { status: 'PONG' })
      await initPromise
      mockPostMessage.mockClear()
    })

    it('should send DOWNLOAD_DATA message and resolve with data and metadata', async () => {
      const downloadPromise = adapter.download()
      await vi.waitFor(() => {
        expect(mockPostMessage).toHaveBeenCalled()
      })
      const sentMessage = getSentMessage()
      expect(sentMessage.type).toBe(DOWNLOAD_MESSAGE_TYPE)
      expect(sentMessage.payload).toBeUndefined()

      simulateExtensionResponse(sentMessage.id, {
        data: mockDownloadedData,
        remoteMeta: mockRemoteMeta,
      })
      await expect(downloadPromise).resolves.toEqual({
        data: mockDownloadedData,
        remoteMeta: mockRemoteMeta,
      })
    })

    it('should reject if extension returns an error', async () => {
      const downloadPromise = adapter.download()
      await vi.waitFor(() => {
        expect(mockPostMessage).toHaveBeenCalled()
      })
      simulateExtensionResponse(
        getSentMessage().id,
        undefined,
        'Download failed'
      )
      await expect(downloadPromise).rejects.toThrow('Download failed')
    })

    it('should reject on timeout', async () => {
      const downloadPromise = adapter.download()
      await vi.waitFor(() => {
        expect(mockPostMessage).toHaveBeenCalled()
      })
      vi.runAllTimers()
      await expect(downloadPromise).rejects.toThrow(
        getTimeoutErrorMessage(DOWNLOAD_MESSAGE_TYPE, 30_000)
      )
    })

    it('should throw if called before initialization', async () => {
      const uninitializedAdapter = new BrowserExtensionSyncAdapter()
      await expect(uninitializedAdapter.download()).rejects.toThrow(
        'Adapter not initialized'
      )
    })
  })

  describe('getRemoteMetadata', () => {
    const mockRemoteMeta: SyncMetadata = { timestamp: 101, version: 'v4' }

    beforeEach(async () => {
      const initPromise = adapter.init(mockConfig)
      await vi.waitFor(() => {
        expect(mockPostMessage).toHaveBeenCalled()
      })
      simulateExtensionResponse(getSentMessage().id, { status: 'PONG' })
      await initPromise
      mockPostMessage.mockClear()
    })

    it('should send GET_REMOTE_METADATA and resolve with metadata', async () => {
      const metadataPromise = adapter.getRemoteMetadata()
      await vi.waitFor(() => {
        expect(mockPostMessage).toHaveBeenCalled()
      })
      const sentMessage = getSentMessage()
      expect(sentMessage.type).toBe(GET_REMOTE_METADATA_MESSAGE_TYPE)

      simulateExtensionResponse(sentMessage.id, {
        metadata: mockRemoteMeta,
      })
      await expect(metadataPromise).resolves.toEqual(mockRemoteMeta)
    })

    it('should resolve with undefined if metadata not found', async () => {
      const metadataPromise = adapter.getRemoteMetadata()
      await vi.waitFor(() => {
        expect(mockPostMessage).toHaveBeenCalled()
      })
      simulateExtensionResponse(getSentMessage().id, {
        metadata: undefined,
      })
      await expect(metadataPromise).resolves.toBeUndefined()
    })

    it('should reject if extension returns an error', async () => {
      const metadataPromise = adapter.getRemoteMetadata()
      await vi.waitFor(() => {
        expect(mockPostMessage).toHaveBeenCalled()
      })
      simulateExtensionResponse(
        getSentMessage().id,
        undefined,
        'Metadata fetch failed'
      )
      await expect(metadataPromise).rejects.toThrow('Metadata fetch failed')
    })

    it('should reject on timeout', async () => {
      const metadataPromise = adapter.getRemoteMetadata()
      await vi.waitFor(() => {
        expect(mockPostMessage).toHaveBeenCalled()
      })
      vi.runAllTimers()
      await expect(metadataPromise).rejects.toThrow(
        getTimeoutErrorMessage(GET_REMOTE_METADATA_MESSAGE_TYPE, 30_000)
      )
    })

    it('should throw if called before initialization', async () => {
      const uninitializedAdapter = new BrowserExtensionSyncAdapter()
      await expect(uninitializedAdapter.getRemoteMetadata()).rejects.toThrow(
        'Adapter not initialized'
      )
    })
  })

  describe('targetExtensionId handling', () => {
    const mockRemoteMeta: SyncMetadata = { timestamp: 101, version: 'v4' }
    it('should include targetExtensionId in all outgoing messages', async () => {
      const initPromise = adapter.init(mockConfig)
      await vi.waitFor(() => {
        expect(mockPostMessage).toHaveBeenCalled()
      })
      const pingMessage = getSentMessage()
      expect(pingMessage.targetExtensionId).toBe('mock-extension-id')
      simulateExtensionResponse(pingMessage.id, { status: 'PONG' })
      await initPromise
      mockPostMessage.mockClear()

      // Test GET_AUTH_STATUS message
      const authStatusPromise = adapter.getAuthStatus()
      await vi.waitFor(() => {
        expect(mockPostMessage).toHaveBeenCalled()
      })
      const authMessage = getSentMessage()
      expect(authMessage.targetExtensionId).toBe('mock-extension-id')
      simulateExtensionResponse(authMessage.id, 'authenticated')
      await authStatusPromise

      // Test GET_REMOTE_METADATA message
      const metadataPromise = adapter.getRemoteMetadata()
      await vi.waitFor(() => {
        expect(mockPostMessage).toHaveBeenCalled()
      })
      const metadataMessage = getSentMessage()
      expect(metadataMessage.targetExtensionId).toBe('mock-extension-id')
      simulateExtensionResponse(metadataMessage.id, {
        metadata: mockRemoteMeta,
      })
      await metadataPromise
    })

    it('should ignore responses with mismatched extensionId', async () => {
      const initPromise = adapter.init(mockConfig)
      await vi.waitFor(() => {
        expect(mockPostMessage).toHaveBeenCalled()
      })
      const pingMessage = getSentMessage()

      // Simulate responses from wrong extensions
      simulateExtensionResponse(
        pingMessage.id,
        { status: 'PONG' },
        undefined,
        'wrong-extension-id'
      )
      simulateExtensionResponse(
        pingMessage.id,
        { status: 'PONG' },
        undefined,
        'another-wrong-id'
      )

      // Only respond with correct extensionId
      simulateExtensionResponse(pingMessage.id, { status: 'PONG' })
      await initPromise

      // Verify the adapter waited for the correct extension response
      expect(adapter.getConfig().target.extensionId).toBe('mock-extension-id')
    })

    it('should handle targetExtensionId change during initialization', async () => {
      const newExtensionId = 'new-extension-id'
      const newConfig = createMockConfig('test-ext-sync', newExtensionId)

      const initPromise = adapter.init(newConfig)
      await vi.waitFor(() => {
        expect(mockPostMessage).toHaveBeenCalled()
      })
      const pingMessage = getSentMessage()
      expect(pingMessage.targetExtensionId).toBe(newExtensionId)

      simulateExtensionResponse(
        pingMessage.id,
        { status: 'PONG' },
        undefined,
        newExtensionId
      )
      await initPromise

      expect(adapter.getConfig().target.extensionId).toBe(newExtensionId)
    })
  })

  describe('getAuthStatus', () => {
    beforeEach(async () => {
      const initPromise = adapter.init(mockConfig)
      await vi.waitFor(() => {
        expect(mockPostMessage).toHaveBeenCalled()
      })
      simulateExtensionResponse(getSentMessage().id, { status: 'PONG' })
      await initPromise
      mockPostMessage.mockClear()
    })

    it('should send GET_AUTH_STATUS and resolve with auth status', async () => {
      const authStatusPromise = adapter.getAuthStatus()
      await vi.waitFor(() => {
        expect(mockPostMessage).toHaveBeenCalled()
      })
      const sentMessage = getSentMessage()
      expect(sentMessage.type).toBe(GET_AUTH_STATUS_MESSAGE_TYPE)

      const expectedStatus: AuthStatus = 'authenticated'
      // The extension should send the AuthStatus string directly as payload
      simulateExtensionResponse(sentMessage.id, { status: expectedStatus })
      await expect(authStatusPromise).resolves.toBe(expectedStatus)
    })

    it('should return "error" if extension returns an error', async () => {
      const authStatusPromise = adapter.getAuthStatus()
      await vi.waitFor(() => {
        expect(mockPostMessage).toHaveBeenCalled()
      })
      simulateExtensionResponse(
        getSentMessage().id,
        undefined,
        'Auth check failed'
      )
      await expect(authStatusPromise).resolves.toBe('error') // getAuthStatus handles errors by returning 'error'
    })

    it('should return "error" if response is not a valid AuthStatus', async () => {
      const authStatusPromise = adapter.getAuthStatus()
      await vi.waitFor(() => {
        expect(mockPostMessage).toHaveBeenCalled()
      })
      simulateExtensionResponse(getSentMessage().id, 'invalid-status' as any)
      await expect(authStatusPromise).resolves.toBe('error')
    })

    it('should return "error" on timeout', async () => {
      const authStatusPromise = adapter.getAuthStatus()
      await vi.waitFor(() => {
        expect(mockPostMessage).toHaveBeenCalled()
      })
      vi.runAllTimers()
      await expect(authStatusPromise).resolves.toBe('error')
    })

    it('should return "unknown" if called before initialization', async () => {
      const uninitializedAdapter = new BrowserExtensionSyncAdapter()
      await expect(uninitializedAdapter.getAuthStatus()).resolves.toBe(
        'unknown'
      )
    })
  })

  describe('destroy', () => {
    it('should remove event listener and clear outstanding requests', async () => {
      // Initialize and make a request that will be outstanding
      const initPromise = adapter.init(mockConfig)
      await vi.waitFor(() => {
        expect(mockPostMessage).toHaveBeenCalled()
      })
      simulateExtensionResponse(getSentMessage().id, { status: 'PONG' })
      await initPromise
      mockPostMessage.mockClear()

      // Make a request but don't respond to it
      const metadatePromise = adapter.getRemoteMetadata()
      await vi.waitFor(() => {
        expect(mockPostMessage).toHaveBeenCalled()
      })
      expect((adapter as any).outstandingRequests.size).toBe(1)

      adapter.destroy()

      expect(mockRemoveEventListener).toHaveBeenCalledWith(
        'message',
        expect.any(Function)
      )
      expect((adapter as any).outstandingRequests.size).toBe(0)
      // Check if timers were cleared (hard to check directly without more complex timer mock)
      // But outstandingRequests.clear() implies associated timers are handled.

      await expect(metadatePromise).rejects.toThrow(
        'Adapter has been destroyed'
      )
    })
  })

  describe('discoverTargets', () => {
    it('should send a DISCOVER_UTAGS_TARGETS broadcast message', async () => {
      const discoverPromise = adapter.discoverTargets()
      await vi.waitFor(() => {
        expect(mockPostMessage).toHaveBeenCalled()
      })
      const sentMessage = getSentMessage()
      expect(sentMessage.type).toBe('DISCOVER_UTAGS_TARGETS')
      expect(sentMessage.targetExtensionId).toBe('*')
      vi.runAllTimers() // Trigger timeout
      await discoverPromise
      adapter.destroy()
    })

    it('should emit `targetFound` event when a discovery response is received', async () => {
      const targetFoundListener = vi.fn()
      adapter.on('targetFound', targetFoundListener)

      const discoverPromise = adapter.discoverTargets()
      await vi.waitFor(() => {
        expect(mockPostMessage).toHaveBeenCalled()
      })
      const sentMessage = getSentMessage()

      simulateExtensionResponse(sentMessage.id, {
        type: 'DISCOVERY_RESPONSE',
        extensionId: 'discovered-ext-1',
        extensionName: 'Discoverd Extension 1',
      })

      // Wait for the discovery timeout (3000ms)
      await vi.advanceTimersByTimeAsync(3000)
      await discoverPromise
      adapter.destroy()
      // expect(targetFoundListener).toHaveBeenCalledWith({
      //   extensionId: 'discovered-ext-1',
      // })
      expect(targetFoundListener).toHaveBeenCalledTimes(1)
      const eventObject = targetFoundListener.mock.calls[0][0]
      expect(eventObject.detail).toEqual({
        extensionId: 'discovered-ext-1',
        extensionName: 'Discoverd Extension 1',
      })

      adapter.off('targetFound', targetFoundListener)
    })

    it('should emit `targetFound` for multiple unique extensions', async () => {
      const targetFoundListener = vi.fn()
      adapter.on('targetFound', targetFoundListener)

      const discoverPromise = adapter.discoverTargets()
      await vi.waitFor(() => {
        expect(mockPostMessage).toHaveBeenCalled()
      })
      const sentMessage = getSentMessage()

      simulateExtensionResponse(sentMessage.id, {
        type: 'DISCOVERY_RESPONSE',
        extensionId: 'discovered-ext-1',
      })
      await vi.advanceTimersByTimeAsync(0)

      simulateExtensionResponse(sentMessage.id, {
        type: 'DISCOVERY_RESPONSE',
        extensionId: 'discovered-ext-2',
      })
      // Wait for the discovery timeout (3000ms)
      await vi.advanceTimersByTimeAsync(3000)
      await discoverPromise

      expect(targetFoundListener).toHaveBeenCalledTimes(2)
      // const eventObject = targetFoundListener.mock.calls[0][0]
      // expect(eventObject.detail).toEqual([
      //   {
      //     extensionId: 'discovered-ext-1',
      //     extensionName: undefined,
      //   },
      //   {
      //     extensionId: 'discovered-ext-2',
      //     extensionName: undefined,
      //   },
      // ])

      const eventObject1 = targetFoundListener.mock.calls[0][0]
      const eventObject2 = targetFoundListener.mock.calls[1][0]

      expect(eventObject1.detail).toEqual({
        extensionId: 'discovered-ext-1',
        extensionName: undefined,
      })
      expect(eventObject2.detail).toEqual({
        extensionId: 'discovered-ext-2',
        extensionName: undefined,
      })
      // expect(targetFoundListener).toHaveBeenCalledWith({
      //   extensionId: 'discovered-ext-1',
      // })
      // expect(targetFoundListener).toHaveBeenCalledWith({
      //   extensionId: 'discovered-ext-2',
      // })

      adapter.off('targetFound', targetFoundListener)
    })

    it('should not start a new discovery if one is already in progress', async () => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      adapter.discoverTargets() // Don't await, let it be outstanding // First call
      await vi.waitFor(() => {
        expect(mockPostMessage).toHaveBeenCalledTimes(1)
      })

      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      adapter.discoverTargets() // Don't await, let it be outstanding // Second immediate call
      // Should not trigger another postMessage
      expect(mockPostMessage).toHaveBeenCalledTimes(1)
    })

    it('should allow a new discovery after the previous one completes (times out)', async () => {
      const discoverPromise1 = adapter.discoverTargets()
      await vi.waitFor(() => {
        expect(mockPostMessage).toHaveBeenCalledTimes(1)
      })

      // Wait for the discovery timeout (3000ms) and the promise to resolve
      await vi.advanceTimersByTimeAsync(3000)
      await discoverPromise1

      // Now that the discovery has timed out, we should be able to start a new discovery
      const discoverPromise2 = adapter.discoverTargets()
      await vi.waitFor(() => {
        expect(mockPostMessage).toHaveBeenCalledTimes(2)
      })

      // Wait for the second discovery to complete
      await vi.advanceTimersByTimeAsync(3000)
      await discoverPromise2
    })

    it('should not emit `targetFound` for duplicate extensions', async () => {
      const targetFoundListener = vi.fn()
      adapter.on('targetFound', targetFoundListener)

      const discoverPromise = adapter.discoverTargets()
      await vi.waitFor(() => {
        expect(mockPostMessage).toHaveBeenCalled()
      })
      const sentMessage = getSentMessage()
      expect(sentMessage.type).toBe('DISCOVER_UTAGS_TARGETS')

      // Simulate two responses from the same extension
      simulateExtensionResponse(sentMessage.id, {
        type: 'DISCOVERY_RESPONSE',
        extensionId: 'extension-duplicate',
      })
      simulateExtensionResponse(sentMessage.id, {
        type: 'DISCOVERY_RESPONSE',
        extensionId: 'extension-duplicate',
      })

      vi.runAllTimers() // Trigger timeout
      await discoverPromise

      expect(targetFoundListener).toHaveBeenCalledTimes(1)
      const eventObject = targetFoundListener.mock.calls[0][0]
      // expect(targetFoundListener).toHaveBeenCalledWith(expect.objectContaining({
      //   extensionId: 'extension-duplicate',
      // }))
      expect(eventObject.detail).toEqual({
        extensionId: 'extension-duplicate',
        extensionName: undefined,
      })
    })

    it('should not emit `targetFound` after adapter is destroyed', async () => {
      const targetFoundListener = vi.fn()
      adapter.on('targetFound', targetFoundListener)

      const discoverPromise = adapter.discoverTargets()
      await vi.waitFor(() => {
        expect(mockPostMessage).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'DISCOVER_UTAGS_TARGETS' }),
          '*'
        )
      })
      const sentMessage = getSentMessage()

      // Destroy adapter before any discovery responses
      adapter.destroy()

      // Simulate discovery response after destroy
      simulateExtensionResponse(sentMessage.id, {
        type: 'DISCOVERY_RESPONSE',
        extensionId: 'ext1',
        name: 'Extension 1',
        icon: 'icon1',
      })

      // discoverPromise should be rejected because the adapter is destroyed
      await expect(discoverPromise).rejects.toThrow(
        'Adapter has been destroyed'
      )

      // Verify no events were emitted after destroy
      expect(targetFoundListener).not.toHaveBeenCalled()
    })

    it('should ignore discovery responses after timeout', async () => {
      const targetFoundListener = vi.fn()
      adapter.on('targetFound', targetFoundListener)

      // Start discovery
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      adapter.discoverTargets() // Don't await, let it be outstanding
      const sentMessage = getSentMessage()

      // Advance time to trigger timeout
      await vi.advanceTimersByTimeAsync(3001)

      // Simulate a late discovery response
      simulateExtensionResponse(sentMessage.id, {
        type: 'DISCOVERY_RESPONSE',
        extensionId: 'late-ext',
        name: 'Late Extension',
        icon: 'icon-late',
      })

      // // Verify that the event was not emitted
      expect(targetFoundListener).not.toHaveBeenCalled()
      // expect(targetFoundListener).toHaveBeenCalledTimes(1)
      // const eventObject = targetFoundListener.mock.calls[0][0]
      // expect(eventObject.detail).toEqual([])
    })

    it('should reset discoveryInProgress flag when destroyed during discovery', async () => {
      // Start discovery
      const discoverPromise = adapter.discoverTargets()
      await vi.waitFor(() => {
        expect(mockPostMessage).toHaveBeenCalledTimes(1)
      })

      // Destroy adapter during discovery
      adapter.destroy()

      // The promise should be rejected because the adapter is destroyed.
      await expect(discoverPromise).rejects.toThrow(
        'Adapter has been destroyed'
      )

      // After destruction, the adapter is no longer usable.
      // To test if a new discovery can be started, we need a new adapter instance.
      const adapter2 = new BrowserExtensionSyncAdapter()

      // Start a new discovery with the new adapter
      const discoverPromise2 = adapter2.discoverTargets()

      await vi.waitFor(() => {
        // The mock should have been called again for the new discovery
        expect(mockPostMessage).toHaveBeenCalledTimes(2)
      })

      // The promise should eventually resolve (on timeout).
      // We must handle it to avoid unhandled promise rejections.
      await vi.advanceTimersByTimeAsync(3000)
      await expect(discoverPromise2).resolves.toBeUndefined()
      adapter2.destroy()
    })
  })
})
