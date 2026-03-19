/**
 * DOM Utilities
 *
 * This module provides utility functions for working with DOM elements,
 * particularly for handling utags data in a way that avoids DOM reference cycles.
 */

import {
  deleteElementUtags,
  getElementUtags,
  setElementUtags,
} from '../modules/dom-reference-manager'
import type { UserTag } from '../types'
import { DEFAULT_EXCLUDE_TAGS } from './shadow-root-traverser'

const EXCLUDE_TAGS_SET = new Set(DEFAULT_EXCLUDE_TAGS)
const EXCLUDE_ANCESTOR_SELECTOR = DEFAULT_EXCLUDE_TAGS.join(',')

/**
 * Check if the node is a valid target for scanning.
 * It must be an HTMLElement and not in the exclusion list.
 */
export function isScanTarget(node: Node): node is HTMLElement {
  return (
    node instanceof HTMLElement &&
    !EXCLUDE_TAGS_SET.has(node.tagName.toLowerCase()) &&
    !node.closest(EXCLUDE_ANCESTOR_SELECTOR)
  )
}

/**
 * Set utags data for a DOM element
 * This is a convenience function that wraps the DOM reference manager
 * to make it easier to update code that previously used element.utags directly
 *
 * @param element The DOM element to associate with utags data
 * @param keyOrUserTag Either the key string or a UserTag object
 * @param meta The metadata for the utags data (optional when first parameter is UserTag)
 */
export function setUtags(
  element: HTMLElement,
  keyOrUserTag: string | UserTag,
  meta?: Record<string, any>
): void {
  if (typeof keyOrUserTag === 'string') {
    // First form: element, key, meta
    setElementUtags(element, { key: keyOrUserTag, meta: meta || {} })
  } else {
    // Second form: element, UserTag
    setElementUtags(element, keyOrUserTag)
  }
}

/**
 * Get utags data for a DOM element
 *
 * @param element The DOM element to retrieve utags data for
 * @returns The associated utags data or undefined if not found
 */
export function getUtags(element: HTMLElement): UserTag | undefined {
  return getElementUtags(element)
}

/**
 * Delete utags data for a DOM element
 *
 * @param element The DOM element to remove utags data for
 * @returns true if the element had utags data and it was removed, false otherwise
 */
export function removeUtags(element: HTMLElement): boolean {
  return deleteElementUtags(element)
}
