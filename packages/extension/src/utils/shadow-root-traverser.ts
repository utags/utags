/**
 * Default tags that typically don't contain shadow roots and should be excluded from traversal
 */

const DEFAULT_EXCLUDE_TAGS = [
  'script',
  'style',
  'link',
  'meta',
  'title',
  'base',
  'noscript',
  'template',
  'br',
  'hr',
  'img',
  'input',
  'area',
  'source',
  'track',
  'wbr',
  'col',
  'embed',
  'param',
  'svg',
  'picture',
  'iframe',
  'button',
  'textarea',
  'select',
  'option',
  'canvas',
  'video',
  'audio',
  'object',
]

/**
 * Options for shadow root traversal
 */
type ShadowRootTraversalOptions = {
  /** Array of tag names to include in traversal (if specified, only these tags will be traversed) */
  includeTags?: string[]
  /** Array of tag names to exclude from traversal (will be merged with default exclude tags) */
  excludeTags?: string[]
  /** Maximum depth to traverse (default: 10 to prevent infinite recursion) */
  maxDepth?: number
  /** Whether to use default exclude tags (default: true) */
  useDefaultExcludeTags?: boolean
}

/**
 * Callback function type for shadow root discovery
 * @param shadowRoot - The discovered shadow root
 * @param hostElement - The element that hosts this shadow root
 */
type ShadowRootCallback = (shadowRoot: ShadowRoot, hostElement: Element) => void

/**
 * Traverses all shadow roots in the DOM tree and calls a callback function for each discovered shadow root
 * @param rootElement - The root element to start traversal from (default: document.documentElement)
 * @param callback - Callback function to execute when a shadow root is found
 * @param options - Traversal options for filtering and control
 */
export function traverseAllShadowRoots(
  callback: ShadowRootCallback,
  rootElement: Element = document.documentElement,
  options: ShadowRootTraversalOptions = {}
): void {
  const {
    includeTags,
    excludeTags = [],
    maxDepth = 10,
    useDefaultExcludeTags = true,
  } = options

  // Convert arrays to Sets for O(1) lookup performance
  const includeTagsSet = includeTags
    ? new Set(includeTags.map((tag) => tag.toLowerCase()))
    : null
  const excludeTagsSet = new Set([
    ...(useDefaultExcludeTags ? DEFAULT_EXCLUDE_TAGS : []),
    ...excludeTags.map((tag) => tag.toLowerCase()),
  ])

  /**
   * Internal recursive function to traverse elements
   * @param element - Current element to traverse
   * @param currentDepth - Current traversal depth
   */
  function traverseElement(element: Element, currentDepth: number): void {
    // Prevent infinite recursion
    if (currentDepth > maxDepth) {
      console.warn('Maximum traversal depth reached, stopping traversal')
      return
    }

    const tagName = element.tagName.toLowerCase()

    // Check if element should be excluded
    if (excludeTagsSet.has(tagName)) {
      return
    }
    // console.log('Traversing element:', tagName, currentDepth)

    // Check if element should be included (if includeTags is specified)
    if (includeTagsSet && !includeTagsSet.has(tagName)) {
      // Still traverse children even if current element is not included
      traverseChildren(element, currentDepth)
      return
    }

    // Check if element has a shadow root
    if (element.shadowRoot) {
      // Call the callback function with the discovered shadow root
      callback(element.shadowRoot, element)

      // Traverse elements within the shadow root
      const shadowChildren = element.shadowRoot.children
      for (const shadowChild of shadowChildren) {
        traverseElement(shadowChild, currentDepth + 1)
      }

      // Skip traversing regular children when shadow root exists
      // because shadow root content replaces the regular children
      return
    }

    // Traverse regular children only if no shadow root exists
    traverseChildren(element, currentDepth)
  }

  /**
   * Helper function to traverse child elements
   * @param element - Parent element
   * @param currentDepth - Current traversal depth
   */
  function traverseChildren(element: Element, currentDepth: number): void {
    const children = element.children
    for (const child of children) {
      traverseElement(child, currentDepth + 1)
    }
  }

  // Start traversal from the root element
  traverseElement(rootElement, 0)
}

/**
 * Utility function to find elements within shadow roots
 * @param selector - CSS selector to search for
 * @param rootElement - Root element to start search from
 * @param options - Traversal options
 * @returns Array of found elements
 */
export function findElementsInShadowRoots(
  selector: string,
  rootElement: Element = document.documentElement,
  options: ShadowRootTraversalOptions = {}
): Element[] {
  const foundElements: Element[] = []

  traverseAllShadowRoots(
    (shadowRoot: ShadowRoot) => {
      const elements = shadowRoot.querySelectorAll(selector)
      foundElements.push(...Array.from(elements))
    },
    rootElement,
    options
  )

  return foundElements
}

/**
 * Example usage and demonstration
 */
export function demonstrateUsage(): void {
  // Example 1: Traverse all shadow roots
  traverseAllShadowRoots((shadowRoot, hostElement) => {
    console.log('Found shadow root in:', hostElement.tagName, hostElement)
    // Your custom logic here - e.g., search for specific elements
    const buttons = shadowRoot.querySelectorAll('button')
    console.log('Found buttons in shadow root:', buttons.length)
  }, document.documentElement)

  // Example 2: Only traverse specific tag types
  traverseAllShadowRoots(
    (shadowRoot, hostElement) => {
      console.log('Found shadow root in custom element:', hostElement.tagName)
    },
    document.documentElement,
    {
      includeTags: ['my-component', 'custom-element', 'web-component'],
    }
  )

  // Example 3: Exclude certain tags from traversal
  traverseAllShadowRoots(
    (shadowRoot, hostElement) => {
      console.log(
        'Found shadow root (excluding scripts and styles):',
        hostElement.tagName
      )
    },
    document.documentElement,
    {
      excludeTags: ['script', 'style', 'link'],
    }
  )

  // Example 4: Find specific elements in all shadow roots
  const allButtons = findElementsInShadowRoots('button')
  console.log('All buttons found in shadow roots:', allButtons)

  // Example 5: Find elements with specific attributes in shadow roots
  const elementsWithDataId = findElementsInShadowRoots('[data-id]')
  console.log('Elements with data-id in shadow roots:', elementsWithDataId)
}
