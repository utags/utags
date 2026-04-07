/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest'

import { getElementUtags } from '../modules/dom-reference-manager'
import type { UserTagMeta, UtagsHTMLElement } from '../types'
import { updateElementUtagsMeta } from './index'

describe('updateElementUtagsMeta', () => {
  it('should set title and type from dataset when title is not a URL', () => {
    const element = document.createElement('a') as UtagsHTMLElement
    element.dataset.utags_title = 'Example Title'
    element.dataset.utags_type = 'post'

    const key = 'https://example.com/post'
    const originalKey = 'https://example.com/post?ref=1'

    updateElementUtagsMeta(element, key, originalKey)

    const utags = getElementUtags(element)
    expect(utags).toBeTruthy()
    expect(utags?.key).toBe(key)
    expect(utags?.originalKey).toBe(originalKey)
    expect(utags?.meta?.title).toBe('Example Title')
    expect(utags?.meta?.type).toBe('post')
  })

  it('should set description from dataset', () => {
    const element = document.createElement('a') as UtagsHTMLElement
    element.dataset.utags_title = 'Example Title'
    element.dataset.utags_description = 'Example Description'
    element.dataset.utags_type = 'post'

    const key = 'https://example.com/post'
    const originalKey = 'https://example.com/post?ref=1'

    updateElementUtagsMeta(element, key, originalKey)

    const utags = getElementUtags(element)
    expect(utags).toBeTruthy()
    expect(utags?.meta?.description).toBe('Example Description')
    expect(utags?.meta?.title).toBe('Example Title')
    expect(utags?.meta?.type).toBe('post')
  })

  it('should not set title when dataset title is a URL', () => {
    const element = document.createElement('a') as UtagsHTMLElement
    element.dataset.utags_title = 'https://example.com'
    element.dataset.utags_type = 'user'

    const key = 'https://example.com/user'
    const originalKey = 'https://example.com/user?ref=1'

    updateElementUtagsMeta(element, key, originalKey)

    const utags = getElementUtags(element)
    expect(utags).toBeTruthy()
    expect(utags?.meta?.title).toBeUndefined()
    expect(utags?.meta?.type).toBe('user')
  })

  it('should fall back to element text content when dataset title is empty', () => {
    const element = document.createElement('a') as UtagsHTMLElement
    element.textContent = 'Link Text'

    const key = 'https://example.com/link'
    const originalKey = 'https://example.com/link?ref=1'

    updateElementUtagsMeta(element, key, originalKey)

    const utags = getElementUtags(element)
    expect(utags).toBeTruthy()
    expect(utags?.meta?.title).toBe('Link Text')
    expect(utags?.meta?.type).toBeUndefined()
  })

  it('should ignore whitespace-only dataset title and use text content instead', () => {
    const element = document.createElement('a') as UtagsHTMLElement
    element.dataset.utags_title = '   '
    element.textContent = 'Whitespace Title'

    const key = 'https://example.com/whitespace'
    const originalKey = 'https://example.com/whitespace?ref=1'

    updateElementUtagsMeta(element, key, originalKey)

    const utags = getElementUtags(element)
    expect(utags).toBeTruthy()
    expect(utags?.meta?.title).toBe('Whitespace Title')
  })

  it('should not include title in meta when final title is empty', () => {
    const element = document.createElement('a') as UtagsHTMLElement
    element.dataset.utags_title = '   '
    element.textContent = '   '

    const key = 'https://example.com/empty-title'
    const originalKey = 'https://example.com/empty-title?ref=1'

    updateElementUtagsMeta(element, key, originalKey)

    const utags = getElementUtags(element)
    expect(utags).toBeTruthy()
    const meta = utags?.meta ?? {}
    expect('title' in meta).toBe(false)
  })

  it('should merge existing meta and let existing meta override generated meta', () => {
    const element = document.createElement('a') as UtagsHTMLElement
    element.dataset.utags_title = 'Generated Title'
    element.dataset.utags_type = 'post'
    element.dataset.utags_description = 'Generated Description'

    const key = 'https://example.com/post'
    const originalKey = 'https://example.com/post?ref=1'

    const existingMeta: UserTagMeta = {
      title: 'Existing Title',
      description: 'Existing Description',
    }

    updateElementUtagsMeta(element, key, originalKey, existingMeta)

    const utags = getElementUtags(element)
    expect(utags).toBeTruthy()
    expect(utags?.meta?.title).toBe('Existing Title')
    expect(utags?.meta?.type).toBe('post')
    expect(utags?.meta?.description).toBe('Existing Description')
  })
})
