/**
 * Universal HTTP client with CORS bypass support
 * Supports fetch, XMLHttpRequest, and userscript GM.xmlHttpRequest
 */

// Userscript environment type declarations
declare global {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  type GM = {
    xmlHttpRequest: (details: {
      method: string
      url: string
      headers?: Record<string, string>
      data?: string
      onload?: (response: {
        status: number
        statusText: string
        responseText: string
        responseHeaders: string
      }) => void
      onerror?: (error: { statusText?: string }) => void
      ontimeout?: () => void
    }) => void
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention
  const GM: GM | undefined
}

/**
 * HTTP request options
 */
export type HttpRequestOptions = {
  method: string
  url: string
  headers?: Record<string, string>
  body?: string
  timeout?: number
}

/**
 * HTTP response interface compatible with fetch Response
 */
export type HttpResponse = {
  ok: boolean
  status: number
  statusText: string
  headers: Headers
  text(): Promise<string>
  json(): Promise<any>
  arrayBuffer(): Promise<ArrayBuffer>
}

/**
 * Environment detection utilities
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const EnvironmentDetector = {
  // Cache for message proxy availability check
  _messageProxyCache: undefined as boolean | undefined,
  _messageProxyCacheTimestamp: 0,
  // Cache validity duration in milliseconds (5 minutes)
  _cacheValidityDuration: 5 * 60 * 1000,

  /**
   * Detect if running in userscript environment
   */
  isUserscriptEnvironment(): boolean {
    return (
      typeof GM !== 'undefined' &&
      GM !== null &&
      typeof GM.xmlHttpRequest === 'function'
    )
  },

  /**
   * Detect if running in browser extension environment
   */
  isBrowserExtensionEnvironment(): boolean {
    // TODO: Implement browser extension detection when extension API is available
    return false
  },

  /**
   * Detect if running in regular browser environment
   */
  isBrowserEnvironment(): boolean {
    return (
      typeof globalThis !== 'undefined' && typeof XMLHttpRequest !== 'undefined'
    )
  },

  /**
   * Check if message proxy is available for cross-origin requests
   * Uses caching to avoid repeated PING/PONG tests
   */
  async isMessageProxyAvailable(): Promise<boolean> {
    const now = Date.now()

    // Return cached result if still valid
    if (
      this._messageProxyCache !== undefined &&
      now - this._messageProxyCacheTimestamp < this._cacheValidityDuration
    ) {
      console.log(
        'is messageProxyHttpClient available (2)',
        this._messageProxyCache
      )
      return this._messageProxyCache
    }

    try {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      const { MessageProxyEnvironmentDetector } = await import(
        './message-proxy-http-client.js'
      )
      const isAvailable =
        await MessageProxyEnvironmentDetector.isMessageProxyAvailable()

      // Cache the result
      this._messageProxyCache = isAvailable
      this._messageProxyCacheTimestamp = now

      console.log('is messageProxyHttpClient available (1)', isAvailable)
      return isAvailable
    } catch {
      // Cache negative result on error
      this._messageProxyCache = false
      this._messageProxyCacheTimestamp = now
      return false
    }
  },

  /**
   * Clear the message proxy availability cache
   * Useful for testing or when proxy status might have changed
   */
  clearMessageProxyCache(): void {
    this._messageProxyCache = undefined
    this._messageProxyCacheTimestamp = 0
  },
}

/**
 * Universal HTTP client with automatic environment detection
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const HttpClient = {
  /**
   * Make HTTP request with automatic environment detection
   * Prioritizes message proxy for cross-origin requests
   */
  async request(options: HttpRequestOptions): Promise<HttpResponse> {
    // First, try message proxy for cross-origin requests
    try {
      if (await EnvironmentDetector.isMessageProxyAvailable()) {
        const { messageProxyHttpClient } = await import(
          './message-proxy-http-client.js'
        )
        return await messageProxyHttpClient.request(options)
      }
    } catch (error) {
      console.warn(
        'Message proxy not available, falling back to direct request:',
        error
      )
    }

    // Fallback to direct requests based on environment
    if (EnvironmentDetector.isUserscriptEnvironment()) {
      return UserscriptHttpClient.request(options)
    }

    if (EnvironmentDetector.isBrowserExtensionEnvironment()) {
      return BrowserExtensionHttpClient.request(options)
    }

    if (EnvironmentDetector.isBrowserEnvironment()) {
      return BrowserHttpClient.request(options)
      // return FetchHttpClient.request(options)
    }

    throw new Error('Unsupported environment for HTTP requests')
  },
}

