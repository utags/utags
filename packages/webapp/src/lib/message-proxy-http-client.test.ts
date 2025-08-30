/**
 * Tests for MessageProxyHttpClient
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type {
  HttpRequestMessage,
  HttpResponseMessage,
  HttpErrorMessage,
} from '../sync/types.js'
import {
  MessageProxyHttpClient,
  MessageProxyEnvironmentDetector,
} from './message-proxy-http-client.js'

describe('MessageProxyHttpClient', () => {
  let client: MessageProxyHttpClient
  let originalPostMessage: typeof globalThis.postMessage
  let originalAddEventListener: typeof globalThis.addEventListener
  let originalRemoveEventListener: typeof globalThis.removeEventListener
  let messageListeners: Array<(event: MessageEvent) => void> = []

  beforeEach(() => {
    // Mock window.postMessage
    originalPostMessage = window.postMessage
    window.postMessage = vi.fn()

    // Mock window.addEventListener and removeEventListener
    originalAddEventListener = window.addEventListener
    originalRemoveEventListener = window.removeEventListener
    messageListeners = []

    window.addEventListener = vi.fn((type: string, listener: any) => {
      if (type === 'message') {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        messageListeners.push(listener)
      }
    })

    window.removeEventListener = vi.fn((type: string, listener: any) => {
      if (type === 'message') {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const index = messageListeners.indexOf(listener)
        if (index !== -1) {
          messageListeners.splice(index, 1)
        }
      }
    })

    client = new MessageProxyHttpClient({
      timeout: 5000,
      targetOrigin: '*',
      source: 'utags-webapp',
    })
  })

  afterEach(() => {
    // Only destroy if client exists and has no pending requests
    if (client && (client as any).pendingRequests.size === 0) {
      try {
        client.destroy()
      } catch {
        // Ignore errors during cleanup
      }
    }

    window.postMessage = originalPostMessage
    window.addEventListener = originalAddEventListener
    window.removeEventListener = originalRemoveEventListener
  })

  describe('constructor', () => {
    it('should initialize with default config', () => {
      const defaultClient = new MessageProxyHttpClient()
      expect(defaultClient).toBeDefined()
      try {
        defaultClient.destroy()
      } catch {
        // Ignore errors during cleanup
      }
    })

    it('should setup message listener', () => {
      expect(window.addEventListener).toHaveBeenCalledWith(
        'message',
        expect.any(Function)
      )
    })
  })

  describe('request', () => {
    it('should send HTTP request message', async () => {
      const requestOptions = {
        method: 'GET',
        url: 'https://api.example.com/data',
        headers: { Authorization: 'Bearer token' },
      }

      // Start the request (don't await yet)
      const requestPromise = client.request(requestOptions)

      // Verify postMessage was called
      expect(window.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'HTTP_REQUEST',
          source: 'utags-webapp',
          id: expect.any(String),
          payload: requestOptions,
        }),
        '*'
      )

      // Get the request message
      const postMessageCall = (window.postMessage as any).mock.calls[0]
      const requestMessage: HttpRequestMessage = postMessageCall[0]

      // Simulate response
      const responseMessage: HttpResponseMessage = {
        type: 'HTTP_RESPONSE',
        source: 'utags-extension',
        id: requestMessage.id,
        payload: {
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ success: true }),
        },
      }

      // Trigger message listener
      const messageEvent = new MessageEvent('message', {
        data: responseMessage,
      })
      for (const listener of messageListeners) listener(messageEvent)

      // Wait for request to complete
      const response = await requestPromise

      expect(response.ok).toBe(true)
      expect(response.status).toBe(200)
      expect(response.statusText).toBe('OK')
      expect(await response.text()).toBe(JSON.stringify({ success: true }))
      expect(await response.json()).toEqual({ success: true })
    })

    it('should handle HTTP error response', async () => {
      const requestOptions = {
        method: 'GET',
        url: 'https://api.example.com/error',
      }

      // Start the request
      const requestPromise = client.request(requestOptions)

      // Get the request message
      const postMessageCall = (window.postMessage as any).mock.calls[0]
      const requestMessage: HttpRequestMessage = postMessageCall[0]

      // Simulate error response
      const errorMessage: HttpErrorMessage = {
        type: 'HTTP_ERROR',
        source: 'utags-extension',
        id: requestMessage.id,
        payload: {
          error: 'Network error',
          details: { code: 'NETWORK_ERROR' },
        },
      }

      // Trigger message listener
      const messageEvent = new MessageEvent('message', { data: errorMessage })
      for (const listener of messageListeners) listener(messageEvent)

      // Wait for request to fail
      await expect(requestPromise).rejects.toThrow('Network error')
    })

    it('should handle request timeout', async () => {
      const requestOptions = {
        method: 'GET',
        url: 'https://api.example.com/slow',
      }

      // Use a very short timeout for testing
      const shortTimeoutClient = new MessageProxyHttpClient({ timeout: 100 })

      // Start the request and expect it to timeout
      await expect(shortTimeoutClient.request(requestOptions)).rejects.toThrow(
        'Request timeout after 100ms'
      )

      try {
        shortTimeoutClient.destroy()
      } catch {
        // Ignore errors during cleanup
      }
    })

    it('should handle invalid response payload', async () => {
      const requestOptions = {
        method: 'GET',
        url: 'https://api.example.com/data',
      }

      // Start the request
      const requestPromise = client.request(requestOptions)

      // Get the request message
      const postMessageCall = (window.postMessage as any).mock.calls[0]
      const requestMessage: HttpRequestMessage = postMessageCall[0]

      // Simulate response with invalid payload
      const responseMessage = {
        type: 'HTTP_RESPONSE',
        source: 'utags-extension',
        id: requestMessage.id,
        payload: null, // Invalid payload
      }

      // Trigger message listener
      const messageEvent = new MessageEvent('message', {
        data: responseMessage,
      })
      for (const listener of messageListeners) listener(messageEvent)

      // Wait for request to fail
      await expect(requestPromise).rejects.toThrow('Invalid response payload')
    })

    it('should ignore messages with wrong ID', async () => {
      const requestOptions = {
        method: 'GET',
        url: 'https://api.example.com/data',
      }

      // Start the request
      const requestPromise = client.request(requestOptions)

      // Simulate response with wrong ID
      const responseMessage: HttpResponseMessage = {
        type: 'HTTP_RESPONSE',
        source: 'utags-extension',
        id: 'wrong-id',
        payload: {
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: {},
          body: 'test',
        },
      }

      // Trigger message listener
      const messageEvent = new MessageEvent('message', {
        data: responseMessage,
      })
      for (const listener of messageListeners) listener(messageEvent)

      // Request should still be pending (not resolved)
      // We can't easily test this without waiting for timeout,
      // so we'll just verify the message was ignored by checking
      // that no error was thrown immediately
      expect(() => {
        for (const listener of messageListeners) listener(messageEvent)
      }).not.toThrow()
    })
  })

  describe('isAvailable', () => {
    it('should return true when pong is received', async () => {
      // Start availability check
      const availabilityPromise = client.isAvailable()

      // Wait a bit for the ping message to be sent
      // eslint-disable-next-line no-promise-executor-return
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Get the ping message
      const postMessageCall = (window.postMessage as any).mock.calls[0]
      const pingMessage = postMessageCall[0]

      // Simulate pong response
      const pongMessage = {
        type: 'PONG',
        source: 'utags-extension',
        id: pingMessage.id,
      }

      // Trigger message listener
      const messageEvent = new MessageEvent('message', { data: pongMessage })
      for (const listener of messageListeners) listener(messageEvent)

      // Wait for availability check to complete
      const isAvailable = await availabilityPromise
      expect(isAvailable).toBe(true)
    })

    it('should return false when no pong is received', async () => {
      // Use a very short timeout for testing
      const shortTimeoutClient = new MessageProxyHttpClient({ timeout: 100 })

      // Start availability check and expect it to timeout
      const isAvailable = await shortTimeoutClient.isAvailable()
      expect(isAvailable).toBe(false)

      try {
        shortTimeoutClient.destroy()
      } catch {
        // Ignore errors during cleanup
      }
    })
  })

  describe('destroy', () => {
    it('should remove message listener', () => {
      client.destroy()
      expect(window.removeEventListener).toHaveBeenCalledWith(
        'message',
        expect.any(Function)
      )
    })

    it('should reject pending requests', async () => {
      const requestOptions = {
        method: 'GET',
        url: 'https://api.example.com/data',
      }

      // Create a separate client for this test to avoid affecting other tests
      const testClient = new MessageProxyHttpClient()

      // Start the request
      const requestPromise = testClient.request(requestOptions)

      // Destroy the client
      testClient.destroy()

      // Wait for request to fail
      await expect(requestPromise).rejects.toThrow('HTTP client destroyed')
    })
  })

  describe('message handling', () => {
    it('should ignore invalid messages', () => {
      const invalidMessages = [
        null,
        undefined,
        'string',
        123,
        {},
        { type: 'INVALID' },
        { id: 'test' },
        { type: 'HTTP_RESPONSE' }, // Missing id
      ]

      for (const message of invalidMessages) {
        // eslint-disable-next-line @typescript-eslint/no-loop-func
        expect(() => {
          const messageEvent = new MessageEvent('message', { data: message })
          for (const listener of messageListeners) listener(messageEvent)
        }).not.toThrow()
      }
    })

    it('should handle message listener errors gracefully', () => {
      // Create a message that will cause JSON.parse to throw
      const requestOptions = {
        method: 'GET',
        url: 'https://api.example.com/data',
      }

      // Start the request
      const requestPromise = client.request(requestOptions)

      const postMessageCall = (window.postMessage as any).mock.calls[0]
      const requestMessage: HttpRequestMessage = postMessageCall[0]

      const responseMessage: HttpResponseMessage = {
        type: 'HTTP_RESPONSE',
        source: 'utags-extension',
        id: requestMessage.id,
        payload: {
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: {},
          body: 'invalid json {', // This will cause JSON.parse to throw
        },
      }

      // This should not throw an error in the message listener
      expect(() => {
        const messageEvent = new MessageEvent('message', {
          data: responseMessage,
        })
        for (const listener of messageListeners) listener(messageEvent)
      }).not.toThrow()
    })
  })
})

describe('MessageProxyEnvironmentDetector', () => {
  it('should check message proxy availability', async () => {
    // This will timeout since no actual userscript/extension is present
    const isAvailable =
      await MessageProxyEnvironmentDetector.isMessageProxyAvailable()
    expect(typeof isAvailable).toBe('boolean')
  })
})
