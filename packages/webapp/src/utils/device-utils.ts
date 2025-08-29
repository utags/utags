/**
 * Device identification utilities for tracking sync operations across multiple devices.
 */

/**
 * Device information interface containing browser and system details.
 */
export type DeviceInfo = {
  /** Unique device identifier */
  deviceId: string
  /** Browser name and version */
  browser: string
  /** Operating system information */
  os: string
  /** Device type (desktop, mobile, tablet) */
  deviceType: string
  /** Screen resolution */
  screenResolution: string
  /** Timezone */
  timezone: string
}

/**
 * Upload metadata interface for tracking sync operations.
 */
export type UploadMetadata = {
  /** Device that performed the upload */
  deviceInfo: DeviceInfo
  /** Timestamp when the upload occurred */
  uploadTimestamp: number
  /** User agent string */
  userAgent: string
  /** The origin (domain) from which the data was uploaded */
  origin: string
}

/**
 * Generates a unique device identifier based on browser and system information.
 * The ID is persistent across browser sessions using localStorage.
 * @returns {string} Unique device identifier
 */
export function generateDeviceId(): string {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const STORAGE_KEY = 'utags-device-id'

  // Try to get existing device ID from localStorage
  const existingId = localStorage.getItem(STORAGE_KEY)
  if (existingId) {
    return existingId
  }

  // Generate new device ID based on browser fingerprint
  const browserInfo = getBrowserInfo()
  const osInfo = getOSInfo()
  const screenInfo = getScreenInfo()
  // eslint-disable-next-line new-cap
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  // Create a unique fingerprint
  const fingerprint = [
    browserInfo.name,
    browserInfo.version,
    osInfo,
    screenInfo,
    timezone,
    navigator.language,
    navigator.hardwareConcurrency || 'unknown',
    new Date().getTimezoneOffset().toString(),
  ].join('|')

  // Generate hash-like ID from fingerprint
  // eslint-disable-next-line no-restricted-globals
  const deviceId = btoa(fingerprint)
    .replaceAll(/[+/=]/g, '')
    .slice(0, 16)
    .toUpperCase()

  // Add timestamp to ensure uniqueness
  const timestamp = Date.now().toString(36)
  const finalDeviceId = `${deviceId}-${timestamp}`

  // Store in localStorage for persistence
  localStorage.setItem(STORAGE_KEY, finalDeviceId)

  return finalDeviceId
}

/**
 * Gets comprehensive device information for sync tracking.
 * @returns {DeviceInfo} Complete device information
 */
export function getDeviceInfo(): DeviceInfo {
  const browserInfo = getBrowserInfo()
  const osInfo = getOSInfo()
  const deviceType = getDeviceType()
  const screenResolution = getScreenInfo()
  // eslint-disable-next-line new-cap
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  return {
    deviceId: generateDeviceId(),
    browser: `${browserInfo.name} ${browserInfo.version}`,
    os: osInfo,
    deviceType,
    screenResolution,
    timezone,
  }
}

/**
 * Creates upload metadata for sync operations.
 * @returns {UploadMetadata} Upload metadata with device info and timestamp
 */
export function createUploadMetadata(): UploadMetadata {
  return {
    deviceInfo: getDeviceInfo(),
    uploadTimestamp: Date.now(),
    userAgent: navigator.userAgent,
    origin: globalThis.location.origin,
  }
}

/**
 * Detects browser name and version.
 * @returns {object} Browser information
 */
function getBrowserInfo(): { name: string; version: string } {
  const userAgent = navigator.userAgent

  // Chrome
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    const match = /Chrome\/(\d+\.\d+)/.exec(userAgent)
    return { name: 'Chrome', version: match ? match[1] : 'unknown' }
  }

  // Edge
  if (userAgent.includes('Edg')) {
    const match = /Edg\/(\d+\.\d+)/.exec(userAgent)
    return { name: 'Edge', version: match ? match[1] : 'unknown' }
  }

  // Firefox
  if (userAgent.includes('Firefox')) {
    const match = /Firefox\/(\d+\.\d+)/.exec(userAgent)
    return { name: 'Firefox', version: match ? match[1] : 'unknown' }
  }

  // Safari
  if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    const match = /Version\/(\d+\.\d+)/.exec(userAgent)
    return { name: 'Safari', version: match ? match[1] : 'unknown' }
  }

  return { name: 'Unknown', version: 'unknown' }
}

/**
 * Detects operating system information.
 * @returns {string} Operating system name
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
function getOSInfo(): string {
  const userAgent = navigator.userAgent
  const platform = navigator.platform

  if (userAgent.includes('Windows')) return 'Windows'
  if (userAgent.includes('Mac') || platform.includes('Mac')) return 'macOS'
  if (userAgent.includes('Linux')) return 'Linux'
  if (userAgent.includes('Android')) return 'Android'
  if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS'

  return 'Unknown'
}

/**
 * Detects device type based on screen size and user agent.
 * @returns {string} Device type
 */
function getDeviceType(): string {
  const userAgent = navigator.userAgent
  const screenWidth = screen.width

  if (userAgent.includes('Mobile') || screenWidth < 768) return 'mobile'
  if (
    userAgent.includes('Tablet') ||
    (screenWidth >= 768 && screenWidth < 1024)
  )
    return 'tablet'

  return 'desktop'
}

/**
 * Gets screen resolution information.
 * @returns {string} Screen resolution string
 */
function getScreenInfo(): string {
  return `${screen.width}x${screen.height}`
}