/**
 * Userscript HTTP client using GM.xmlHttpRequest
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class UserscriptHttpClient {
  /**
   * Make HTTP request using GM.xmlHttpRequest
   */
  static async request(options: HttpRequestOptions): Promise<HttpResponse> {
    if (!GM || !GM.xmlHttpRequest) {
      throw new Error('GM.xmlHttpRequest is not available')
    }

    return new Promise((resolve, reject) => {
      GM.xmlHttpRequest({
        method: options.method,
        url: options.url,
        headers: options.headers,
        data: options.body,
        onload: (response) => {
          const httpResponse = this.createResponseObject(response)
          resolve(httpResponse)
        },
        onerror(error) {
          reject(
            new Error(`Request failed: ${error.statusText || 'Unknown error'}`)
          )
        },
        ontimeout() {
          reject(new Error('Request timeout'))
        },
      })
    })
  }

  /**
   * Create Response-like object from GM.xmlHttpRequest response
   */
  private static createResponseObject(response: {
    status: number
    statusText: string
    responseText: string
    responseHeaders: string
  }): HttpResponse {
    const headers = new Headers()

    // Parse response headers
    if (response.responseHeaders) {
      const headerLines = response.responseHeaders.split('\r\n')
      for (const line of headerLines) {
        const [key, value] = line.split(': ')
        if (key && value) {
          headers.set(key.toLowerCase(), value)
        }
      }
    }

    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      statusText: response.statusText,
      headers,
      text: async () => response.responseText,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      json: async () => JSON.parse(response.responseText),
      async arrayBuffer() {
        // Convert string to ArrayBuffer
        const encoder = new TextEncoder()
        const uint8Array = encoder.encode(response.responseText)
        const buffer = new ArrayBuffer(uint8Array.length)
        new Uint8Array(buffer).set(uint8Array)
        return buffer
      },
    }
  }
}

/**
 * Browser HTTP client using XMLHttpRequest
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class BrowserHttpClient {
  /**
   * Make HTTP request using XMLHttpRequest
   */
  static async request(options: HttpRequestOptions): Promise<HttpResponse> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open(options.method, options.url, true)

      // Set headers
      if (options.headers) {
        for (const [key, value] of Object.entries(options.headers)) {
          xhr.setRequestHeader(key, value)
        }
      }

      // Set timeout
      if (options.timeout) {
        xhr.timeout = options.timeout
      }

      // eslint-disable-next-line unicorn/prefer-add-event-listener
      xhr.onload = () => {
        const httpResponse = this.createResponseObject(xhr)
        resolve(httpResponse)
      }

      // eslint-disable-next-line unicorn/prefer-add-event-listener
      xhr.onerror = () => {
        reject(new Error('Network Error'))
      }

      xhr.ontimeout = () => {
        reject(new Error('Request timeout'))
      }

      xhr.send(options.body)
    })
  }

  /**
   * Create Response-like object from XMLHttpRequest
   */
  private static createResponseObject(xhr: XMLHttpRequest): HttpResponse {
    const headers = new Headers()

    // Parse response headers
    const responseHeaders = xhr.getAllResponseHeaders()
    if (responseHeaders) {
      const headerLines = responseHeaders.split('\r\n')
      for (const line of headerLines) {
        const [key, value] = line.split(': ')
        if (key && value) {
          headers.set(key.toLowerCase(), value)
        }
      }
    }

    return {
      ok: xhr.status >= 200 && xhr.status < 300,
      status: xhr.status,
      statusText: xhr.statusText,
      headers,
      text: async () => xhr.responseText,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      json: async () => JSON.parse(xhr.responseText),
      async arrayBuffer() {
        // Convert string to ArrayBuffer
        const encoder = new TextEncoder()
        const uint8Array = encoder.encode(xhr.responseText)
        const buffer = new ArrayBuffer(uint8Array.length)
        new Uint8Array(buffer).set(uint8Array)
        return buffer
      },
    }
  }
}

/**
 * Browser extension HTTP client (placeholder for future implementation)
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const BrowserExtensionHttpClient = {
  /**
   * Make HTTP request using browser extension APIs
   */
  async request(options: HttpRequestOptions): Promise<HttpResponse> {
    // TODO: Implement browser extension request when extension API is available
    // For now, fallback to standard XMLHttpRequest
    return BrowserHttpClient.request(options)
  },
}

/**
 * Fetch-based HTTP client for environments that support fetch
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const FetchHttpClient = {
  /**
   * Make HTTP request using fetch API
   */
  async request(options: HttpRequestOptions): Promise<HttpResponse> {
    const response = await fetch(options.url, {
      method: options.method,
      headers: options.headers,
      body: options.body,
    })

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      text: async () => response.text(),
      json: async () => response.json(),
      arrayBuffer: async () => response.arrayBuffer(),
    }
  },
}
