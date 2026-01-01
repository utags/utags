/**
 * Message-based HTTP client for cross-origin requests
 * Communicates with userscript or browser extension via window.postMessage
 */

import type {
  HttpRequestMessage,
  HttpResponseMessage,
  HttpErrorMessage,
} from '../sync/types.js'
import type { HttpRequestOptions, HttpResponse } from './http-client.js'

/**
 * Configuration for message proxy HTTP client
 */
export type MessageProxyConfig = {
  /** Timeout for waiting for response messages (in milliseconds) */
  timeout?: number
  /** Target origin for postMessage (default: '*') */
  targetOrigin?: string
  /** Source identifier for messages */
  source?: 'utags-webapp' | 'utags-extension'
}

/**
 * HTTP client that uses window.postMessage to communicate with userscript/extension
 * for cross-origin requests
 */
export class MessageProxyHttpClient {
  private readonly config: Required<MessageProxyConfig>
  private readonly pendingRequests = new Map<
    string,
    {
      resolve: (response: HttpResponse) => void
      reject: (error: Error) => void
      timeoutId: number
    }
  >()

  private readonly pendingPings = new Map<
    string,
    {
      resolve: () => void
      reject: (error: Error) => void
      timeoutId: number
    }
  >()

  private messageListener: ((event: MessageEvent) => void) | undefined

  constructor(config: MessageProxyConfig = {}) {
    this.config = {
      timeout: config.timeout ?? 30_000, // 30 seconds default
      targetOrigin: config.targetOrigin ?? '*',
      source: config.source ?? 'utags-webapp',
    }

    this.setupMessageListener()
  }

  /**
   * Make HTTP request via message proxy
   */
  async request(options: HttpRequestOptions): Promise<HttpResponse> {
    return new Promise((resolve, reject) => {
      const requestId = this.generateRequestId()

      // Setup timeout
      const timeoutId: number = globalThis.setTimeout(() => {
        this.pendingRequests.delete(requestId)
        reject(new Error(`Request timeout after ${this.config.timeout}ms`))
      }, this.config.timeout) as unknown as number

      // Store pending request
      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        timeoutId,
      })

      // Send request message
      const requestMessage: HttpRequestMessage = {
        type: 'HTTP_REQUEST',
        source: this.config.source,
        id: requestId,
        payload: {
          method: options.method,
          url: options.url,
          headers: options.headers,
          body: options.body,
          timeout: options.timeout,
        },
      }

      window.postMessage(requestMessage, this.config.targetOrigin)
    })
  }

  /**
   * Check if message proxy is available
   * This method can be used to detect if userscript/extension is present
   */
  async isAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const requestId = this.generateRequestId()
      const timeout = 1000 // 1 second for availability check

      const timeoutId: number = globalThis.setTimeout(() => {
        this.pendingPings.delete(requestId)
        resolve(false)
      }, timeout) as unknown as number

      this.pendingPings.set(requestId, {
        resolve() {
          clearTimeout(timeoutId)
          resolve(true)
        },
        reject() {
          clearTimeout(timeoutId)
          resolve(false)
        },
        timeoutId,
      })

      // Send ping message
      const pingMessage = {
        type: 'PING',
        source: this.config.source,
        id: requestId,
      }

      window.postMessage(pingMessage, this.config.targetOrigin)
    })
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.messageListener) {
      window.removeEventListener('message', this.messageListener)
      this.messageListener = undefined
    }

    // Clear all pending requests
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeoutId)
      try {
        pending.reject(new Error('HTTP client destroyed'))
      } catch {
        // Ignore errors when rejecting pending requests during cleanup
      }
    }

    this.pendingRequests.clear()

    // Clear all pending pings
    for (const [id, pending] of this.pendingPings) {
      clearTimeout(pending.timeoutId)
      try {
        pending.reject(new Error('HTTP client destroyed'))
      } catch {
        // Ignore errors when rejecting pending pings during cleanup
      }
    }

    this.pendingPings.clear()
  }

  /**
   * Setup message listener for responses from userscript/extension
   */
  private setupMessageListener(): void {
    if (this.messageListener) {
      return // Already setup
    }

    this.messageListener = (event: MessageEvent) => {
      try {
        const message = event.data
        if (
          !message ||
          typeof message !== 'object' ||
          !message.type ||
          !message.id
        ) {
          return // Not a valid message
        }

        switch (message.type) {
          case 'HTTP_RESPONSE': {
            this.handleHttpResponse(message as HttpResponseMessage)

            break
          }

          case 'HTTP_ERROR': {
            this.handleHttpError(message as HttpErrorMessage)

            break
          }

          case 'PONG': {
            this.handlePongMessage(message as { type: string; id: string })

            break
          }
          // No default
        }
      } catch (error) {
        console.warn('Error handling message:', error)
      }
    }

    window.addEventListener('message', this.messageListener)
  }

  /**
   * Handle HTTP response message from userscript/extension
   */
  private handleHttpResponse(message: HttpResponseMessage): void {
    const pending = this.pendingRequests.get(message.id)
    if (!pending) {
      return // No pending request for this ID
    }

    this.pendingRequests.delete(message.id)
    clearTimeout(pending.timeoutId)

    if (message.payload) {
      const response = this.createHttpResponse(message.payload)
      pending.resolve(response)
    } else {
      pending.reject(new Error('Invalid response payload'))
    }
  }

  /**
   * Handle HTTP error message from userscript/extension
   */
  private handleHttpError(message: HttpErrorMessage): void {
    const pending = this.pendingRequests.get(message.id)
    if (!pending) {
      return // No pending request for this ID
    }

    this.pendingRequests.delete(message.id)
    clearTimeout(pending.timeoutId)

    const error = new Error(message.payload?.error || 'HTTP request failed')
    if (message.payload?.details) {
      ;(error as any).details = message.payload.details
    }

    pending.reject(error)
  }

  /**
   * Handle PONG message from userscript/extension
   */
  private handlePongMessage(message: { type: string; id: string }): void {
    const pending = this.pendingPings.get(message.id)
    if (!pending) {
      return // Request not found or already handled
    }

    this.pendingPings.delete(message.id)
    clearTimeout(pending.timeoutId)
    pending.resolve()
  }

  /**
   * Create HttpResponse object from response payload
   */
  private createHttpResponse(payload: {
    ok: boolean
    status: number
    statusText: string
    headers: Record<string, string>
    body: string
  }): HttpResponse {
    const headers = new Headers()
    for (const [key, value] of Object.entries(payload.headers)) {
      headers.set(key, value)
    }

    return {
      ok: payload.ok,
      status: payload.status,
      statusText: payload.statusText,
      headers,
      text: async () => payload.body,

      json: async () => JSON.parse(payload.body),
      async arrayBuffer() {
        const encoder = new TextEncoder()
        const uint8Array = encoder.encode(payload.body)
        const buffer = new ArrayBuffer(uint8Array.length)
        new Uint8Array(buffer).set(uint8Array)
        return buffer
      },
    }
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `http-req-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
  }
}

/**
 * Singleton instance for global use
 */
export const messageProxyHttpClient = new MessageProxyHttpClient()

/**
 * Environment detector for message proxy availability
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const MessageProxyEnvironmentDetector = {
  /**
   * Check if message proxy environment is available
   */
  async isMessageProxyAvailable(): Promise<boolean> {
    return messageProxyHttpClient.isAvailable()
  },
}
