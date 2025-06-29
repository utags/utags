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
  deserializeBookmarks: vi.fn(),
}))

type BrowserExtensionMessage<T> = {
  type: T
  payload?: any
  source: "utags-webapp"
  requestId: string
}

type BrowserExtensionResponse<R> = {
  type: R
  payload?: any
  error?: string
  source: "utags-extension"
  requestId: string
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

// Helper to simulate a message from the webapp
const simulateWebappMessage = async (
  type: string,
  payload?: UploadMessagePayload | undefined
) => {
  const event = new MessageEvent("message", {
    data: {
      type,
      payload,
      source: "utags-webapp",
      requestId: "mock-uuid",
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

describe("SyncAdapter", () => {
  let messageHandler: Mock<(event: MessageEvent) => Promise<void>>

  beforeEach(() => {
    vi.resetAllMocks()

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
    // initSyncAdapter must be called AFTER the mock window is set up
    // so it can capture the spied-upon addEventListener
    initSyncAdapter()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  describe("initSyncAdapter", () => {
    it("should replace the event listener on subsequent calls", () => {
      // After beforeEach, the listener is already added once.
      expect(mockWindow.addEventListener).toHaveBeenCalledTimes(1)
      // In `beforeEach`, `destroySyncAdapter` is called first, then `initSyncAdapter`
      // `initSyncAdapter` also calls `destroySyncAdapter` internally.
      // So `removeEventListener` is called twice.
      expect(mockWindow.removeEventListener).toHaveBeenCalledTimes(2)

      // Call initSyncAdapter multiple times to ensure the listener is replaced
      for (let i = 1; i <= 3; i++) {
        initSyncAdapter()
        // removeEventListener should be called to clean up the previous one
        // 2 initial calls + i calls
        expect(mockWindow.removeEventListener).toHaveBeenCalledTimes(2 + i)
        // addEventListener should be called again
        // 1 initial call + i calls
        expect(mockWindow.addEventListener).toHaveBeenCalledTimes(1 + i)
      }
    })

    it("should initialize successfully and respond to PING with PONG", async () => {
      initSyncAdapter()
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
          requestId: "mock-request-id",
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
      initSyncAdapter()
      await simulateWebappMessage("PING")
      expect(messageHandler).toHaveBeenCalled()
      expect(mockPostMessage).not.toHaveBeenCalled()
    })

    describe("message validation", () => {
      it("should ignore messages with missing 'source'", async () => {
        const malformedEvent = new MessageEvent("message", {
          data: { type: "PING", requestId: "mock-request-id" },
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
      initSyncAdapter()
      await simulateWebappMessage("GET_AUTH_STATUS")
      expect(messageHandler).toHaveBeenCalled()
      expect(mockPostMessage).toHaveBeenCalled()
      const response = getSentMessage()
      expect(response.type).toBe("GET_AUTH_STATUS")
      expect(response.payload).toBe("authenticated")
    })

    it("should handle GET_REMOTE_METADATA request when metadata exists", async () => {
      const existingMetadata = { timestamp: 123, version: "v1" }
      ;(getValue as Mock).mockResolvedValue(existingMetadata)
      initSyncAdapter()
      await simulateWebappMessage("GET_REMOTE_METADATA")
      expect(messageHandler).toHaveBeenCalled()
      expect(mockPostMessage).toHaveBeenCalled()
      const response = getSentMessage()
      expect(response.type).toBe("GET_REMOTE_METADATA")
      expect(response.payload).toEqual({ metadata: existingMetadata })
    })

    it("should return undefined for GET_REMOTE_METADATA when no data exists", async () => {
      ;(getValue as Mock).mockResolvedValue(undefined)
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
      ;(getValue as Mock).mockImplementation(async (key: string) => {
        if (key.includes("metadata")) {
          return mockMetadata
        }

        return undefined // Mock data comes from serializeBookmarks
      })
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
      ;(getValue as Mock).mockResolvedValue(undefined)
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
        ;(getValue as Mock).mockResolvedValue(undefined) // No remote data
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
        const mockData = JSON.stringify({ foo: "bar" })
        await simulateWebappMessage("UPLOAD_DATA", { data: mockData })
        let response = getSentMessage(
          0
        ) as BrowserExtensionResponse<"UPLOAD_DATA">
        expect(response.payload.metadata.version).toBe("v1")

        // Simulate the second upload
        const existingMetadata = (response.payload as UploadMessagePayload)
          .metadata
        ;(getValue as Mock).mockResolvedValue(existingMetadata)

        await simulateWebappMessage("UPLOAD_DATA", {
          data: "new data",
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
        ;(getValue as Mock).mockResolvedValue(existingMetadata)

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
        ;(getValue as Mock).mockResolvedValue(undefined) // No remote metadata

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
        ;(getValue as Mock).mockResolvedValue(existingMetadata)

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
          requestId: uniqueRequestId,
        },
        origin: "https://utags.link",
        source: mockWindow,
      })
      // eslint-disable-next-line @typescript-eslint/await-thenable
      await globalThis.window.dispatchEvent(event)

      expect(mockPostMessage).toHaveBeenCalledOnce()
      const response = getSentMessage()
      expect(response.requestId).toBe(uniqueRequestId)
    })

    it("should not throw error if event.source is missing", async () => {
      // Temporarily remove the source to test the guard clause
      // @ts-expect-error - Removing the source for testing
      mockWindow.self = null

      const event = new MessageEvent("message", {
        data: {
          type: "PING",
          source: "utags-webapp",
          requestId: "no-source-test",
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
        ;(getValue as Mock).mockResolvedValue(existingMetadata)

        await simulateWebappMessage("UPLOAD_DATA", {
          data: "some data",
          metadata: existingMetadata,
        })

        const response = getSentMessage()
        expect(response.payload.metadata.version).toBe("v1")
      })

      it("should default to v1 if version is missing", async () => {
        const existingMetadata = { timestamp: 123, version: undefined }
        ;(getValue as Mock).mockResolvedValue(existingMetadata)

        await simulateWebappMessage("UPLOAD_DATA", {
          data: "some data",
          // @ts-expect-error - for testing
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
        const mockData = JSON.stringify({ foo: "bar" })
        ;(deserializeBookmarks as Mock).mockResolvedValue(undefined)
        ;(setValue as Mock).mockRejectedValue(new Error("Metadata save failed"))
        await simulateWebappMessage("UPLOAD_DATA", { data: mockData })
        const response = getSentMessage()
        expect(response.type).toBe("UPLOAD_DATA")
        expect(response.error).toBe("Metadata save failed")
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
        expect(response2.payload).toBe("authenticated")
      } else {
        expect(response1.type).toBe("GET_AUTH_STATUS")
        expect(response1.payload).toBe("authenticated")
        expect(response2.type).toBe("PING")
        expect(response2.payload).toEqual({ status: "PONG" })
      }
    })
  })
})
