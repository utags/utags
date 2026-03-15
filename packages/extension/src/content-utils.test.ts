import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  buildTagsForDisplay,
  shouldUpdateUtagsWhenNodeUpdated,
} from './content-utils'
import * as domReferenceManager from './modules/dom-reference-manager'
import { TAG_VISITED } from './modules/visited'
import * as bookmarksStorage from './storage/bookmarks'
import type { UserTag } from './types'
import type { BookmarkTagsAndMetadata } from './types/bookmarks.js'

let getElementUtagsMockValue: UserTag | undefined
let getTagsMockValue: { tags?: string[] }

beforeEach(() => {
  getElementUtagsMockValue = undefined
  getTagsMockValue = { tags: [] }

  vi.spyOn(domReferenceManager, 'getElementUtags').mockImplementation(
    () => getElementUtagsMockValue
  )
  vi.spyOn(bookmarksStorage, 'getTags').mockImplementation(
    () => getTagsMockValue as BookmarkTagsAndMetadata
  )
})

describe('shouldUpdateUtagsWhenNodeUpdated', () => {
  it('should return false if nodeList contains an element with "utags_modal" class', () => {
    const div = document.createElement('div')
    div.classList.add('utags_modal')
    const nodeList = [div] as unknown as NodeList
    // Mock NodeList length property and index access
    Object.defineProperty(nodeList, 'length', { value: 1 })

    expect(shouldUpdateUtagsWhenNodeUpdated(nodeList)).toBe(false)
  })

  it('should return false if nodeList contains an element with "utags_modal_wrapper" class', () => {
    const div = document.createElement('div')
    div.classList.add('utags_modal_wrapper')
    const nodeList = [div] as unknown as NodeList
    Object.defineProperty(nodeList, 'length', { value: 1 })

    expect(shouldUpdateUtagsWhenNodeUpdated(nodeList)).toBe(false)
  })

  it('should return false if nodeList contains an element with "browser_extension_settings_v2_container" class', () => {
    const div = document.createElement('div')
    div.classList.add('browser_extension_settings_v2_container')
    const nodeList = [div] as unknown as NodeList
    Object.defineProperty(nodeList, 'length', { value: 1 })

    expect(shouldUpdateUtagsWhenNodeUpdated(nodeList)).toBe(false)
  })

  it('should return true if nodeList contains no matching classes', () => {
    const div = document.createElement('div')
    div.classList.add('some_other_class')
    const nodeList = [div] as unknown as NodeList
    Object.defineProperty(nodeList, 'length', { value: 1 })

    expect(shouldUpdateUtagsWhenNodeUpdated(nodeList)).toBe(true)
  })

  it('should ignore non-element nodes', () => {
    const textNode = document.createTextNode('text')
    const nodeList = [textNode] as unknown as NodeList
    Object.defineProperty(nodeList, 'length', { value: 1 })

    expect(shouldUpdateUtagsWhenNodeUpdated(nodeList)).toBe(false)
  })

  it('should return false if node has "utags_ul" class', () => {
    const div = document.createElement('div')
    div.classList.add('utags_ul')
    // It should be a valid node name to potentially return true, but the class check should prevent it
    // Wait, the logic is: check class -> if match, continue (next node)
    // If no next node, return false.
    // So if I have only one node and it has "utags_ul", it should return false.
    // To prove it's the class check, I should use a valid node name like 'A'
    const a = document.createElement('a')
    a.classList.add('utags_ul')
    const nodeList = [a] as unknown as NodeList
    Object.defineProperty(nodeList, 'length', { value: 1 })

    expect(shouldUpdateUtagsWhenNodeUpdated(nodeList)).toBe(false)
  })

  it('should return true if node is a valid node (e.g. A) and no ignored classes', () => {
    const a = document.createElement('a')
    const nodeList = [a] as unknown as NodeList
    Object.defineProperty(nodeList, 'length', { value: 1 })

    expect(shouldUpdateUtagsWhenNodeUpdated(nodeList)).toBe(true)
  })

  it('should return true if node is a DIV and no ignored classes', () => {
    const div = document.createElement('div')
    const nodeList = [div] as unknown as NodeList
    Object.defineProperty(nodeList, 'length', { value: 1 })

    expect(shouldUpdateUtagsWhenNodeUpdated(nodeList)).toBe(true)
  })

  it('should return false if node is NOT a valid node name (e.g. FORM)', () => {
    const form = document.createElement('form')
    const nodeList = [form] as unknown as NodeList
    Object.defineProperty(nodeList, 'length', { value: 1 })

    expect(shouldUpdateUtagsWhenNodeUpdated(nodeList)).toBe(false)
  })

  it('should ignore non-element nodes', () => {
    const textNode = document.createTextNode('text')
    const nodeList = [textNode] as unknown as NodeList
    Object.defineProperty(nodeList, 'length', { value: 1 })

    expect(shouldUpdateUtagsWhenNodeUpdated(nodeList)).toBe(false)
  })

  it('buildTagsForDisplay should return undefined when utags is missing', () => {
    const node = document.createElement('a')
    getElementUtagsMockValue = undefined
    getTagsMockValue = { tags: ['tag1'] }

    const result = buildTagsForDisplay(node)

    expect(result).toBeUndefined()
  })

  it('buildTagsForDisplay should build tags and meta correctly', () => {
    const node = document.createElement('a')
    const meta = { title: 'Example' }
    getElementUtagsMockValue = {
      key: 'https://example.com',
      meta,
    }
    getTagsMockValue = {
      tags: ['tag1', 'tag2'],
    }

    const result = buildTagsForDisplay(node)

    expect(result).toBeDefined()
    expect(result?.key).toBe('https://example.com')
    expect(result?.tags).toEqual(['tag1', 'tag2'])
    expect(result?.meta).toBe(meta)
  })

  it('buildTagsForDisplay should append TAG_VISITED when dataset.utags_visited is "1"', () => {
    const node = document.createElement('a')
    node.dataset.utags_visited = '1'
    getElementUtagsMockValue = {
      key: 'https://example.com',
    }
    getTagsMockValue = {
      tags: ['tag1'],
    }

    const result = buildTagsForDisplay(node)

    expect(result).toBeDefined()
    expect(result?.tags).toEqual(['tag1', TAG_VISITED])
  })
})
