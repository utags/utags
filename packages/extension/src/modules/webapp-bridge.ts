/**
 * HTTP proxy for UTags webapp to bypass CORS restrictions
 */

// Type definitions
type HttpRequestPayload = {
  method: string
  url: string
  headers?: Record<string, string>
  body?: string
  timeout?: number
}

type HttpRequestMessage = {
  type: 'HTTP_REQUEST'
  source: 'utags-webapp'
  id: string
  payload: HttpRequestPayload
}

type PingMessage = {
  type: 'PING'
  source: 'utags-webapp'
  id: string
}

type WebappMessage = HttpRequestMessage | PingMessage

type HttpResponseData = {
  ok: boolean
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
}

type HttpResponseMessage = {
  type: 'HTTP_RESPONSE'
  source: 'utags-extension'
  id: string
  payload: HttpResponseData
}

type HttpErrorMessage = {
  type: 'HTTP_ERROR'
  source: 'utags-extension'
  id: string
  payload: {
    error: string
    details?: any
  }
}

type PongMessage = {
  type: 'PONG'
  source: 'utags-extension'
  id: string
}

type ExtensionMessage = HttpResponseMessage | HttpErrorMessage | PongMessage

type BackgroundResponse = {
  success: boolean
  data?: HttpResponseData
  error?: string
  details?: any
}

// eslint-disable-next-line @typescript-eslint/naming-convention
type GMXMLHttpRequestResponse = {
  status: number
  statusText: string
  responseText: string
  responseHeaders?: string
}

// eslint-disable-next-line @typescript-eslint/naming-convention
type GMXMLHttpRequestOptions = {
  method: string
  url: string
  headers?: Record<string, string>
  data?: string
  timeout?: number
  onload: (response: GMXMLHttpRequestResponse) => void
  onerror: (error: any) => void
  ontimeout: () => void
}

// Global declarations for userscript environment
declare global {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const GM: {
    xmlHttpRequest?: (options: GMXMLHttpRequestOptions) => void
  }
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const GM_xmlhttpRequest: (options: GMXMLHttpRequestOptions) => void
}

/**
 * Handle HTTP request message from webapp
 * @param {HttpRequestMessage} message - The HTTP request message
 * @param {MessageEvent} event - The message event
 */
function handleHttpRequest(
  message: HttpRequestMessage,
  event: MessageEvent
): void {
  if (
    // eslint-disable-next-line n/prefer-global/process
    process.env.PLASMO_TARGET === 'chrome-mv3' ||
    // eslint-disable-next-line n/prefer-global/process
    process.env.PLASMO_TARGET === 'firefox-mv2'
  ) {
    handleHttpRequestExtension(message, event)
  } else {
    handleHttpRequestUserscript(message, event)
  }
}

/**
 * Handle HTTP request message from webapp
 * @param {HttpRequestMessage} message - The HTTP request message
 * @param {MessageEvent} event - The message event
 */
function handleHttpRequestExtension(
  message: HttpRequestMessage,
  event: MessageEvent
): void {
  const { id, payload } = message
  const { method, url } = payload

  console.log(`[UTags Extension] Processing HTTP request: ${method} ${url}`)

  // Forward request to background script
  chrome.runtime
    .sendMessage({
      type: 'HTTP_REQUEST',
      id,
      payload,
    })
    .then((response: BackgroundResponse) => {
      if (response.success) {
        sendHttpResponse(id, response.data!, event)
      } else {
        sendHttpError(id, response.error!, event, response.details)
      }
    })
    .catch((error: unknown) => {
      console.error(
        '[UTags Extension] Error communicating with background script:',
        error
      )
      sendHttpError(id, 'Extension communication error', event, error)
    })
}

/**
 * Handle HTTP request message from webapp
 * @param {HttpRequestMessage} message - The HTTP request message
 * @param {MessageEvent} event - The message event
 */
