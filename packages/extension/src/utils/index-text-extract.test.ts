import { describe, expect, it } from 'vitest'

import { extractTextWithImageAlt, getDirectChildText } from './index'

describe('extractTextWithImageAlt', () => {
  it('should return empty string when element has no children', () => {
    const element = document.createElement('div')

    const result = extractTextWithImageAlt(element)

    expect(result).toBe('')
  })

  it('should concatenate plain text nodes including nested elements', () => {
    const root = document.createElement('div')
    const text1 = document.createTextNode('Hello ')
    const span = document.createElement('span')
    const text2 = document.createTextNode('World')
    span.append(text2)
    root.append(text1)
    root.append(span)

    const result = extractTextWithImageAlt(root)

    expect(result).toBe('Hello World')
  })

  it('should include alt text from direct child image elements', () => {
    const root = document.createElement('div')
    const textBefore = document.createTextNode('User ')
    const img = document.createElement('img')
    img.setAttribute('alt', 'Avatar')
    const textAfter = document.createTextNode(' loaded')

    root.append(textBefore)
    root.append(img)
    root.append(textAfter)

    const result = extractTextWithImageAlt(root)

    expect(result).toBe('User Avatar loaded')
  })

  it('should include alt text from nested image elements', () => {
    const root = document.createElement('div')
    const wrapper = document.createElement('span')
    const img = document.createElement('img')
    img.setAttribute('alt', 'Icon')
    wrapper.append(img)
    root.append(wrapper)

    const result = extractTextWithImageAlt(root)

    expect(result).toBe('Icon')
  })

  it('should treat images without alt as empty string', () => {
    const root = document.createElement('div')
    const textBefore = document.createTextNode('Start ')
    const img = document.createElement('img')
    const textAfter = document.createTextNode(' End')

    root.append(textBefore)
    root.append(img)
    root.append(textAfter)

    const result = extractTextWithImageAlt(root)

    expect(result).toBe('Start  End')
  })

  it('should ignore non-text, non-element child nodes such as comments', () => {
    const root = document.createElement('div')
    const textBefore = document.createTextNode('Hello')
    const comment = document.createComment('ignored')
    const textAfter = document.createTextNode('World')

    root.append(textBefore)
    root.append(comment)
    root.append(textAfter)

    const result = extractTextWithImageAlt(root)

    expect(result).toBe('HelloWorld')
  })
})

describe('getDirectChildText', () => {
  it('should return empty string when there are no direct text nodes', () => {
    const root = document.createElement('div')
    const span = document.createElement('span')
    span.textContent = 'inner'
    root.append(span)

    const result = getDirectChildText(root)

    expect(result).toBe('')
  })

  it('should concatenate direct child text nodes and ignore nested elements', () => {
    const root = document.createElement('div')
    root.append(' Hello ')
    const span = document.createElement('span')
    span.textContent = 'inner'
    root.append(span)
    root.append(' world ')

    const result = getDirectChildText(root)

    expect(result).toBe('Hello world')
  })

  it('should normalize consecutive whitespace characters into single spaces', () => {
    const root = document.createElement('div')
    root.append('Hello')
    root.append('   \n\t   ')
    root.append('world')

    const result = getDirectChildText(root)

    expect(result).toBe('Hello world')
  })

  it('should ignore empty or whitespace-only text nodes', () => {
    const root = document.createElement('div')
    root.append('   ')
    root.append('\n\t')

    const result = getDirectChildText(root)

    expect(result).toBe('')
  })

  it('should trim leading and trailing whitespace in the final result', () => {
    const root = document.createElement('div')
    root.append('   Hello   ')
    root.append('   world   ')

    const result = getDirectChildText(root)

    expect(result).toBe('Hello world')
  })
})
