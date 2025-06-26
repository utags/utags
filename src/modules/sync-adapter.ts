import {
  addValueChangeListener,
  getValue,
  setValue,
} from "browser-extension-storage"
import { parseInt10 } from "browser-extension-utils"

import { deserializeBookmarks, serializeBookmarks } from "../storage/bookmarks"

// Message types for communication with the webapp
type MessageType =
  | "PING"
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
  GET_AUTH_STATUS: AuthStatus
  GET_REMOTE_METADATA: { metadata: SyncMetadata | undefined }
  DOWNLOAD_DATA: { data: string; remoteMeta: SyncMetadata | undefined }
  UPLOAD_DATA: { metadata: SyncMetadata }
}

type BrowserExtensionMessage<T extends MessageType> = {
  type: T
  payload?: MessagePayloadMap[T]
  source: "utags-webapp"
  requestId: string
}

type BrowserExtensionResponse<T extends MessageType> = {
  type: T
  payload?: ResponsePayloadMap[T]
  error?: string
  source: "utags-extension"
  requestId: string
}

// eslint-disable-next-line @typescript-eslint/naming-convention
const SCRIPT_NAME = "[UTags Extension Sync Adapter]"
// SYNC_MESSAGE_TYPE is used by the adapter to filter messages, but the mock primarily looks at event.data.type for actions.
// const SYNC_MESSAGE_TYPE = 'UTAGS_SYNC_MESSAGE'; // Matches BrowserExtensionSyncAdapter's internal constant, not directly used for action dispatch here.
// eslint-disable-next-line @typescript-eslint/naming-convention
const SYNC_STORAGE_KEY_DATA = "utags_mock_sync_data"
// eslint-disable-next-line @typescript-eslint/naming-convention
const SYNC_STORAGE_KEY_METADATA = "extension.utags.sync_metadata"

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
  return metadata && metadata.version
    ? parseInt10(metadata.version.replace("v", ""), 0)
    : 0
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
    !/^(utags\.(link|top)|utags\.pipecraft\.net|localhost|127\.0\.0\.1)$/.test(
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
    message.source !== "utags-webapp" || // Check source
    !message.requestId || // Check for requestId
    !message.type || // Check for type (which is the action)
    typeof message.type !== "string" ||
    ![
      "PING",
      "GET_AUTH_STATUS",
      "GET_REMOTE_METADATA",
      "DOWNLOAD_DATA",
      "UPLOAD_DATA",
    ].includes(message.type)
  ) {
    // console.log(`${SCRIPT_NAME} Ignoring malformed message:`, message);
    return false
  }

  return true
}

const messageHandler = async (event: MessageEvent) => {
  if (!isValidMessage(event)) {
    return
  }

  const message = event.data as BrowserExtensionMessage<MessageType>
  console.log(`${SCRIPT_NAME} Received message:`, message)

  let responsePayload: ResponsePayloadMap[MessageType] | undefined
  let error: string | undefined

  const actionType = message.type
  const payload = message.payload
  const requestId = message.requestId
  try {
    const remoteMetadata = await loadMetadata()

    switch (actionType) {
      case "PING": {
        // Handle PING from adapter's init
        responsePayload = { status: "PONG" }
        console.log(`${SCRIPT_NAME} PING received. Responding PONG.`)
        break
      }

      case "GET_AUTH_STATUS": {
        // Adapter expects an AuthStatus string
        responsePayload = "authenticated"
        console.log(
          `${SCRIPT_NAME} Auth status requested. Responding:`,
          responsePayload
        )
        break
      }

      case "GET_REMOTE_METADATA": {
        responsePayload = { metadata: remoteMetadata }
        console.log(
          `${SCRIPT_NAME} Metadata requested. Responding:`,
          responsePayload
        )
        break
      }

      case "DOWNLOAD_DATA": {
        const data = await loadData()
        // Adapter expects { data: string | undefined; remoteMeta: SyncMetadata | undefined }
        responsePayload = { data, remoteMeta: remoteMetadata }
        console.log(
          `${SCRIPT_NAME} Data requested. Responding:`,
          responsePayload
        )
        break
      }

      case "UPLOAD_DATA": {
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
    source: "utags-extension", // Source must be 'utags-extension'
    requestId, // Echo back the requestId
    payload: responsePayload,
    error,
  }

  event.source!.postMessage(response, { targetOrigin: event.origin })
}

/**
 * Removes the message event listener.
 */
export function destroySyncAdapter() {
  window.removeEventListener("message", messageHandler)
}

export function initSyncAdapter() {
  destroySyncAdapter() // Remove any existing listener before adding a new one

  // Listen for messages from the web app
  window.addEventListener("message", messageHandler)

  console.log(`${SCRIPT_NAME} initialized.`)
}