function handleHttpRequestUserscript(
  message: HttpRequestMessage,
  event: MessageEvent
): void {
  const { id, payload } = message
  const { method, url, headers, body, timeout } = payload

  console.log(`[UTags Extension] Processing HTTP request: ${method} ${url}`)

  // Use GM.xmlHttpRequest or fallback to GM_xmlhttpRequest
  const gmRequest = GM?.xmlHttpRequest || GM_xmlhttpRequest

  if (!gmRequest) {
    sendHttpError(id, 'GM.xmlHttpRequest not available', event)
    return
  }

  gmRequest({
    method,
    url,
    headers: headers || {},
    data: body,
    timeout: timeout || 30_000,
    onload(response) {
      console.log(
        `[UTags Extension] HTTP request successful: ${response.status}`
      )

      // Parse response headers
      const responseHeaders: Record<string, string> = {}
      if (response.responseHeaders) {
        const headerLines = response.responseHeaders.split('\r\n')
        for (const line of headerLines) {
          const [key, value] = line.split(': ')
          if (key && value) {
            responseHeaders[key.toLowerCase()] = value
          }
        }
      }

      sendHttpResponse(
        id,
        {
          ok: response.status >= 200 && response.status < 300,
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
          body: response.responseText,
        },
        event
      )
    },
    onerror(error) {
      console.error(`[UTags Extension] HTTP request failed:`, error)
      sendHttpError(
        id,
        error && typeof error.statusText === 'string'
          ? (error.statusText as string)
          : 'Network error',
        event,
        error
      )
    },
    ontimeout() {
      console.error(`[UTags Extension] HTTP request timeout`)
      sendHttpError(id, 'Request timeout', event)
    },
  })
}

/**
 * Send HTTP response back to webapp
 * @param {string} requestId - The original request ID
 * @param {HttpResponseData} responseData - The response data
 * @param {MessageEvent} event - The message event
 */
function sendHttpResponse(
  requestId: string,
  responseData: HttpResponseData,
  event: MessageEvent
): void {
  const responseMessage: HttpResponseMessage = {
    type: 'HTTP_RESPONSE',
    source: 'utags-extension',
    id: requestId,
    payload: responseData,
  }

  if (event.source) {
    event.source.postMessage(responseMessage, { targetOrigin: event.origin })
  }
}

/**
 * Send HTTP error back to webapp
 * @param {string} requestId - The original request ID
 * @param {string} error - The error message
 * @param {MessageEvent} event - The message event
 * @param {any} details - Additional error details
 */
function sendHttpError(
  requestId: string,
  error: string,
  event: MessageEvent,
  details?: any
): void {
  const errorMessage: HttpErrorMessage = {
    type: 'HTTP_ERROR',
    source: 'utags-extension',
    id: requestId,
    payload: {
      error,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      details,
    },
  }

  if (event.source) {
    event.source.postMessage(errorMessage, { targetOrigin: event.origin })
  }
}

/**
 * Handle ping message from webapp
 * @param {PingMessage} message - The ping message
 * @param {MessageEvent} event - The message event
 */
function handlePing(message: PingMessage, event: MessageEvent): void {
  console.log('[UTags Extension] Received ping, sending pong')

  const pongMessage: PongMessage = {
    type: 'PONG',
    source: 'utags-extension',
    id: message.id,
  }

  if (event.source) {
    event.source.postMessage(pongMessage, { targetOrigin: event.origin })
  }
}

/**
 * Message listener for webapp communication
 */
function messageListener(event: MessageEvent): void {
  // Security check: only accept messages from the same origin
  if (event.origin !== globalThis.location.origin) {
    return
  }

  const message: HttpRequestMessage | PingMessage | undefined = event.data as
    | HttpRequestMessage
    | PingMessage
    | undefined
  try {
    // Validate message structure
    if (
      !message ||
      typeof message !== 'object' ||
      !message.type ||
      !message.id
    ) {
      return
    }

    // Only handle messages from webapp
    if (message.source !== 'utags-webapp') {
      return
    }

    console.log(`[UTags Extension] Received message:`, message.type)

    switch (message.type) {
      case 'PING': {
        handlePing(message, event)
        break
      }

      case 'HTTP_REQUEST': {
        handleHttpRequest(message, event)
        break
      }

      // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
      default: {
        // @ts-expect-error log invalid types
        console.log(`[UTags Extension] Unknown message type: ${message.type}`)
      }
    }
  } catch (error) {
    console.error('[UTags Extension] Error handling message:', error)
    // Send error response if we have a valid message with ID
    if (message && message.id) {
      sendHttpError(
        message.id,
        error instanceof Error ? error.message : String(error),
        event,
        {
          context: 'messageListener',
          messageType: message.type,
        }
      )
    }
  }
}

export function setupWebappBridge(): void {
  // Setup message listener
  window.addEventListener('message', messageListener)
  // Announce extension availability
  console.log('[UTags Extension] ready for HTTP proxy requests')
}

// Optional: Send a ready signal to webapp
// Note: This uses window.postMessage as it's not a response to a specific message
// setTimeout(() => {
//   const readyMessage = {
//     type: 'EXTENSION_READY',
//     source: 'utags-extension',
//     id: `ready-${Date.now()}`,
//     payload: {
//       name: 'UTags HTTP Proxy Extension',
//       version: '1.0.0',
//     },
//   }
//   window.postMessage(readyMessage, '*')
// }, 100)
