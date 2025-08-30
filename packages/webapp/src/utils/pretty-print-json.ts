/**
 * Converts a JavaScript value to a JSON string, formatted for readability.
 * Uses a 2-space indentation for pretty printing.
 *
 * @param value - The value, usually an object or array, to be converted.
 * @returns A JSON string representing the value, or undefined if the value cannot be stringified.
 */
export function prettyPrintJson(value: any): string {
  return JSON.stringify(value, null, 2)
}

/**
 * Safely converts a JavaScript value to a JSON string with sensitive information masked.
 * Replaces sensitive fields (token, password, apiKey, etc.) with '***' for security.
 * Uses a 2-space indentation for pretty printing.
 *
 * @param value - The value, usually an object or array, to be converted.
 * @returns A JSON string representing the value with sensitive information masked.
 */
export function prettyPrintJsonSafe(value: any): string {
  const sensitiveFields = new Set([
    'token',
    'password',
    'apiKey',
    'api_key',
    'accessToken',
    'access_token',
    'refreshToken',
    'refresh_token',
    'secret',
    'key',
    'privateKey',
    'private_key',
  ])

  /**
   * Recursively masks sensitive fields in an object
   * @param obj - The object to process
   * @returns A new object with sensitive fields masked
   */
  function maskSensitiveData(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj
    }

    if (Array.isArray(obj)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return obj.map((item) => maskSensitiveData(item))
    }

    if (typeof obj === 'object') {
      const masked: any = {}
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      for (const [key, val] of Object.entries(obj)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        masked[key] = sensitiveFields.has(key.toLowerCase())
          ? '***'
          : maskSensitiveData(val)
      }

      return masked
    }

    return obj
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const maskedValue = maskSensitiveData(value)
  return JSON.stringify(maskedValue, null, 2)
}
