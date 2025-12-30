/**
 * DOM Reference Manager
 *
 * This module provides a solution to avoid DOM reference cycles by using WeakMap
 * to store references to DOM elements instead of directly attaching properties to them.
 *
 * Using WeakMap allows the garbage collector to collect DOM elements when they are
 * no longer referenced elsewhere, even if they are keys in the WeakMap.
 */

import type { UserTag } from '../types'

// WeakMap to store DOM element references and their associated utags data
const elementToUtagsMap = new WeakMap<HTMLElement, UserTag>()

/**
 * Set utags data for a DOM element
 * @param element The DOM element to associate with utags data
 * @param utags The utags data to store
 */
export function setElementUtags(element: HTMLElement, utags: UserTag): void {
  elementToUtagsMap.set(element, utags)
}

/**
 * Get utags data for a DOM element
 * @param element The DOM element to retrieve utags data for
 * @returns The associated utags data or undefined if not found
 */
export function getElementUtags(element: HTMLElement): UserTag | undefined {
  return elementToUtagsMap.get(element)
}

/**
 * Delete utags data for a DOM element
 * @param element The DOM element to remove utags data for
 * @returns true if the element had utags data and it was removed, false otherwise
 */
export function deleteElementUtags(element: HTMLElement): boolean {
  return elementToUtagsMap.delete(element)
}

/**
 * Check if a DOM element has associated utags data
 * @param element The DOM element to check
 * @returns true if the element has utags data, false otherwise
 */
export function hasElementUtags(element: HTMLElement): boolean {
  return elementToUtagsMap.has(element)
}

/**
 * Clear all DOM element references
 * This function helps with cleanup when the page is unloaded
 */
export function clearDomReferences(): void {
  // WeakMap doesn't have a clear() method, but its entries will be
  // garbage collected when the DOM elements are no longer referenced
  // This is just a placeholder for explicit cleanup in the future if needed
  // console.log('DOM references will be garbage collected naturally')
}
