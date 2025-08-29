/**
 * UTags HTTP Proxy - Browser Extension Background Script
 * Handles actual HTTP requests using fetch API with full CORS bypass
 */

console.log('UTags HTTP Proxy extension background script loaded')

// Storage keys
const STORAGE_KEYS = {
  REQUEST_COUNT: 'utags_request_count',
  LAST_ACTIVITY: 'utags_last_activity',
}

/**
 * Update request statistics
 */
async function updateStatistics() {
  try {
    const result = await chrome.storage.local.get([STORAGE_KEYS.REQUEST_COUNT])
    const currentCount = result[STORAGE_KEYS.REQUEST_COUNT] || 0

    await chrome.storage.local.set({
      [STORAGE_KEYS.REQUEST_COUNT]: currentCount + 1,
      [STORAGE_KEYS.LAST_ACTIVITY]: Date.now(),
    })

    console.log(
      `[UTags Extension Background] Request count updated: ${currentCount + 1}`
    )
  } catch (error) {
    console.error(
      '[UTags Extension Background] Error updating statistics:',
      error
    )
  }
}

/**
 * Handle HTTP request from content script
 * @param {Object} request - The HTTP request details
 * @returns {Promise<Object>} Response object
 */
async function handleHttpRequest(request) {
  // Update statistics
  await updateStatistics()
  const { method, url, headers, body, timeout } = request.payload

  console.log(
    `[UTags Extension Background] Processing HTTP request: ${method} ${url}`
  )

  try {
    // Create AbortController for timeout handling
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort()
    }, timeout || 30_000)

    // Make the actual HTTP request
    const response = await fetch(url, {
      method,
      headers: headers || {},
      body,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    // Parse response headers
    const responseHeaders = {}
    for (const [key, value] of response.headers.entries()) {
      responseHeaders[key] = value
    }

    // Get response body
    const responseBody = await response.text()

    console.log(
      `[UTags Extension Background] HTTP request successful: ${response.status}`
    )

    return {
      success: true,
      data: {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body: responseBody,
      },
    }
  } catch (error) {
    console.error(`[UTags Extension Background] HTTP request failed:`, error)

    let errorMessage = 'Network error'
    if (error.name === 'AbortError') {
      errorMessage = 'Request timeout'
    } else if (error.message) {
      errorMessage = error.message
    }

    return {
      success: false,
      error: errorMessage,
      details: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    }
  }
}

/**
 * Message listener for content script communication
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log(`[UTags Extension Background] Received message:`, message.type)

  if (message.type === 'HTTP_REQUEST') {
    // Handle HTTP request asynchronously
    handleHttpRequest(message)
      .then((response) => {
        sendResponse(response)
      })
      .catch((error) => {
        console.error(
          '[UTags Extension Background] Error handling HTTP request:',
          error
        )
        sendResponse({
          success: false,
          error: 'Internal extension error',
          details: error,
        })
      })

    // Return true to indicate we will send a response asynchronously
    return true
  }

  // Handle other message types if needed
  console.log(
    `[UTags Extension Background] Unknown message type: ${message.type}`
  )
  sendResponse({ success: false, error: 'Unknown message type' })
})

/**
 * Extension installation/startup handler
 */
chrome.runtime.onInstalled.addListener((details) => {
  console.log(
    '[UTags Extension Background] Extension installed/updated:',
    details.reason
  )

  if (details.reason === 'install') {
    console.log('[UTags Extension Background] First time installation')
  } else if (details.reason === 'update') {
    console.log('[UTags Extension Background] Extension updated')
  }
})

/**
 * Extension startup handler
 */
chrome.runtime.onStartup.addListener(() => {
  console.log('[UTags Extension Background] Extension started')
})

console.log('[UTags Extension Background] Background script ready')
