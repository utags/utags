import {
  addValueChangeListener,
  getValue,
  setValue,
} from "browser-extension-storage"
import { parseInt10 } from "browser-extension-utils"

import { deserializeBookmarks, serializeBookmarks } from "../storage/bookmarks"
import { isProduction, isUserscript } from "../utils"

// Message types for communication with the webapp
type MessageType =
  | "PING"
  | "DISCOVER_UTAGS_TARGETS"
  | "GET_AUTH_STATUS"
  | "GET_REMOTE_METADATA"
  | "DOWNLOAD_DATA"
  | "UPLOAD_DATA"
type AuthStatus = "authenticated" | "unauthenticated" | "error"

export type SyncMetadata = {
  timestamp: number
  version: string
}

type MessagePayloadMap = {
  PING: undefined
  DISCOVER_UTAGS_TARGETS: undefined
  GET_AUTH_STATUS: undefined
  GET_REMOTE_METADATA: undefined
  DOWNLOAD_DATA: undefined
  UPLOAD_DATA: {
    data: string
    metadata?: SyncMetadata
  }
}

type ResponsePayloadMap = {
  PING: { status: "PONG" }
  DISCOVER_UTAGS_TARGETS: { extensionId: string; extensionName?: string }
  GET_AUTH_STATUS: { status: AuthStatus }
  GET_REMOTE_METADATA: { metadata: SyncMetadata | undefined }
  DOWNLOAD_DATA: { data: string; remoteMeta: SyncMetadata | undefined }
  UPLOAD_DATA: { metadata: SyncMetadata }
}

type BrowserExtensionMessage<T extends MessageType> = {
  type: T
  source: "utags-webapp"
  id: string
  targetExtensionId: string
  payload?: MessagePayloadMap[T]
}

type BrowserExtensionResponse<T extends MessageType> = {
  type: T
  source: "utags-extension"
  id: string
  extensionId: string
  payload?: ResponsePayloadMap[T]
  error?: string
}

/* eslint-disable @typescript-eslint/naming-convention */

const SCRIPT_NAME = "[UTags Extension Sync Adapter]"

let MY_EXTENSION_ID: string | undefined // Example ID, should be unique per script/extension
let MY_EXTENSION_NAME: string | undefined
// SYNC_MESSAGE_TYPE is used by the adapter to filter messages, but the mock primarily looks at event.data.type for actions.
// const SYNC_MESSAGE_TYPE = 'UTAGS_SYNC_MESSAGE'; // Matches BrowserExtensionSyncAdapter's internal constant, not directly used for action dispatch here.

const STORAGE_KEY_EXTENSION_ID = "extension.utags.extension_id"
const SYNC_STORAGE_KEY_DATA = "utags_mock_sync_data"

const SYNC_STORAGE_KEY_METADATA = "extension.utags.sync_metadata"
// Constants for message types and sources

const SOURCE_WEBAPP = "utags-webapp"
const SOURCE_EXTENSION = "utags-extension"
const PING_MESSAGE_TYPE = "PING"
const PONG_MESSAGE_TYPE = "PONG"
const DISCOVER_MESSAGE_TYPE = "DISCOVER_UTAGS_TARGETS"
const DISCOVERY_RESPONSE_TYPE = "DISCOVERY_RESPONSE"
const GET_REMOTE_METADATA_MESSAGE_TYPE = "GET_REMOTE_METADATA"
const DOWNLOAD_MESSAGE_TYPE = "DOWNLOAD_DATA"
const UPLOAD_MESSAGE_TYPE = "UPLOAD_DATA"
const GET_AUTH_STATUS_MESSAGE_TYPE = "GET_AUTH_STATUS"
/* eslint-enable @typescript-eslint/naming-convention */

/**
 * Saves data using setValue.
 * @param data The data to save.
 * @returns A promise that resolves when the data is saved.
 */
async function saveData(data: string): Promise<void> {
  // await setValue(SYNC_STORAGE_KEY_DATA, data)
  await deserializeBookmarks(data)
}

/**
 * Loads data using getValue.
 * @returns A promise that resolves with the loaded data or an empty string if not found.
 */
async function loadData(): Promise<string> {
  // const data = await getValue(SYNC_STORAGE_KEY_DATA)
  const data = await serializeBookmarks()
  return data || ""
}

/**
 * Saves metadata using setValue.
 * @param metadata The metadata to save.
 * @returns A promise that resolves when the metadata is saved.
 */
