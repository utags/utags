/**
 * UTags HTTP Proxy - Browser Extension Content Script
 * Handles communication between webapp and background script for HTTP requests
 */

console.log('UTags HTTP Proxy extension content script loaded')

/**
 * Handle HTTP request message from webapp
 * @param {Object} message - The HTTP request message
 * @param {MessageEvent} event - The message event
 */
function handleHttpRequest(message, event) {
  const { id, payload } = message

  console.log(
    `[UTags Extension] Processing HTTP request: ${payload.method} ${payload.url}`
  )

  // Forward request to background script
  chrome.runtime
    .sendMessage({
      type: 'HTTP_REQUEST',
      id,
      payload,
    })
    .then((response) => {
      if (response.success) {
        sendHttpResponse(id, response.data, event)
      } else {
        sendHttpError(id, response.error, event, response.details)
      }
    })
    .catch((error) => {
      console.error(
        '[UTags Extension] Error communicating with background script:',
        error
      )
      sendHttpError(id, 'Extension communication error', event, error)
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
  console.log('[UTags Extension] Received ping, sending pong')

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

      default: {
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

// Setup message listener
window.addEventListener('message', messageListener)

// Announce extension availability
console.log('[UTags Extension] Content script ready for HTTP proxy requests')

// Optional: Send a ready signal to webapp
// Note: This uses window.postMessage as it's not a response to a specific message
setTimeout(() => {
  const readyMessage = {
    type: 'EXTENSION_READY',
    source: 'utags-extension',
    id: `ready-${Date.now()}`,
    payload: {
      name: 'UTags HTTP Proxy Extension',
      version: '1.0.0',
    },
  }
  window.postMessage(readyMessage, '*')
}, 100)
