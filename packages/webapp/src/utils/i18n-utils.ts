import { getLocale } from '../paraglide/runtime.js'

/**
 * @function isChineseLocale
 * @description Checks if the given locale string, or the current runtime locale
 *              if the provided string is empty, represents a Chinese language variant.
 *              A locale is considered Chinese if it starts with 'zh' (e.g., 'zh-CN', 'zh-HK', 'zh-TW').
 *
 * @param {string} locale - The locale string to check. If an empty string is provided,
 *                          the function defaults to using the current runtime locale.
 * @returns {boolean} Returns `true` if the effective locale is Chinese, otherwise `false`.
 */
export function isChineseLocale(locale?: string): boolean {
  // If the provided `locale` is an empty string (which is falsy for strings),
  // fall back to the current runtime locale obtained from `getLocale()`.
  // Otherwise, use the provided locale.
  const effectiveLocale = locale || getLocale()
  return effectiveLocale.startsWith('zh')
}