async function saveMetadata(metadata: SyncMetadata): Promise<void> {
  await setValue(SYNC_STORAGE_KEY_METADATA, metadata)
}

/**
 * Loads metadata using getValue.
 * @returns A promise that resolves with the loaded metadata or null if not found.
 */
async function loadMetadata(): Promise<SyncMetadata | undefined> {
  return (await getValue(SYNC_STORAGE_KEY_METADATA)) as SyncMetadata | undefined
}

/**
 * Get the version number from metadata.
 *
 * @example
 * // Returns 1 for 'v1'
 * getVersionNumber({ version: 'v1', timestamp: 123 });
 *
 * // Returns 0 for invalid or missing version format
 * getVersionNumber({ version: 'invalid', timestamp: 123 });
 * getVersionNumber({ version: 'v', timestamp: 123 });
 * @param metadata The metadata object to extract version from.
 * @returns The version number.
 */
function getVersionNumber(metadata: SyncMetadata | undefined): number {
  const version =
    metadata && metadata.version
      ? parseInt10(metadata.version.replace("v", ""), 0)
      : 0
  return Math.max(version, 0)
}

/**
 * Validates an incoming message event.
 * @param event The message event to validate.
 * @returns True if the message is valid, false otherwise.
 */
function isValidMessage(event: MessageEvent): boolean {
  // Security check: only accept messages from the same origin
  if (event.origin !== location.origin) {
    // console.log(`${SCRIPT_NAME} Ignoring message from different origin: ${event.origin}`);
    return false
  }

  if (
    !/^((.*\.)?utags\.(link|top)|utags\.pipecraft\.net|localhost|127\.0\.0\.1)$/.test(
      location.hostname
    )
  ) {
    return false
  }

  if (!event.source || typeof event.source.postMessage !== "function") {
    return false
  }

  const message = event.data as BrowserExtensionMessage<MessageType>

  // Validate message structure (must match BrowserExtensionMessage format from the adapter)
  if (
    !message ||
    typeof message !== "object" ||
    message.source !== SOURCE_WEBAPP || // Check source
    !message.id || // Check for id
    (message.targetExtensionId !== MY_EXTENSION_ID &&
      message.targetExtensionId !== "*") || // Allow broadcast messages
    // Ignore messages not intended for this script
    !message.type || // Check for type (which is the action)
    typeof message.type !== "string" ||
    ![
      PING_MESSAGE_TYPE,
      DISCOVER_MESSAGE_TYPE,
      GET_AUTH_STATUS_MESSAGE_TYPE,
      GET_REMOTE_METADATA_MESSAGE_TYPE,
      DOWNLOAD_MESSAGE_TYPE,
      UPLOAD_MESSAGE_TYPE,
    ].includes(message.type)
  ) {
    // console.log(`${SCRIPT_NAME} Ignoring malformed message:`, message);
    return false
  }

  return true
}

