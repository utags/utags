import { getValue, setValue } from "browser-extension-storage"
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from "vitest"

import { deserializeBookmarks, serializeBookmarks } from "../storage/bookmarks"
import {
  destroySyncAdapter,
  initSyncAdapter,
  type SyncMetadata,
} from "./sync-adapter"

vi.mock("browser-extension-storage", () => ({
  getValue: vi.fn(),
  setValue: vi.fn(),
  addValueChangeListener: vi.fn(),
}))

vi.mock("../storage/bookmarks", () => ({
  serializeBookmarks: vi.fn(),
  deserializeBookmarks: vi.fn((data: string) => {
    // Try to parse the data as JSON
    const bookmarksStore = data
      ? (JSON.parse(data) as Record<string, unknown>)
      : undefined
  }),
}))

type BrowserExtensionMessage<T> = {
  type: T
  source: "utags-webapp"
  id: string
  targetExtensionId: string
  payload?: any
}

type BrowserExtensionResponse<R> = {
  type: R
  source: "utags-extension"
  id: string
  extensionId: string
  payload?: any
  error?: string
}

type UploadMessagePayload = {
  data: string
  metadata?: SyncMetadata | undefined
}

// Mock window.postMessage and event listeners
let mockPostMessage: Mock
let mockAddEventListener: Mock
let mockRemoveEventListener: Mock
let mockWindow: Window
let loadMetadataMockValue:
  | SyncMetadata
  | undefined
  | (() => Promise<SyncMetadata | undefined>)
const testExtensionId = "utags-extension"

// Helper to simulate a message from the webapp
const simulateWebappMessage: (
  type: string,
  payload?: UploadMessagePayload | undefined,
  targetExtensionId?: string
) => Promise<void> = async (
  type: string,
  payload?: UploadMessagePayload | undefined,
  targetExtensionId = testExtensionId
) => {
  const event = new MessageEvent("message", {
    data: {
      type,
      payload,
      source: "utags-webapp",
      id: "mock-uuid",
      targetExtensionId,
    },
    origin: "https://utags.link",
    source: mockWindow, // Ensure the source is the mock window
  })
  // eslint-disable-next-line @typescript-eslint/await-thenable
  await globalThis.window.dispatchEvent(event)
}

// Helper to capture sent messages
const getSentMessage = (callIndex = 0) => {
  return mockPostMessage.mock.calls[
    callIndex
  ][0] as BrowserExtensionResponse<any>
}

const setMockMetadata = (
  metadata: SyncMetadata | undefined | (() => Promise<SyncMetadata | undefined>)
) => {
  loadMetadataMockValue = metadata
}

