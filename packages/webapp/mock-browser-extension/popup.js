/**
 * UTags HTTP Proxy - Browser Extension Popup Script
 * Handles popup UI interactions and displays extension status
 */

// Storage keys
const STORAGE_KEYS = {
  REQUEST_COUNT: 'utags_request_count',
  LAST_ACTIVITY: 'utags_last_activity',
}

/**
 * Initialize popup when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[UTags Extension Popup] Initializing popup')

  await updateStatus()
  setupEventListeners()
})

/**
 * Update extension status display
 */
async function updateStatus() {
  try {
    // Get stored statistics
    const result = await chrome.storage.local.get([
      STORAGE_KEYS.REQUEST_COUNT,
      STORAGE_KEYS.LAST_ACTIVITY,
    ])

    const requestCount = result[STORAGE_KEYS.REQUEST_COUNT] || 0
    const lastActivity = result[STORAGE_KEYS.LAST_ACTIVITY]

    // Update UI elements
    document.querySelector('#request-count').textContent =
      requestCount.toString()

    if (lastActivity) {
      const lastActivityDate = new Date(lastActivity)
      const now = new Date()
      const diffMinutes = Math.floor((now - lastActivityDate) / (1000 * 60))

      let activityText
      if (diffMinutes < 1) {
        activityText = 'Just now'
      } else if (diffMinutes < 60) {
        activityText = `${diffMinutes}m ago`
      } else if (diffMinutes < 1440) {
        const hours = Math.floor(diffMinutes / 60)
        activityText = `${hours}h ago`
      } else {
        const days = Math.floor(diffMinutes / 1440)
        activityText = `${days}d ago`
      }

      document.querySelector('#last-activity').textContent = activityText
    } else {
      document.querySelector('#last-activity').textContent = 'Never'
    }

    console.log('[UTags Extension Popup] Status updated')
  } catch (error) {
    console.error('[UTags Extension Popup] Error updating status:', error)
  }
}

/**
 * Setup event listeners for popup buttons
 */
function setupEventListeners() {
  // Clear statistics button
  document.querySelector('#clear-stats').addEventListener('click', async () => {
    try {
      await chrome.storage.local.remove([
        STORAGE_KEYS.REQUEST_COUNT,
        STORAGE_KEYS.LAST_ACTIVITY,
      ])
      await updateStatus()
      console.log('[UTags Extension Popup] Statistics cleared')
    } catch (error) {
      console.error('[UTags Extension Popup] Error clearing statistics:', error)
    }
  })

  // Test connection button
  document
    .querySelector('#test-connection')
    .addEventListener('click', async () => {
      const button = document.querySelector('#test-connection')
      const originalText = button.textContent

      try {
        button.textContent = 'Testing...'
        button.disabled = true

        // Test connection by making a simple HTTP request
        const testUrl = 'https://httpbin.org/get'
        const response = await chrome.runtime.sendMessage({
          type: 'HTTP_REQUEST',
          id: `test-${Date.now()}`,
          payload: {
            method: 'GET',
            url: testUrl,
            headers: {},
            timeout: 5000,
          },
        })

        if (response.success) {
          button.textContent = '✓ Success'
          button.style.background = '#10b981'
          console.log('[UTags Extension Popup] Test connection successful')
        } else {
          button.textContent = '✗ Failed'
          button.style.background = '#ef4444'
          console.error(
            '[UTags Extension Popup] Test connection failed:',
            response.error
          )
        }
      } catch (error) {
        button.textContent = '✗ Error'
        button.style.background = '#ef4444'
        console.error('[UTags Extension Popup] Test connection error:', error)
      } finally {
        setTimeout(() => {
          button.textContent = originalText
          button.disabled = false
          button.style.background = ''
        }, 2000)
      }
    })
}

/**
 * Listen for storage changes to update UI in real-time
 */
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    const relevantKeys = Object.keys(changes).filter((key) =>
      Object.values(STORAGE_KEYS).includes(key)
    )

    if (relevantKeys.length > 0) {
      console.log('[UTags Extension Popup] Storage changed, updating status')
      updateStatus()
    }
  }
})

console.log('[UTags Extension Popup] Popup script loaded')
