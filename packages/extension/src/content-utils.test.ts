import { describe, expect, it } from 'vitest'

import { shouldUpdateUtagsWhenNodeUpdated } from './content-utils'

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
})
