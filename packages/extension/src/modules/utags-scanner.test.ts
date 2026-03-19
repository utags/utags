import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { UTagsScanner, type UTagsScannerStats } from './utags-scanner'

// Mock requestIdleCallback and cancelIdleCallback
const mockRequestIdleCallback = vi.fn((cb) => {
  const start = Date.now()
  return setTimeout(() => {
    cb({
      didTimeout: false,
      timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
    })
  }, 0)
})

const mockCancelIdleCallback = vi.fn((id: ReturnType<typeof setTimeout>) => {
  clearTimeout(id)
})

// Polyfill for test environment
if (!globalThis.requestIdleCallback) {
  globalThis.requestIdleCallback = mockRequestIdleCallback as any
  globalThis.cancelIdleCallback = mockCancelIdleCallback as any
}

describe('UTagsScanner', () => {
  let container: HTMLElement
  let scanner: UTagsScanner
  let results: Element[]
  let stats: UTagsScannerStats

  const mockCallback = vi.fn((r, s) => {
    results = r
    stats = s
  })

  beforeEach(() => {
    container = document.createElement('div')
    document.body.append(container)
    results = []
    stats = {
      lastScanDuration: 0,
      totalNodesProcessed: 0,
      pureScanDuration: 0,
    }
    mockCallback.mockClear()

    // Reset scanner for each test
    // We create a new instance inside tests usually, but cleaning up is good
  })

  afterEach(() => {
    if (scanner) {
      // Disconnect observer if possible or just let GC handle it
      // Scanner doesn't have a stop/destroy method exposed, but we can clear root
    }

    container.remove()
    vi.clearAllMocks()
  })

  it('should scan existing elements correctly based on include options', async () => {
    // Setup initial DOM
    container.innerHTML = `
      <a href="#" class="link">Link 1</a>
      <span data-utags_link>Link 2</span>
      <div>Not a link</div>
    `

    scanner = new UTagsScanner(mockCallback, {
      include: ['a', '[data-utags_link]'],
    })

    scanner.start(container)

    // Wait for idle callback
    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(results.length).toBe(2)
    expect(results.some((el) => el.textContent === 'Link 1')).toBe(true)
    expect(results.some((el) => el.textContent === 'Link 2')).toBe(true)
  })

  it('should exclude elements matching exclude selector', async () => {
    container.innerHTML = `
      <a href="#">Link 1</a>
      <div class="exclude-me">
        <a href="#">Link 2 (Excluded)</a>
      </div>
    `

    scanner = new UTagsScanner(mockCallback, {
      include: ['a'],
      exclude: ['.exclude-me'],
    })

    scanner.start(container)

    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(results.length).toBe(1)
    expect(results[0].textContent).toBe('Link 1')
  })

  it('should ignore elements matching ignore selector but process children', async () => {
    // Note: According to code, if node matches ignore, it's not added to results.
    // Logic: if (!isExcluded) { if (matches(include)) { const isIgnored = ...; updateNodeStatus(node, !isIgnored...) } }
    // Recursion happens if !isExcluded.

    container.innerHTML = `
      <div class="ignore-me" data-utags_link>
        <a href="#">Link Inside Ignored</a>
      </div>
    `

    scanner = new UTagsScanner(mockCallback, {
      include: ['a', '[data-utags_link]'],
      ignore: ['.ignore-me'],
    })

    scanner.start(container)

    await new Promise((resolve) => setTimeout(resolve, 10))

    // The container matches 'include' ([data-utags_link]) but also 'ignore' (.ignore-me), so it should NOT be in results.
    // The child 'a' matches 'include' and not 'ignore', so it SHOULD be in results.
    expect(results.length).toBe(1)
    expect(results[0].textContent).toBe('Link Inside Ignored')
  })

  it('should handle DOM mutations (add nodes)', async () => {
    scanner = new UTagsScanner(mockCallback, {
      include: ['a'],
    })
    scanner.start(container)

    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(results.length).toBe(0)

    // Add a link
    const link = document.createElement('a')
    link.href = '#'
    link.textContent = 'New Link'
    container.append(link)

    // Wait for MutationObserver and IdleCallback
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(results.length).toBe(1)
    expect(results[0].textContent).toBe('New Link')
  })

  it('should handle DOM mutations (remove nodes)', async () => {
    const link = document.createElement('a')
    link.href = '#'
    link.textContent = 'Link to Remove'
    container.append(link)

    scanner = new UTagsScanner(mockCallback, {
      include: ['a'],
    })
    scanner.start(container)

    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(results.length).toBe(1)

    // Remove the link
    link.remove()

    // Wait for MutationObserver and IdleCallback
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(results.length).toBe(0)
  })

  it('should handle attribute changes', async () => {
    const link = document.createElement('a')
    // Initially not matching include (if we only include 'a[href]')
    // But default include is quite broad. Let's use custom include.
    container.append(link)

    scanner = new UTagsScanner(mockCallback, {
      include: ['a[href]'],
    })
    scanner.start(container)

    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(results.length).toBe(0)

    // Add href to make it match
    link.setAttribute('href', '#')

    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(results.length).toBe(1)
  })

  it('should scan inside Shadow DOM', async () => {
    // Create a host element
    const host = document.createElement('div')
    container.append(host)

    const shadowRoot = host.attachShadow({ mode: 'open' })
    const link = document.createElement('a')
    link.href = '#'
    link.textContent = 'Shadow Link'
    shadowRoot.append(link)

    scanner = new UTagsScanner(mockCallback, {
      include: ['a'],
    })

    // Simulate UTAGS_SHADOW_ROOT_CREATED event since we might miss the creation if it happened before listener
    // But here we start scanner first?
    // The scanner listens to 'UTAGS_SHADOW_ROOT_CREATED' on window.

    scanner.start(container)

    // Trigger event manually as if the shadow root was just created/detected
    globalThis.dispatchEvent(
      new CustomEvent('UTAGS_SHADOW_ROOT_CREATED', {
        detail: { shadowRoot },
        target: host, // The event handler uses e.target as host
      } as unknown as Event)
    )

    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(results.length).toBe(1)
    expect(results[0].textContent).toBe('Shadow Link')
  })

  it('should handle mutations inside Shadow DOM', async () => {
    const host = document.createElement('div')
    container.append(host)
    const shadowRoot = host.attachShadow({ mode: 'open' })

    scanner = new UTagsScanner(mockCallback, {
      include: ['a'],
    })
    scanner.start(container)

    // Notify scanner about shadow root
    globalThis.dispatchEvent(
      new CustomEvent('UTAGS_SHADOW_ROOT_CREATED', {
        target: host,
      } as unknown as Event)
    )

    await new Promise((resolve) => setTimeout(resolve, 10))

    // Add link to shadow root
    const link = document.createElement('a')
    link.href = '#'
    link.textContent = 'Dynamic Shadow Link'
    shadowRoot.append(link)

    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(results.length).toBe(1)
    expect(results[0].textContent).toBe('Dynamic Shadow Link')
  })

  it('should respect exclude in Shadow DOM', async () => {
    const host = document.createElement('div')
    container.append(host)
    const shadowRoot = host.attachShadow({ mode: 'open' })

    // Add an excluded container inside shadow dom
    const excludedDiv = document.createElement('div')
    excludedDiv.classList.add('exclude-me')
    shadowRoot.append(excludedDiv)

    const link = document.createElement('a')
    link.href = '#'
    link.textContent = 'Excluded Shadow Link'
    excludedDiv.append(link)

    scanner = new UTagsScanner(mockCallback, {
      include: ['a'],
      exclude: ['.exclude-me'],
    })
    scanner.start(container)

    globalThis.dispatchEvent(
      new CustomEvent('UTAGS_SHADOW_ROOT_CREATED', {
        target: host,
      } as unknown as Event)
    )

    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(results.length).toBe(0)
  })

  it('should update config correctly', async () => {
    container.innerHTML = `
      <a href="#">Link A</a>
      <button>Button B</button>
    `

    scanner = new UTagsScanner(mockCallback, {
      include: ['a'],
    })
    scanner.start(container)

    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(results.length).toBe(1)
    expect(results[0].tagName.toLowerCase()).toBe('a')

    // Update config to include buttons
    scanner.updateConfig({
      include: ['button'],
    })

    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(results.length).toBe(1)
    expect(results[0].tagName.toLowerCase()).toBe('button')
  })

  it('should call onBeforeMatch callback', async () => {
    container.innerHTML = `<a href="#">Link</a>`

    const onBeforeMatch = vi.fn((node, action) => true)

    scanner = new UTagsScanner(mockCallback, {
      include: ['a'],
      onBeforeMatch,
    })
    scanner.start(container)

    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(onBeforeMatch).toHaveBeenCalledWith(expect.any(Element), 'add')
    expect(results.length).toBe(1)
  })

  it('should stop scanning and log error when scan loop is detected', async () => {
    const nowSpy = vi.spyOn(performance, 'now')
    let fakeNow = 0
    nowSpy.mockImplementation(() => {
      fakeNow += 1000
      return fakeNow
    })

    const errorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation((..._args: unknown[]) => undefined)
    try {
      container.innerHTML = `<div data-utags_link></div>`

      scanner = new UTagsScanner(mockCallback, {
        include: ['[data-utags_link]'],
        onBeforeMatch(node: Element, action: 'add' | 'delete') {
          if (action !== 'add') return
          const child = document.createElement('div')
          child.setAttribute('data-utags_link', '')
          node.append(child)
        },
      })
      scanner.start(container)

      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(scanner.isStoppedDueToLoop).toBe(true)
      expect(errorSpy).toHaveBeenCalledWith(
        '[UTagsScanner] stopped due to a suspected scan loop',
        expect.any(Object)
      )
    } finally {
      errorSpy.mockRestore()
      nowSpy.mockRestore()
    }
  })

  it('should skip scanning a node removed before processing', async () => {
    scanner = new UTagsScanner(mockCallback, { include: ['a'] })
    scanner.start(container)

    await new Promise((resolve) => setTimeout(resolve, 10))

    const link = document.createElement('a')
    link.href = '#'
    link.textContent = 'Temp Link'
    container.append(link)

    scanner.enqueueScan(link, true, false)
    link.remove()

    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(results.length).toBe(0)
    expect(link.hasAttribute('data-utags-matched')).toBe(false)
  })

  it('should respect onBeforeMatch return false', async () => {
    container.innerHTML = `<a href="#">Link</a>`

    scanner = new UTagsScanner(mockCallback, {
      include: ['a'],
      onBeforeMatch(node, action) {
        if (action === 'add') return false
        return true
      },
    })
    scanner.start(container)

    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(results.length).toBe(0)
  })

  describe('Complex Scenarios', () => {
    it('should exclude element that matches both include and exclude', async () => {
      container.innerHTML = `<a href="#" class="exclude-me">Link</a>`
      scanner = new UTagsScanner(mockCallback, {
        include: ['a'],
        exclude: ['.exclude-me'],
      })
      scanner.start(container)
      await new Promise((resolve) => setTimeout(resolve, 10))
      expect(results.length).toBe(0)
    })

    it('should include parent even if child matches exclude', async () => {
      // Parent matches include. Child matches exclude.
      // Scanner scans elements. If parent is matched, it is added.
      // Child is scanned separately (recursion).
      container.innerHTML = `
        <div data-utags_link>
          <span class="exclude-me">Child</span>
        </div>
      `
      scanner = new UTagsScanner(mockCallback, {
        include: ['[data-utags_link]'],
        exclude: ['.exclude-me'],
      })
      scanner.start(container)
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(results.length).toBe(1)
      expect(results[0].hasAttribute('data-utags_link')).toBe(true)
    })

    it('should exclude child if parent matches exclude', async () => {
      // Parent matches exclude. Child matches include.
      // Child should be excluded because checkExcluded checks ancestors.
      container.innerHTML = `
        <div class="exclude-me">
          <a href="#">Child Link</a>
        </div>
      `
      scanner = new UTagsScanner(mockCallback, {
        include: ['a'],
        exclude: ['.exclude-me'],
      })
      scanner.start(container)
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(results.length).toBe(0)
    })

    it('should ignore element that matches both include and ignore', async () => {
      container.innerHTML = `<a href="#" class="ignore-me">Link</a>`
      scanner = new UTagsScanner(mockCallback, {
        include: ['a'],
        ignore: ['.ignore-me'],
      })
      scanner.start(container)
      await new Promise((resolve) => setTimeout(resolve, 10))
      expect(results.length).toBe(0)
    })

    it('should include child even if parent matches ignore', async () => {
      // Parent matches ignore. Child matches include.
      // Logic: ignore only affects the node itself. Recursion continues.
      container.innerHTML = `
        <div class="ignore-me">
          <a href="#">Child Link</a>
        </div>
      `
      scanner = new UTagsScanner(mockCallback, {
        include: ['a'],
        ignore: ['.ignore-me'], // This ignores the div, but not its children
      })
      scanner.start(container)
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(results.length).toBe(1)
      expect(results[0].tagName.toLowerCase()).toBe('a')
    })

    it('should ignore element if it contains an element matching ignore selector', async () => {
      // Logic: node.querySelector(this.ignore) !== null
      container.innerHTML = `
        <a href="#">
          <span class="ignore-content">Ignored Content</span>
        </a>
      `
      scanner = new UTagsScanner(mockCallback, {
        include: ['a'],
        ignore: ['.ignore-content'],
      })
      scanner.start(container)
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(results.length).toBe(0)
    })
  })

  describe('Nested Shadow Roots', () => {
    it('should process nested shadow root inside container', async () => {
      // Structure: container -> host1 -> shadow1 -> host2 -> shadow2 -> link
      const host1 = document.createElement('div')
      container.append(host1)
      const shadow1 = host1.attachShadow({ mode: 'open' })

      const host2 = document.createElement('div')
      shadow1.append(host2)
      const shadow2 = host2.attachShadow({ mode: 'open' })

      const link = document.createElement('a')
      link.href = '#'
      link.textContent = 'Nested Shadow Link'
      shadow2.append(link)

      scanner = new UTagsScanner(mockCallback, { include: ['a'] })
      scanner.start(container)

      // Notify scanner about shadow roots
      // Since scanner.start(container) adds observer to container, it might not catch shadow1 if it was added before start?
      // Actually in this test setup, we append child then start scanner? No, in this test block:
      // host1 is appended to container. Then scanner.start(container).
      // host1 is already there. Scanner processes host1.
      // Scanner finds host1 has shadowRoot?
      // Wait, standard Element scanning doesn't automatically traverse shadowRoot unless we explicitly handle it.
      // The scanner logic: "if (node.shadowRoot) ... targetStack.push({ node: node.shadowRoot ... })"
      // So it DOES traverse if shadowRoot property is accessible (open mode).
      // So we don't strictly need the event for initial scan if shadow roots are already attached and open.

      // BUT, if shadow roots are attached dynamically or we want to test the event handler logic specifically...
      // The event handler is for when a shadow root is created (via interceptor).

      // Let's rely on the recursive scan logic first to ensure it finds it.
      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(results.length).toBe(1)
      expect(results[0].textContent).toBe('Nested Shadow Link')
    })

    it('should NOT process shadow root outside container via event', async () => {
      // Structure: outsideContainer -> host -> shadow -> link
      const outsideContainer = document.createElement('div')
      document.body.append(outsideContainer) // Sibling to 'container'

      const host = document.createElement('div')
      outsideContainer.append(host)
      const shadow = host.attachShadow({ mode: 'open' })
      const link = document.createElement('a')
      link.href = '#'
      link.textContent = 'Outside Link'
      shadow.append(link)

      scanner = new UTagsScanner(mockCallback, { include: ['a'] })
      scanner.start(container) // Scans 'container', NOT 'outsideContainer'

      // Dispatch event for the outside shadow root
      globalThis.dispatchEvent(
        new CustomEvent('UTAGS_SHADOW_ROOT_CREATED', {
          detail: { shadowRoot: shadow },
          target: host,
        } as unknown as Event)
      )

      await new Promise((resolve) => setTimeout(resolve, 50))

      // Should find nothing because host is outside container
      expect(results.length).toBe(0)

      outsideContainer.remove()
    })

    it('should process shadow root deep inside container via event', async () => {
      // Even if mutation observer misses it (simulated by event), check if checkDescendant works
      const host = document.createElement('div')
      container.append(host)
      const shadow = host.attachShadow({ mode: 'open' })
      const link = document.createElement('a')
      link.href = '#'
      link.textContent = 'Deep Event Link'
      shadow.append(link)

      scanner = new UTagsScanner(mockCallback, { include: ['a'] })
      scanner.start(container)

      globalThis.dispatchEvent(
        new CustomEvent('UTAGS_SHADOW_ROOT_CREATED', {
          detail: { shadowRoot: shadow },
          target: host,
        } as unknown as Event)
      )

      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(results.length).toBe(1)
    })

    it('should skip scanning disconnected shadow root', async () => {
      const host = document.createElement('div')
      const shadow = host.attachShadow({ mode: 'open' })
      const link = document.createElement('a')
      link.href = '#'
      link.textContent = 'Detached Shadow Link'
      shadow.append(link)

      scanner = new UTagsScanner(mockCallback, { include: ['a'] })
      scanner.start(container)
      scanner.enqueueScan(shadow, true, false)

      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(results.length).toBe(0)
      expect(link.hasAttribute('data-utags-matched')).toBe(false)
    })
  })

  describe('tryTriggerCallback', () => {
    it('should call callback when idle and stacks are empty', () => {
      scanner = new UTagsScanner(mockCallback, {})

      // Setup: everything idle
      scanner.isScanning = false
      scanner.isCleaning = false
      scanner.initialStack = []
      scanner.incrementalStack = []

      // Call
      scanner.tryTriggerCallback()

      // Verify
      expect(mockCallback).toHaveBeenCalled()
    })

    it('should NOT call callback when isScanning is true', () => {
      scanner = new UTagsScanner(mockCallback, {})

      // Setup
      scanner.isScanning = true
      scanner.isCleaning = false
      scanner.initialStack = []
      scanner.incrementalStack = []

      // Call
      scanner.tryTriggerCallback()

      // Verify
      expect(mockCallback).not.toHaveBeenCalled()
    })

    it('should NOT call callback when isCleaning is true', () => {
      scanner = new UTagsScanner(mockCallback, {})

      // Setup
      scanner.isScanning = false
      scanner.isCleaning = true
      scanner.initialStack = []
      scanner.incrementalStack = []

      // Call
      scanner.tryTriggerCallback()

      // Verify
      expect(mockCallback).not.toHaveBeenCalled()
    })
  })

  describe('handleMutations', () => {
    it('should call removeFromResultsRecursive when an element matches exclude selector after attribute change', async () => {
      // 1. Setup element that matches include
      const div = document.createElement('div')
      div.classList.add('include-me')
      div.textContent = 'Target Element'
      container.append(div)

      // 2. Initialize scanner
      // Note: We use data-utags_exclude because MutationObserver only observes specific attributes (BUSINESS_ATTRIBUTES)
      scanner = new UTagsScanner(mockCallback, {
        include: ['.include-me'],
        exclude: ['[data-utags_exclude]'],
      })

      // Spy on the method
      const spy = vi.spyOn(scanner, 'removeFromResultsRecursive')

      scanner.start(container)

      // Wait for initial scan
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(results.length).toBe(1)
      expect(results[0]).toBe(div)

      // 3. Change attribute to match exclude
      div.setAttribute('data-utags_exclude', '')

      // Wait for mutation observer
      await new Promise((resolve) => setTimeout(resolve, 50))

      // 4. Verify spy called
      expect(spy).toHaveBeenCalledWith(div)

      // 5. Verify results updated (should be empty)
      expect(results.length).toBe(0)
    })
  })

  it('should re-evaluate onBeforeMatch when attributes change even if already matched', async () => {
    const link = document.createElement('a')
    link.href = 'http://example.com/ok'
    link.textContent = 'Link'
    container.append(link)

    const onBeforeMatch = vi.fn((node, action) => {
      if (action === 'add') {
        return !node.getAttribute('href')?.includes('ignore')
      }

      return true
    })

    scanner = new UTagsScanner(mockCallback, {
      include: ['a'],
      onBeforeMatch,
    })
    scanner.start(container)

    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(results.length).toBe(1)
    expect(onBeforeMatch).toHaveBeenCalledTimes(1)
    expect(onBeforeMatch).toHaveBeenLastCalledWith(link, 'add')

    // Change href to something that should be ignored by onBeforeMatch
    link.href = 'http://example.com/ignore'

    // Wait for MutationObserver and IdleCallback
    await new Promise((resolve) => setTimeout(resolve, 50))

    // Should be removed from results
    expect(results.length).toBe(0)
    // Should have called onBeforeMatch with 'add' (re-check) and then 'delete'
    expect(onBeforeMatch).toHaveBeenCalledTimes(3) // 1st add, 2nd add (check), 3rd delete
    expect(onBeforeMatch).toHaveBeenNthCalledWith(2, link, 'add')
    expect(onBeforeMatch).toHaveBeenNthCalledWith(3, link, 'delete')
  })
})
