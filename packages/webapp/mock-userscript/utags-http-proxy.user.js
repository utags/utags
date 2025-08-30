// ==UserScript==
// @name         UTags HTTP Proxy Mock
// @namespace    https://github.com/utags
// @version      1.0.0
// @description  HTTP proxy for UTags webapp to bypass CORS restrictions
// @author       Pipecraft
// @match        *://localhost:*/*
// @match        *://127.0.0.1:*/*
// @match        *://*.github.io/*
// @match        *://*.netlify.app/*
// @match        *://*.vercel.app/*
// @connect      dav.jianguoyun.com
// @connect      *
// @grant        GM.xmlHttpRequest
// @grant        GM_xmlhttpRequest
// @run-at       document-start
// ==/UserScript==

;(function () {
  'use strict'

  console.log('UTags HTTP Proxy userscript loaded')

  /**
   * Handle HTTP request message from webapp
   * @param {Object} message - The HTTP request message
   * @param {MessageEvent} event - The message event
   */
  function handleHttpRequest(message, event) {
    const { id, payload } = message
    const { method, url, headers, body, timeout } = payload

    console.log(`[UTags Proxy] Processing HTTP request: ${method} ${url}`)

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
        console.log(`[UTags Proxy] HTTP request successful: ${response.status}`)

        // Parse response headers
        const responseHeaders = {}
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
        console.error(`[UTags Proxy] HTTP request failed:`, error)
        sendHttpError(id, error.statusText || 'Network error', event, error)
      },
      ontimeout() {
        console.error(`[UTags Proxy] HTTP request timeout`)
        sendHttpError(id, 'Request timeout', event)
      },
    })
  }

  /**
   * Send HTTP response back to webapp
   * @param {string} requestId - The original request ID
   * @param {Object} responseData - The response data
   * @param {MessageEvent} event - The message event
   */
  function sendHttpResponse(requestId, responseData, event) {
    const responseMessage = {
      type: 'HTTP_RESPONSE',
      source: 'utags-extension',
      id: requestId,
      payload: responseData,
    }

    event.source.postMessage(responseMessage, event.origin)
  }

  /**
   * Send HTTP error back to webapp
   * @param {string} requestId - The original request ID
   * @param {string} error - The error message
   * @param {MessageEvent} event - The message event
   * @param {Object} details - Additional error details
   */
  function sendHttpError(requestId, error, event, details = undefined) {
    const errorMessage = {
      type: 'HTTP_ERROR',
      source: 'utags-extension',
      id: requestId,
      payload: {
        error,
        details,
      },
    }

    event.source.postMessage(errorMessage, event.origin)
  }

  /**
   * Handle ping message from webapp
   * @param {Object} message - The ping message
   * @param {MessageEvent} event - The message event
   */
  function handlePing(message, event) {
    console.log('[UTags Proxy] Received ping, sending pong')

    const pongMessage = {
      type: 'PONG',
      source: 'utags-extension',
      id: message.id,
    }

    event.source.postMessage(pongMessage, event.origin)
  }

  /**
   * Message listener for webapp communication
   */
  function messageListener(event) {
    // Security check: only accept messages from the same origin
    if (event.origin !== globalThis.location.origin) {
      return
    }

    const message = event.data
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

      console.log(`[UTags Proxy] Received message:`, message.type)

      switch (message.type) {
        case 'PING': {
          handlePing(message, event)
          break
        }

        case 'HTTP_REQUEST': {
          handleHttpRequest(message, event)
          break
        }

        default: {
          console.log(`[UTags Proxy] Unknown message type: ${message.type}`)
        }
      }
    } catch (error) {
      console.error('[UTags Proxy] Error handling message:', error)
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

  // Setup message listener
  window.addEventListener('message', messageListener)

  // Announce userscript availability
  console.log('[UTags Proxy] Userscript ready for HTTP proxy requests')

  // Optional: Send a ready signal to webapp
  // Note: This uses window.postMessage as it's not a response to a specific message
  setTimeout(() => {
    const readyMessage = {
      type: 'USERSCRIPT_READY',
      source: 'utags-extension',
      id: `ready-${Date.now()}`,
      payload: {
        name: 'UTags HTTP Proxy',
        version: '1.0.0',
      },
    }
    window.postMessage(readyMessage, '*')
  }, 100)
})()