const messageHandler = async (event: MessageEvent) => {
  if (!MY_EXTENSION_ID) {
    console.error("MY_EXTENSION_ID not initialized")
    return
  }

  if (!isValidMessage(event)) {
    return
  }

  const message = event.data as BrowserExtensionMessage<MessageType>
  console.log(`${SCRIPT_NAME} Received message:`, message)

  let responsePayload: ResponsePayloadMap[MessageType] | undefined
  let error: string | undefined

  const actionType = message.type
  const payload = message.payload
  const id = message.id
  try {
    const remoteMetadata = await loadMetadata()

    switch (actionType) {
      case DISCOVER_MESSAGE_TYPE: {
        // Respond to discovery broadcasts
        responsePayload = {
          extensionId: MY_EXTENSION_ID,
          extensionName: MY_EXTENSION_NAME,
        } // Example name
        // Send a specific response type for discovery
        ;(event.source as Window).postMessage(
          {
            source: SOURCE_EXTENSION,
            type: DISCOVERY_RESPONSE_TYPE,
            id, // Echo id to potentially correlate, though not strictly necessary for broadcast
            extensionId: MY_EXTENSION_ID,
            payload: responsePayload,
          },
          event.origin
        )
        console.log(`${SCRIPT_NAME} Responded to discovery broadcast.`)
        return // Stop further processing for this message
      }

      case PING_MESSAGE_TYPE: {
        // Handle PING from adapter's init
        responsePayload = { status: PONG_MESSAGE_TYPE }
        console.log(`${SCRIPT_NAME} PING received. Responding PONG.`)
        break
      }

      case GET_AUTH_STATUS_MESSAGE_TYPE: {
        // Adapter expects an AuthStatus string
        responsePayload = { status: "authenticated" }
        console.log(
          `${SCRIPT_NAME} Auth status requested. Responding:`,
          responsePayload
        )
        break
      }

      case GET_REMOTE_METADATA_MESSAGE_TYPE: {
        responsePayload = { metadata: remoteMetadata }
        console.log(
          `${SCRIPT_NAME} Metadata requested. Responding:`,
          responsePayload
        )
        break
      }

      case DOWNLOAD_MESSAGE_TYPE: {
        const data = await loadData()
        // Adapter expects { data: string | undefined; remoteMeta: SyncMetadata | undefined }
        responsePayload = { data, remoteMeta: remoteMetadata }
        console.log(
          `${SCRIPT_NAME} Data requested. Responding:`,
          responsePayload
        )
        break
      }

      case UPLOAD_MESSAGE_TYPE: {
        if (!payload || typeof (payload as any).data !== "string") {
          throw new Error("UPLOAD_DATA: Invalid payload")
        }

        // Adapter sends expectedRemoteMeta as 'metadata' in the payload
        const expectedMeta = payload.metadata

        if (expectedMeta && remoteMetadata) {
          if (
            expectedMeta.version !== remoteMetadata.version ||
            expectedMeta.timestamp !== remoteMetadata.timestamp
          ) {
            throw new Error(
              "Conflict: Expected remote metadata does not match current remote metadata."
            )
          }
        } else if (expectedMeta && !remoteMetadata) {
          throw new Error(
            "Conflict: Expected remote metadata, but no remote data found."
          )
        } else if (!expectedMeta && remoteMetadata) {
          throw new Error(
            "Conflict: Remote data exists, but no expected metadata (If-Match) was provided. Possible concurrent modification."
          )
        }

        const newTimestamp = Date.now()
        const oldVersionNumber = getVersionNumber(remoteMetadata)
        const newVersion = `v${oldVersionNumber + 1}`
        const newMeta = { timestamp: newTimestamp, version: newVersion }

        await saveData(payload.data)
        await saveMetadata(newMeta)
        // Adapter expects { metadata: SyncMetadata }
        responsePayload = { metadata: newMeta }
        console.log(`${SCRIPT_NAME} Data uploaded. New metadata:`, newMeta)
        break
      }
    }
  } catch (error_) {
    error = error_ instanceof Error ? error_.message : String(error_)
    console.log(`${SCRIPT_NAME} Error processing message:`, error_)
  }

  // Send response back to the web app, matching BrowserExtensionResponse format
  const response: BrowserExtensionResponse<MessageType> = {
    type: actionType,
    source: SOURCE_EXTENSION, // Source must be 'utags-extension'
    id, // Echo back the id
    extensionId: MY_EXTENSION_ID, // Include our ID in the response
    payload: responsePayload,
    error,
  }

  ;(event.source as Window).postMessage(response, event.origin)
}

async function initExtensionId(): Promise<void> {
  const type = isUserscript ? "Userscript" : "Extension"
  // eslint-disable-next-line n/prefer-global/process
  const tag = isProduction ? "" : ` - ${process.env.PLASMO_TAG!.toUpperCase()}`

  let storedId: string | undefined = (await getValue(
    STORAGE_KEY_EXTENSION_ID
  )) as string | undefined

  if (!storedId) {
    storedId = `utags-${type.toLowerCase()}-${crypto.randomUUID()}`
    await setValue(STORAGE_KEY_EXTENSION_ID, storedId)
  }

  MY_EXTENSION_ID = storedId
  MY_EXTENSION_NAME = `UTags ${type}${tag}`
  // MY_EXTENSION_ID = 'utags-extension'
  console.log("initExtensionId", MY_EXTENSION_ID, MY_EXTENSION_NAME)
}

/**
 * Removes the message event listener.
 */
export function destroySyncAdapter(): void {
  MY_EXTENSION_ID = undefined
  window.removeEventListener("message", messageHandler)
}

export async function initSyncAdapter(): Promise<void> {
  destroySyncAdapter() // Remove any existing listener before adding a new one

  await initExtensionId()
  // Listen for messages from the web app
  window.addEventListener("message", messageHandler)

  console.log(`${SCRIPT_NAME} initialized.`)
}
