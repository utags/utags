// ==UserScript==
// @name         UTags Sync Target Mock
// @namespace    https://github.com/utags
// @version      0.4
// @description  Mocks a browser extension sync target for UTags bookmarks.
// @author       Pipecraft
// @match        *://*/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_log
// ==/UserScript==

;(function () {
  'use strict'

  const SCRIPT_NAME = '[UTags Sync Target Mock]'
  let MY_EXTENSION_ID = '' // Will be set in init
  const STORAGE_KEY_EXTENSION_ID = 'utags_mock_extension_id'
  const SYNC_STORAGE_KEY_DATA = 'utags_mock_sync_data'
  const SYNC_STORAGE_KEY_METADATA = 'utags_mock_sync_metadata'
  // Constants for message types and sources
  const SOURCE_WEBAPP = 'utags-webapp'
  const SOURCE_EXTENSION = 'utags-extension'
  const PING_MESSAGE_TYPE = 'PING'
  const PONG_MESSAGE_TYPE = 'PONG'
  const DISCOVER_MESSAGE_TYPE = 'DISCOVER_UTAGS_TARGETS'
  const DISCOVERY_RESPONSE_TYPE = 'DISCOVERY_RESPONSE'
  const GET_REMOTE_METADATA_MESSAGE_TYPE = 'GET_REMOTE_METADATA'
  const DOWNLOAD_MESSAGE_TYPE = 'DOWNLOAD_DATA'
  const UPLOAD_MESSAGE_TYPE = 'UPLOAD_DATA'
  const GET_AUTH_STATUS_MESSAGE_TYPE = 'GET_AUTH_STATUS'

  /**
   * Saves data using GM_setValue.
   * @param {string} data The data to save.
   */
  async function saveData(data) {
    await GM_setValue(SYNC_STORAGE_KEY_DATA, data)
  }

  /**
   * Loads data using GM_getValue.
   * @returns {Promise<string|null>} The loaded data or null if not found.
   */
  async function loadData() {
    const data = await GM_getValue(SYNC_STORAGE_KEY_DATA, null) // Default to null if not found
    return data || ''
  }

  /**
   * Saves metadata using GM_setValue.
   * @param {object} metadata The metadata to save.
   */
  async function saveMetadata(metadata) {
    await GM_setValue(SYNC_STORAGE_KEY_METADATA, JSON.stringify(metadata))
  }

  /**
   * Loads metadata using GM_getValue.
   * @returns {Promise<object|null>} The loaded metadata or null if not found.
   */
  async function loadMetadata() {
    const metadataString = await GM_getValue(SYNC_STORAGE_KEY_METADATA, null)
    return metadataString ? JSON.parse(metadataString) : null
  }

  /**
   * Deletes data using GM_deleteValue.
   */
  async function deleteData() {
    await GM_deleteValue(SYNC_STORAGE_KEY_DATA)
  }

  /**
   * Deletes metadata using GM_deleteValue.
   */
  async function deleteMetadata() {
    await GM_deleteValue(SYNC_STORAGE_KEY_METADATA)
  }

  /**
   * Get the version number from metadata.
   *
   * @example
   * // Returns 1 for 'v1'
   * getVersionNumber({ version: 'v1' });
   *
   * // Returns 0 for invalid or missing version format
   * getVersionNumber({ version: 'invalid' });
   * getVersionNumber({ version: 'v' });
   * @param {*} metadata
   * @returns
   */
  function getVersionNumber(metadata) {
    return (
      (metadata && metadata.version
        ? Number.parseInt(metadata.version.replace('v', ''), 10)
        : 0) || 0
    )
  }

  // Listen for messages from the web app
  window.addEventListener('message', async (event) => {
    // Security check: only accept messages from the same origin
    if (event.origin !== globalThis.location.origin) {
      // GM_log(`${SCRIPT_NAME} Ignoring message from different origin: ${event.origin}`);
      return
    }

    const message = event.data

    // Validate message structure (must match BrowserExtensionMessage format from the adapter)
    if (
      !message ||
      message.source !== SOURCE_WEBAPP || // Check source
      !message.id || // Check for id
      !message.type || // Check for type (which is the action)
      (message.targetExtensionId !== MY_EXTENSION_ID &&
        message.targetExtensionId !== '*') // Allow broadcast messages
    ) {
      // GM_log(`${SCRIPT_NAME} Ignoring malformed message:`, message);
      return
    }

    GM_log(`${SCRIPT_NAME} Received message:`, message)

    let responsePayload = null
    let error = null

    const { type: actionType, payload, id } = message // 'type' from message is the action
    try {
      const mockRemoteMetadata = await loadMetadata()

      switch (actionType) {
        case DISCOVER_MESSAGE_TYPE: {
          // Respond to discovery broadcasts
          responsePayload = {
            extensionId: MY_EXTENSION_ID,
            extensionName: 'UTags Sync Target Mock',
          } // Example name
          // Send a specific response type for discovery
          event.source.postMessage(
            {
              source: SOURCE_EXTENSION,
              type: DISCOVERY_RESPONSE_TYPE,
              id, // Echo id to potentially correlate, though not strictly necessary for broadcast
              extensionId: MY_EXTENSION_ID,
              payload: responsePayload,
            },
            event.origin
          )
          GM_log(`${SCRIPT_NAME} Responded to discovery broadcast.`)
          return // Stop further processing for this message
        }

        case PING_MESSAGE_TYPE: {
          // Handle PING from adapter's init
          responsePayload = { status: PONG_MESSAGE_TYPE }
          GM_log(`${SCRIPT_NAME} PING received. Responding PONG.`)
          break
        }

        case GET_AUTH_STATUS_MESSAGE_TYPE: {
          // Adapter expects an AuthStatus string
          responsePayload = { status: 'authenticated' } // as AuthStatus
          GM_log(
            `${SCRIPT_NAME} Auth status requested. Responding:`,
            responsePayload
          )
          break
        }

        case GET_REMOTE_METADATA_MESSAGE_TYPE: {
          responsePayload = { metadata: mockRemoteMetadata }
          GM_log(
            `${SCRIPT_NAME} Metadata requested. Responding:`,
            responsePayload
          )
          break
        }

        case DOWNLOAD_MESSAGE_TYPE: {
          const data = await loadData()
          // Adapter expects { data: string | undefined; remoteMeta: SyncMetadata | undefined }
          responsePayload = { data, remoteMeta: mockRemoteMetadata }
          GM_log(`${SCRIPT_NAME} Data requested. Responding:`, responsePayload)
          break
        }

        case UPLOAD_MESSAGE_TYPE: {
          if (!payload || typeof payload.data !== 'string') {
            throw new Error('UPLOAD_DATA: Invalid payload.data')
          }

          // Adapter sends expectedRemoteMeta as 'metadata' in the payload
          const expectedMeta = payload.metadata

          if (expectedMeta && mockRemoteMetadata) {
            if (
              expectedMeta.version !== mockRemoteMetadata.version ||
              expectedMeta.timestamp !== mockRemoteMetadata.timestamp
            ) {
              throw new Error(
                'Conflict: Expected remote metadata does not match current remote metadata.'
              )
            }
          } else if (expectedMeta && !mockRemoteMetadata) {
            throw new Error(
              'Conflict: Expected remote metadata, but no remote data found.'
            )
          } else if (!expectedMeta && mockRemoteMetadata) {
            throw new Error(
              'Conflict: Remote data exists, but no expected metadata (If-Match) was provided. Possible concurrent modification.'
            )
          }

          const newTimestamp = Date.now()
          const oldVersionNumber = getVersionNumber(mockRemoteMetadata)
          const newVersion = `v${oldVersionNumber + 1}`
          const newMeta = { timestamp: newTimestamp, version: newVersion }

          await saveData(payload.data)
          await saveMetadata(newMeta)
          // Adapter expects { metadata: SyncMetadata }
          responsePayload = { metadata: newMeta }
          GM_log(`${SCRIPT_NAME} Data uploaded. New metadata:`, newMeta)
          break
        }

        // INIT and DESTROY are custom for this mock, not part of BrowserExtensionSyncAdapter spec
        case 'INIT': {
          await deleteData()
          await deleteMetadata()
          responsePayload = { success: true }
          GM_log(`${SCRIPT_NAME} Initialized. GM_Storage cleared.`)
          break
        }

        case 'DESTROY': {
          await deleteData()
          await deleteMetadata()
          responsePayload = { success: true }
          GM_log(`${SCRIPT_NAME} Destroyed. GM_Storage cleared.`)
          break
        }

        default: {
          throw new Error(`Unknown message type: ${actionType}`)
        }
      }
    } catch (error_) {
      error = error_.message
      GM_log(`${SCRIPT_NAME} Error processing message:`, error_)
    }

    // Send response back to the web app, matching BrowserExtensionResponse format
    event.source.postMessage(
      {
        // The 'type' in the response message sent by the extension to the adapter isn't strictly used by the adapter's
        // handleExtensionMessage for routing, as it primarily relies on 'id' and 'source'.
        // However, for clarity or potential future use, it could echo the original actionType or use a generic response type.
        // For now, we'll omit it as the adapter doesn't strictly need it in the response message itself.
        source: SOURCE_EXTENSION, // Source must be 'utags-extension'
        id, // Echo back the id
        extensionId: MY_EXTENSION_ID, // Include our ID in the response
        payload: responsePayload,
        error,
      },
      event.origin
    )
  })

  /**
   * Initializes the script, setting up the extension ID.
   */
  async function initialize() {
    let storedId = await GM_getValue(STORAGE_KEY_EXTENSION_ID, null)
    if (storedId) {
      GM_log(`${SCRIPT_NAME} Loaded existing extension ID: ${storedId}`)
    } else {
      storedId = `mock-extension-${crypto.randomUUID()}`
      await GM_setValue(STORAGE_KEY_EXTENSION_ID, storedId)
      GM_log(`${SCRIPT_NAME} Generated and saved new extension ID: ${storedId}`)
    }

    MY_EXTENSION_ID = storedId

    GM_log(`${SCRIPT_NAME} Mock userscript loaded and using GM_storage.`)
  }

  initialize()
})()