describe("SyncAdapter", () => {
  let messageHandler: Mock<(event: MessageEvent) => Promise<void>>

  beforeEach(async () => {
    vi.resetAllMocks()

    // Mock process.env.PLASMO_TAG to prevent undefined error
    vi.stubEnv("PLASMO_TARGET", "userscript")
    vi.stubEnv("PLASMO_TAG", "dev")

    mockPostMessage = vi.fn()

    // Initialize the spy. It will be reassigned in addEventListener.
    messageHandler = vi.fn()

    mockWindow = {
      // @ts-expect-error - Mocking the window object
      location: {
        origin: "https://utags.link",
        hostname: "utags.link",
        protocol: "https:",
      },
      postMessage: mockPostMessage,
      // @ts-expect-error - Mocking the window object
      self: undefined, // Will be set below
      addEventListener: vi.fn((type, listener) => {
        if (type === "message") {
          // Wrap the original listener in a spy
          messageHandler = vi.fn(
            listener as (event: MessageEvent) => Promise<void>
          )
        }
      }),
      removeEventListener: vi.fn(),
      // @ts-expect-error - Mocking the window object
      dispatchEvent: vi.fn(async (event: MessageEvent) => {
        if (event.type === "message" && messageHandler) {
          await messageHandler(event)
        }

        return true
      }),
    }

    // @ts-expect-error - Mocking the window object
    mockWindow.self = mockWindow

    // @ts-expect-error - Mocking the window object
    globalThis.window = mockWindow
    globalThis.location = mockWindow.location
    vi.stubGlobal("crypto", { randomUUID: () => "mock-uuid" })

    destroySyncAdapter()

    loadMetadataMockValue = undefined
    // Mock getValue to return the extension ID
    ;(getValue as Mock).mockImplementation(async (key: string) => {
      if (key.includes("extension_id")) {
        return testExtensionId
      }

      if (key.includes("metadata")) {
        if (typeof loadMetadataMockValue === "function") {
          const metadata = await loadMetadataMockValue()
          return metadata
        }

        return loadMetadataMockValue
      }

      return undefined // Mock data comes from serializeBookmarks
    })
    // initSyncAdapter must be called AFTER the mock window is set up
    // so it can capture the spied-upon addEventListener
    await initSyncAdapter()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  describe("initSyncAdapter", () => {
    it("should replace the event listener on subsequent calls", async () => {
      // After beforeEach, the listener is already added once.
      expect(mockWindow.addEventListener).toHaveBeenCalledTimes(1)
      // In `beforeEach`, `destroySyncAdapter` is called first, then `initSyncAdapter`
      // `initSyncAdapter` also calls `destroySyncAdapter` internally.
      // So `removeEventListener` is called twice.
      expect(mockWindow.removeEventListener).toHaveBeenCalledTimes(2)

      // Call initSyncAdapter multiple times to ensure the listener is replaced
      for (let i = 1; i <= 3; i++) {
        // eslint-disable-next-line no-await-in-loop
        await initSyncAdapter()
        // removeEventListener should be called to clean up the previous one
        // 2 initial calls + i calls
        expect(mockWindow.removeEventListener).toHaveBeenCalledTimes(2 + i)
        // addEventListener should be called again
        // 1 initial call + i calls
        expect(mockWindow.addEventListener).toHaveBeenCalledTimes(1 + i)
      }
    })

    it("should initialize successfully and respond to PING with PONG", async () => {
      await initSyncAdapter()
      await simulateWebappMessage("PING")
      expect(messageHandler).toHaveBeenCalled()
      expect(mockPostMessage).toHaveBeenCalled()
      const response = getSentMessage()
      expect(response.type).toBe("PING")
      expect(response.payload).toEqual({ status: "PONG" })
      expect(response.source).toBe("utags-extension")
    })

    it("should ignore messages from different origins", async () => {
      const event = new MessageEvent("message", {
        data: {
          type: "PING",
          source: "utags-webapp",
          id: "mock-request-id",
        },
        origin: "https://different-origin.com",
        source: mockWindow,
      })

      // eslint-disable-next-line @typescript-eslint/await-thenable
      await globalThis.window.dispatchEvent(event)
      expect(messageHandler).toHaveBeenCalled()
      expect(mockPostMessage).not.toHaveBeenCalled()
    })

    it("should ignore messages from non-utags domains", async () => {
      vi.stubGlobal("location", {
        hostname: "example.com",
        origin: "https://utags.link", // For testing
      })
      await initSyncAdapter()
      await simulateWebappMessage("PING")
      expect(messageHandler).toHaveBeenCalled()
      expect(mockPostMessage).not.toHaveBeenCalled()
    })

    describe("message validation", () => {
      it("should ignore messages with missing 'source'", async () => {
        const malformedEvent = new MessageEvent("message", {
          data: { type: "PING", id: "mock-request-id" },
          origin: mockWindow.location.origin,
          source: mockWindow,
        })
        // eslint-disable-next-line @typescript-eslint/await-thenable
        await globalThis.window.dispatchEvent(malformedEvent)
        expect(messageHandler).toHaveBeenCalled()
        expect(mockPostMessage).not.toHaveBeenCalled()
      })

      it("should ignore messages with missing 'requestId'", async () => {
        const malformedEvent = new MessageEvent("message", {
          data: { type: "PING", source: "utags-webapp" },
          origin: mockWindow.location.origin,
          source: mockWindow,
        })
        // eslint-disable-next-line @typescript-eslint/await-thenable
        await globalThis.window.dispatchEvent(malformedEvent)
        expect(messageHandler).toHaveBeenCalled()
        expect(mockPostMessage).not.toHaveBeenCalled()
      })

      it("should ignore messages with invalid 'type'", async () => {
        await simulateWebappMessage("INVALID_TYPE")
        expect(messageHandler).toHaveBeenCalled()
        expect(mockPostMessage).not.toHaveBeenCalled()
      })
    })

    it("should handle GET_AUTH_STATUS request", async () => {
      await initSyncAdapter()
      await simulateWebappMessage("GET_AUTH_STATUS")
      expect(messageHandler).toHaveBeenCalled()
      expect(mockPostMessage).toHaveBeenCalled()
      const response = getSentMessage()
      expect(response.type).toBe("GET_AUTH_STATUS")
      expect(response.payload).toEqual({ status: "authenticated" })
    })

    it("should handle GET_REMOTE_METADATA request when metadata exists", async () => {
      const existingMetadata = { timestamp: 123, version: "v1" }
      await initSyncAdapter()
      setMockMetadata(existingMetadata)
      await simulateWebappMessage("GET_REMOTE_METADATA")
      expect(messageHandler).toHaveBeenCalled()
      expect(mockPostMessage).toHaveBeenCalled()
      const response = getSentMessage()
      expect(response.type).toBe("GET_REMOTE_METADATA")
      expect(response.payload).toEqual({ metadata: existingMetadata })
    })

    it("should return undefined for GET_REMOTE_METADATA when no data exists", async () => {
      setMockMetadata(undefined)
      await simulateWebappMessage("GET_REMOTE_METADATA")
      expect(messageHandler).toHaveBeenCalled()
      expect(mockPostMessage).toHaveBeenCalled()
      const response = getSentMessage()
      expect(response.type).toBe("GET_REMOTE_METADATA")
      expect(response.payload.metadata).toBeUndefined()
      expect(response.error).toBeUndefined()
    })

    it("should return data for DOWNLOAD_DATA when data exists", async () => {
      const mockData = JSON.stringify({
        bookmarks: [{ url: "https://example.com" }],
      })
      const mockMetadata = { timestamp: 123, version: "v1" }
      setMockMetadata(mockMetadata)
      ;(serializeBookmarks as Mock).mockResolvedValue(mockData)

      await simulateWebappMessage("DOWNLOAD_DATA")

      expect(messageHandler).toHaveBeenCalled()
      expect(mockPostMessage).toHaveBeenCalled()
      const response = getSentMessage()
      expect(response.type).toBe("DOWNLOAD_DATA")
      expect(response.payload).toEqual({
        data: mockData,
        remoteMeta: mockMetadata,
      })
    })

    it("should return empty data for DOWNLOAD_DATA when no data exists", async () => {
      setMockMetadata(undefined)
      ;(serializeBookmarks as Mock).mockResolvedValue("")

      await simulateWebappMessage("DOWNLOAD_DATA")

      const response = getSentMessage()
      expect(response.type).toBe("DOWNLOAD_DATA")
      expect(response.payload.data).toBe("")
      expect(response.payload.remoteMeta).toBeUndefined()
      expect(response.error).toBeUndefined()
    })

    describe("UPLOAD_DATA handling", () => {
      it("should handle a valid UPLOAD_DATA request when no remote data exists", async () => {
        setMockMetadata(undefined) // No remote data
        const mockData = JSON.stringify({ foo: "bar" })
        await simulateWebappMessage("UPLOAD_DATA", { data: mockData })
        expect(setValue).toHaveBeenCalled()
        expect(messageHandler).toHaveBeenCalled()
        expect(mockPostMessage).toHaveBeenCalled()
        const response = getSentMessage()
        expect(response.type).toBe("UPLOAD_DATA")
        expect(response.payload.metadata).toEqual({
          timestamp: expect.any(Number) as number,
          version: "v1",
        })
      })

      it("should increment version on subsequent uploads", async () => {
        setMockMetadata(undefined) // No remote data
        const mockData = JSON.stringify({ foo: "bar" })
        await simulateWebappMessage("UPLOAD_DATA", { data: mockData })
        let response = getSentMessage(
          0
        ) as BrowserExtensionResponse<"UPLOAD_DATA">
        expect(response.payload.metadata.version).toBe("v1")

        // Simulate the second upload
        const existingMetadata = (response.payload as UploadMessagePayload)
          .metadata
        setMockMetadata(existingMetadata)

        await simulateWebappMessage("UPLOAD_DATA", {
          data: `{"data": "new data"}`,
          metadata: existingMetadata,
        })
        expect(messageHandler).toHaveBeenCalled()
        expect(mockPostMessage).toHaveBeenCalled()
        response = getSentMessage(1)
        expect(response.type).toBe("UPLOAD_DATA")
        expect(response.payload.metadata.version).toBe("v2")
      })

      it("should fail if payload is null", async () => {
        // @ts-expect-error - Testing invalid payload type
        await simulateWebappMessage("UPLOAD_DATA", null)
        expect(messageHandler).toHaveBeenCalled()
        expect(mockPostMessage).toHaveBeenCalled()
        const response = getSentMessage()
        expect(response.type).toBe("UPLOAD_DATA")
        expect(response.error).toBe("UPLOAD_DATA: Invalid payload")
      })

      it("should fail if payload data is not a string", async () => {
        // @ts-expect-error - Testing invalid payload type
        await simulateWebappMessage("UPLOAD_DATA", { data: 123 }) // Invalid data type
        expect(messageHandler).toHaveBeenCalled()
        expect(mockPostMessage).toHaveBeenCalled()
        const response = getSentMessage()
        expect(response.type).toBe("UPLOAD_DATA")
        expect(response.error).toBe("UPLOAD_DATA: Invalid payload")
      })
    })

    describe("UPLOAD_DATA conflicts", () => {
      it("should fail if expected metadata does not match current metadata", async () => {
        const existingMetadata = { timestamp: 2, version: "v1" }
        setMockMetadata(existingMetadata)

        const mockMetadata = { timestamp: 1, version: "v1" } // Mismatched timestamp

        await simulateWebappMessage("UPLOAD_DATA", {
          data: "conflicting data",
          metadata: mockMetadata,
        })

        expect(messageHandler).toHaveBeenCalled()
        expect(mockPostMessage).toHaveBeenCalled()
        const response = getSentMessage()
        expect(response.type).toBe("UPLOAD_DATA")
        expect(response.error).toBe(
          "Conflict: Expected remote metadata does not match current remote metadata."
        )
      })

      it("should fail if expected metadata is provided but no remote data exists", async () => {
        setMockMetadata(undefined) // No remote metadata

        const mockMetadata = { timestamp: 1, version: "v1" }

        await simulateWebappMessage("UPLOAD_DATA", {
          data: "new data",
          metadata: mockMetadata,
        })

        expect(messageHandler).toHaveBeenCalled()
        expect(mockPostMessage).toHaveBeenCalled()
        const response = getSentMessage()
        expect(response.type).toBe("UPLOAD_DATA")
        expect(response.error).toBe(
          "Conflict: Expected remote metadata, but no remote data found."
        )
      })

      it("should fail if remote data exists but no expected metadata is provided", async () => {
        const existingMetadata = { timestamp: 1, version: "v1" }
        setMockMetadata(existingMetadata)

        await simulateWebappMessage("UPLOAD_DATA", {
          data: "new data",
          // No metadata provided
        })

        expect(messageHandler).toHaveBeenCalled()
        expect(mockPostMessage).toHaveBeenCalled()
        const response = getSentMessage()
        expect(response.type).toBe("UPLOAD_DATA")
        expect(response.error).toBe(
          "Conflict: Remote data exists, but no expected metadata (If-Match) was provided. Possible concurrent modification."
        )
      })
    })

    it("should handle unknown message type", async () => {
      await simulateWebappMessage("UNKNOWN_ACTION")
      expect(messageHandler).toHaveBeenCalled()
      expect(mockPostMessage).not.toHaveBeenCalled()
    })

    it("should echo back the same requestId in the response", async () => {
      const uniqueRequestId = `test-id-${Date.now()}`
      const event = new MessageEvent("message", {
        data: {
          type: "PING",
          source: "utags-webapp",
          id: uniqueRequestId,
          targetExtensionId: testExtensionId,
        },
        origin: "https://utags.link",
        source: mockWindow,
      })
      // eslint-disable-next-line @typescript-eslint/await-thenable
      await globalThis.window.dispatchEvent(event)

      expect(mockPostMessage).toHaveBeenCalledOnce()
      const response = getSentMessage()
      expect(response.id).toBe(uniqueRequestId)
    })

    it("should not throw error if event.source is missing", async () => {
      // Temporarily remove the source to test the guard clause
      // @ts-expect-error - Removing the source for testing
      mockWindow.self = null

      const event = new MessageEvent("message", {
        data: {
          type: "PING",
          source: "utags-webapp",
          id: "no-source-test",
        },
        origin: "https://utags.link",
        source: null, // Simulate a scenario where source is not available
      })

      // We expect this to not throw any errors
      await expect(
        globalThis.window.dispatchEvent(event)
      ).resolves.not.toThrow()

      expect(messageHandler).toHaveBeenCalled()
      // And postMessage should not have been called
      expect(mockPostMessage).not.toHaveBeenCalled()
    })

    describe("getVersionNumber logic through UPLOAD_DATA", () => {
      it("should default to v1 if version format is invalid", async () => {
        const existingMetadata = { timestamp: 123, version: "invalid-format" }
        setMockMetadata(existingMetadata)

        await simulateWebappMessage("UPLOAD_DATA", {
          data: `{"data": "some data"}`,
          metadata: existingMetadata,
        })

        const response = getSentMessage()
        expect(response.payload.metadata.version).toBe("v1")
      })

      it("should default to v1 if version is missing", async () => {
        const existingMetadata = {
          timestamp: 123,
          version: undefined,
        } as unknown as SyncMetadata
        setMockMetadata(existingMetadata)

        await simulateWebappMessage("UPLOAD_DATA", {
          data: `{"data": "some data"}`,
          metadata: existingMetadata,
        })

        const response = getSentMessage()
        expect(response.payload.metadata.version).toBe("v1")
      })
    })

    describe("Error Handling", () => {
      it("should handle errors when loading metadata", async () => {
        ;(getValue as Mock).mockRejectedValue(new Error("Storage failed"))
        await simulateWebappMessage("GET_REMOTE_METADATA")
        const response = getSentMessage()
        expect(response.type).toBe("GET_REMOTE_METADATA")
        expect(response.error).toBe("Storage failed")
      })

      it("should handle errors when loading data", async () => {
        ;(serializeBookmarks as Mock).mockRejectedValue(
          new Error("Serialization failed")
        )
        await simulateWebappMessage("DOWNLOAD_DATA")
        const response = getSentMessage()
        expect(response.type).toBe("DOWNLOAD_DATA")
        expect(response.error).toBe("Serialization failed")
      })

      it("should handle errors when saving data", async () => {
        setMockMetadata(undefined) // No remote metadata
        const mockData = JSON.stringify({ foo: "bar" })
        ;(deserializeBookmarks as Mock).mockRejectedValue(
          new Error("Deserialization failed")
        )
        await simulateWebappMessage("UPLOAD_DATA", { data: mockData })
        const response = getSentMessage()
        expect(response.type).toBe("UPLOAD_DATA")
        expect(response.error).toBe("Deserialization failed")
      })

      it("should handle errors when saving metadata", async () => {
        setMockMetadata(undefined) // No remote metadata
        const mockData = JSON.stringify({ foo: "bar" })
        ;(deserializeBookmarks as Mock).mockResolvedValue(undefined)
        ;(setValue as Mock).mockRejectedValue(new Error("Metadata save failed"))
        await simulateWebappMessage("UPLOAD_DATA", { data: mockData })
        const response = getSentMessage()
        expect(response.type).toBe("UPLOAD_DATA")
        expect(response.error).toBe("Metadata save failed")
      })

      it("should handle errors during extension ID initialization", async () => {
        ;(getValue as Mock).mockRejectedValue(
          new Error("Extension ID load failed")
        )

        // Destroy and reinitialize to trigger the error
        destroySyncAdapter()
        await expect(initSyncAdapter()).rejects.toThrow(
          "Extension ID load failed"
        )
      })

      it("should handle non-Error exceptions gracefully", async () => {
        ;(getValue as Mock).mockRejectedValue("String error")
        await simulateWebappMessage("GET_REMOTE_METADATA")
        const response = getSentMessage()
        expect(response.type).toBe("GET_REMOTE_METADATA")
        expect(response.error).toBe("String error")
      })
    })

    it("should handle concurrent messages correctly", async () => {
      const promise1 = simulateWebappMessage("PING")
      const promise2 = simulateWebappMessage("GET_AUTH_STATUS")

      await Promise.all([promise1, promise2])

      expect(messageHandler).toHaveBeenCalledTimes(2)
      expect(mockPostMessage).toHaveBeenCalledTimes(2)

      const response1 = getSentMessage(0)
      const response2 = getSentMessage(1)

      // Check that both responses are valid and for the correct type
      // The order is not guaranteed, so we check both possibilities
      if (response1.type === "PING") {
        expect(response1.payload).toEqual({ status: "PONG" })
        expect(response2.type).toBe("GET_AUTH_STATUS")
        expect(response2.payload).toEqual({ status: "authenticated" })
      } else {
        expect(response1.type).toBe("GET_AUTH_STATUS")
        expect(response1.payload).toEqual({ status: "authenticated" })
        expect(response2.type).toBe("PING")
        expect(response2.payload).toEqual({ status: "PONG" })
      }
    })

    describe("Additional Edge Cases", () => {
      it("should handle messages with empty string data", async () => {
        setMockMetadata(undefined) // No remote metadata
        await simulateWebappMessage("UPLOAD_DATA", { data: "" })
        const response = getSentMessage()
        expect(response.type).toBe("UPLOAD_DATA")
        expect(response.payload?.metadata).toBeDefined()
        expect(response.error).toBeUndefined()
      })

      it("should handle messages with very large data payload", async () => {
        setMockMetadata(undefined) // No remote metadata
        const largeData = "x".repeat(1_000_000) // 1MB of data
        await simulateWebappMessage("UPLOAD_DATA", {
          data: JSON.stringify(largeData),
        })
        const response = getSentMessage()
        expect(response.type).toBe("UPLOAD_DATA")
        expect(response.payload?.metadata).toBeDefined()
      })

      it("should handle malformed JSON in UPLOAD_DATA", async () => {
        setMockMetadata(undefined) // No remote metadata
        const malformedJson = '{"incomplete": '
        await simulateWebappMessage("UPLOAD_DATA", { data: malformedJson })
        const response = getSentMessage()
        // Should still process as it's just a string, validation happens in deserializeBookmarks
        expect(response.type).toBe("UPLOAD_DATA")
        expect(response.payload?.metadata).toBeUndefined()
        expect(response.error).toEqual("Unexpected end of JSON input")
      })

      it("should handle messages with null payload", async () => {
        const event = new MessageEvent("message", {
          data: {
            type: "PING",
            source: "utags-webapp",
            id: "test-null-payload",
            targetExtensionId: testExtensionId,
            payload: null,
          },
          origin: "https://utags.link",
          source: mockWindow,
        })
        // eslint-disable-next-line @typescript-eslint/await-thenable
        await globalThis.window.dispatchEvent(event)

        expect(mockPostMessage).toHaveBeenCalled()
        const response = getSentMessage()
        expect(response.type).toBe("PING")
        expect(response.payload).toEqual({ status: "PONG" })
      })

      it("should handle rapid successive calls to destroySyncAdapter", () => {
        expect(() => {
          destroySyncAdapter()
          destroySyncAdapter()
          destroySyncAdapter()
        }).not.toThrow()
      })

      it("should handle version overflow gracefully", async () => {
        setMockMetadata(undefined) // No remote metadata
        const highVersionMetadata = { timestamp: 123, version: "v999999" }
        setMockMetadata(highVersionMetadata)

        await simulateWebappMessage("UPLOAD_DATA", {
          data: JSON.stringify("test data"),
          metadata: highVersionMetadata,
        })

        const response = getSentMessage()
        expect(response.type).toBe("UPLOAD_DATA")
        expect(response.payload?.metadata.version).toBe("v1000000")
      })

      it("should handle metadata with negative version numbers", async () => {
        setMockMetadata(undefined) // No remote metadata
        const negativeVersionMetadata = { timestamp: 123, version: "v-1" }
        setMockMetadata(negativeVersionMetadata)

        await simulateWebappMessage("UPLOAD_DATA", {
          data: JSON.stringify("test data"),
          metadata: negativeVersionMetadata,
        })

        const response = getSentMessage()
        expect(response.type).toBe("UPLOAD_DATA")
        // Should default to v1 since negative version is invalid
        expect(response.payload?.metadata.version).toBe("v1")
      })

      it("should handle messages with special characters in data", async () => {
        setMockMetadata(undefined) // No remote metadata
        const specialCharsData = JSON.stringify({
          text: 'Hello 世界! 🌍 "quotes" \n\t\r',
          emoji: "🚀💻🎉",
          unicode: "\u0048\u0065\u006C\u006C\u006F",
        })

        await simulateWebappMessage("UPLOAD_DATA", { data: specialCharsData })

        const response = getSentMessage()
        expect(response.type).toBe("UPLOAD_DATA")
        expect(response.payload?.metadata).toBeDefined()
        expect(response.error).toBeUndefined()
      })

      it("should handle timestamp precision edge cases", async () => {
        const preciseTimestamp = 1_234_567_890_123.456
        const metadata = { timestamp: preciseTimestamp, version: "v1" }
        setMockMetadata(metadata)

        await simulateWebappMessage("UPLOAD_DATA", {
          data: JSON.stringify("test"),
          metadata,
        })

        const response = getSentMessage()
        expect(response.type).toBe("UPLOAD_DATA")
        expect(response.payload?.metadata.timestamp).toBeGreaterThan(
          preciseTimestamp
        )
      })

      it("should handle messages when MY_EXTENSION_ID is undefined", async () => {
        destroySyncAdapter() // This sets MY_EXTENSION_ID to undefined

        const event = new MessageEvent("message", {
          data: {
            type: "PING",
            source: "utags-webapp",
            id: "test-no-extension-id",
            targetExtensionId: "*",
          },
          origin: "https://utags.link",
          source: mockWindow,
        })

        // This should not throw an error, but should not respond either
        // eslint-disable-next-line @typescript-eslint/await-thenable
        await globalThis.window.dispatchEvent(event)
        expect(mockPostMessage).not.toHaveBeenCalled()
      })

      it("should handle broadcast messages with targetExtensionId '*'", async () => {
        const event = new MessageEvent("message", {
          data: {
            type: "DISCOVER_UTAGS_TARGETS",
            source: "utags-webapp",
            id: "broadcast-test",
            targetExtensionId: "*", // Broadcast message
          },
          origin: "https://utags.link",
          source: mockWindow,
        })

        // eslint-disable-next-line @typescript-eslint/await-thenable
        await globalThis.window.dispatchEvent(event)

        expect(mockPostMessage).toHaveBeenCalled()
        const response = getSentMessage()
        expect(response.type).toBe("DISCOVERY_RESPONSE")
        expect(response.payload?.extensionId).toBeDefined()
      })
    })

    describe("Security and Validation Tests", () => {
      it("should reject messages from unauthorized origins", async () => {
        const maliciousOrigins = [
          "https://evil.com",
          "http://utags.link", // Wrong protocol
          "https://fake-utags.link",
          "https://utags.link.evil.com",
        ]

        for (const origin of maliciousOrigins) {
          const event = new MessageEvent("message", {
            data: {
              type: "PING",
              source: "utags-webapp",
              id: "malicious-test",
              targetExtensionId: testExtensionId,
            },
            origin,
            source: mockWindow,
          })

          // eslint-disable-next-line @typescript-eslint/await-thenable, no-await-in-loop
          await globalThis.window.dispatchEvent(event)
        }

        // No responses should be sent for malicious origins
        expect(mockPostMessage).not.toHaveBeenCalled()
      })

      it("should reject messages with invalid source field", async () => {
        const invalidSources = [
          "malicious-source",
          "utags-extension", // Wrong source
          "",
          null,
          undefined,
          "utags-webapp", // Valid source
        ]

        for (const source of invalidSources) {
          const event = new MessageEvent("message", {
            data: {
              type: "PING",
              source,
              id: "invalid-source-test-" + source,
              targetExtensionId: testExtensionId,
            },
            origin: "https://utags.link",
            source: mockWindow,
          })

          // eslint-disable-next-line @typescript-eslint/await-thenable, no-await-in-loop
          await globalThis.window.dispatchEvent(event)
        }

        expect(mockPostMessage).toHaveBeenCalledTimes(1)
        const response = getSentMessage()
        expect(response.id).toBe("invalid-source-test-utags-webapp")
      })

      it("should reject messages with missing required fields", async () => {
        const incompleteMessages = [
          { type: "PING" }, // Missing source, id, targetExtensionId
          { source: "utags-webapp" }, // Missing type, id, targetExtensionId
          { type: "PING", source: "utags-webapp" }, // Missing id, targetExtensionId
          { type: "PING", source: "utags-webapp", id: "test" }, // Missing targetExtensionId
          {
            type: "PING",
            source: "utags-webapp",
            id: "valid",
            targetExtensionId: testExtensionId,
          }, // Valid message
        ]

        for (const data of incompleteMessages) {
          const event = new MessageEvent("message", {
            data,
            origin: "https://utags.link",
            source: mockWindow,
          })

          // eslint-disable-next-line @typescript-eslint/await-thenable, no-await-in-loop
          await globalThis.window.dispatchEvent(event)
        }

        expect(mockPostMessage).toHaveBeenCalledTimes(1)
        const response = getSentMessage()
        expect(response.id).toBe("valid")
      })

      it("should reject messages with wrong targetExtensionId", async () => {
        const event = new MessageEvent("message", {
          data: {
            type: "PING",
            source: "utags-webapp",
            id: "wrong-target-test",
            targetExtensionId: "different-extension-id",
          },
          origin: "https://utags.link",
          source: mockWindow,
        })

        // eslint-disable-next-line @typescript-eslint/await-thenable
        await globalThis.window.dispatchEvent(event)
        expect(mockPostMessage).not.toHaveBeenCalled()

        event.data.targetExtensionId = testExtensionId
        // eslint-disable-next-line @typescript-eslint/await-thenable
        await globalThis.window.dispatchEvent(event)
        expect(mockPostMessage).toHaveBeenCalled()
      })

      it("should handle XSS attempts in message data", async () => {
        setMockMetadata(undefined) // No remote metadata
        const xssPayload = '<script>alert("XSS")</script>'
        await simulateWebappMessage("UPLOAD_DATA", { data: xssPayload })

        const response = getSentMessage()
        expect(response.type).toBe("UPLOAD_DATA")
        expect(response.payload?.metadata).toBeUndefined()
        expect(response.error).toContain("is not valid JSON")
      })

      it("should handle SQL injection attempts in data", async () => {
        setMockMetadata(undefined) // No remote metadata
        const sqlInjection = "'; DROP TABLE users; --"
        await simulateWebappMessage("UPLOAD_DATA", { data: sqlInjection })

        const response = getSentMessage()
        expect(response.type).toBe("UPLOAD_DATA")
        expect(response.payload?.metadata).toBeUndefined()
        expect(response.error).toContain("is not valid JSON")
      })
    })

    describe("Performance and Stress Tests", () => {
      it("should handle rapid message bursts", async () => {
        const promises: Array<Promise<void>> = []
        for (let i = 0; i < 10; i++) {
          promises.push(simulateWebappMessage("PING"))
        }

        await Promise.all(promises)

        expect(messageHandler).toHaveBeenCalledTimes(10)
        expect(mockPostMessage).toHaveBeenCalledTimes(10)
      })

      it("should handle mixed message types concurrently", async () => {
        const messageTypes = [
          "PING",
          "GET_AUTH_STATUS",
          "GET_REMOTE_METADATA",
          "DOWNLOAD_DATA",
        ] as const

        const promises: Array<Promise<void>> = messageTypes.map(async (type) =>
          simulateWebappMessage(type)
        )
        await Promise.all(promises)

        expect(messageHandler).toHaveBeenCalledTimes(4)
        expect(mockPostMessage).toHaveBeenCalledTimes(4)

        // Verify all message types were handled
        const responses = Array.from({ length: 4 }, (_, i) => getSentMessage(i))
        const responseTypes: string[] = responses.map((r) => r.type as string)
        expect(responseTypes).toEqual(
          expect.arrayContaining(messageTypes as unknown as string[])
        )
      })

      it("should handle memory-intensive operations", async () => {
        // Mock a large dataset
        const largeBookmarkData = JSON.stringify({
          bookmarks: Array.from({ length: 10_000 }, (_, i) => ({
            url: `https://example${i}.com`,
            title: `Example ${i}`,
            tags: [`tag${i}`, `category${i % 10}`],
          })),
        })

        ;(serializeBookmarks as Mock).mockResolvedValue(largeBookmarkData)

        await simulateWebappMessage("DOWNLOAD_DATA")

        const response = getSentMessage()
        expect(response.type).toBe("DOWNLOAD_DATA")
        expect(response.payload?.data).toBe(largeBookmarkData)
      })
    })

    describe("Async Operation Tests", () => {
      it("should handle slow storage operations", async () => {
        // Mock slow getValue operation
        setMockMetadata(
          async () =>
            new Promise((resolve) =>
              // eslint-disable-next-line no-promise-executor-return, max-nested-callbacks
              setTimeout(() => {
                resolve(undefined)
              }, 100)
            )
        )

        const startTime = Date.now()
        await simulateWebappMessage("GET_REMOTE_METADATA")
        const endTime = Date.now()

        expect(endTime - startTime).toBeGreaterThanOrEqual(100)
        expect(mockPostMessage).toHaveBeenCalled()
      })

      it("should handle storage operation timeouts gracefully", async () => {
        // Mock a very slow operation that might timeout
        setMockMetadata(
          async () =>
            new Promise((resolve) =>
              // eslint-disable-next-line no-promise-executor-return
              setTimeout(() => {
                resolve(undefined)
              }, 4000)
            )
        )

        // This should still complete, just slowly
        await simulateWebappMessage("GET_REMOTE_METADATA")
        expect(mockPostMessage).toHaveBeenCalled()
      })

      it("should handle interleaved async operations", async () => {
        let callCount = 0
        setMockMetadata(async () => {
          const delay = callCount++ * 50 // Increasing delays
          // eslint-disable-next-line no-promise-executor-return
          await new Promise((resolve) => setTimeout(resolve, delay))
          return undefined
        })

        const promises = [
          simulateWebappMessage("GET_REMOTE_METADATA"),
          simulateWebappMessage("GET_REMOTE_METADATA"),
          simulateWebappMessage("GET_REMOTE_METADATA"),
        ]

        await Promise.all(promises)

        expect(mockPostMessage).toHaveBeenCalledTimes(3)
      })
    })

    describe("Edge Case Data Scenarios", () => {
      it("should handle circular reference attempts in data", async () => {
        setMockMetadata(undefined) // No remote metadata
        // This would normally cause JSON.stringify to fail, but we're passing pre-stringified data
        const circularData = '{"self": "reference to self"}'
        await simulateWebappMessage("UPLOAD_DATA", { data: circularData })

        const response = getSentMessage()
        expect(response.type).toBe("UPLOAD_DATA")
        expect(response.payload?.metadata).toBeDefined()
      })

      it("should handle extremely long version strings", async () => {
        const longVersion = "v" + "1".repeat(1000)
        const metadata = { timestamp: 123, version: longVersion }
        setMockMetadata(metadata)

        await simulateWebappMessage("UPLOAD_DATA", {
          data: JSON.stringify("test"),
          metadata,
        })

        const response = getSentMessage()
        expect(response.type).toBe("UPLOAD_DATA")
        // When parsing extremely long numbers, parseInt10 returns Infinity, so version becomes vInfinity
        expect(response.payload?.metadata.version).toBe("vInfinity")
        expect(response.payload?.metadata.version).not.toBe(longVersion)
      })

      it("should handle zero and negative timestamps", async () => {
        const edgeCaseTimestamps = [0, -1, -1_234_567_890]

        for (const timestamp of edgeCaseTimestamps) {
          const metadata = { timestamp, version: "v1" }
          setMockMetadata(metadata)

          // eslint-disable-next-line no-await-in-loop
          await simulateWebappMessage("UPLOAD_DATA", {
            data: JSON.stringify("test"),
            metadata,
          })

          const response = getSentMessage()
          expect(response.type).toBe("UPLOAD_DATA")
          expect(response.payload?.metadata.timestamp).toBeGreaterThan(0)
        }
      })

      it("should handle Unicode and emoji in message IDs", async () => {
        const unicodeId = "test-🚀-世界-\u0048\u0065\u006C\u006C\u006F"
        const event = new MessageEvent("message", {
          data: {
            type: "PING",
            source: "utags-webapp",
            id: unicodeId,
            targetExtensionId: testExtensionId,
          },
          origin: "https://utags.link",
          source: mockWindow,
        })

        // eslint-disable-next-line @typescript-eslint/await-thenable
        await globalThis.window.dispatchEvent(event)

        expect(mockPostMessage).toHaveBeenCalled()
        const response = getSentMessage()
        expect(response.id).toBe(unicodeId)
      })
    })
  })
})
