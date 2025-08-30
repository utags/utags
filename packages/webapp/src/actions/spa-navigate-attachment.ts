/**
 * Svelte attachment for client-side navigation for internal links.
 * Prevents full page reloads and uses history.pushState.
 * Relies on the 'locationchange' event (e.g., via browser-extension-utils's extendHistoryApi)
 * to be handled by the application's router.
 *
 * @param {HTMLAnchorElement} element - The anchor element this attachment is applied to.
 * @returns {() => void} Cleanup function to remove the event listener.
 */
export function spaNavigateAttachment(element: HTMLAnchorElement): () => void {
  /**
   * Handles the click event on the anchor element.
   * @param {MouseEvent} event - The click event.
   */
  function handleClick(event: MouseEvent): void {
    const hrefAttribute = element.getAttribute('href')

    if (!hrefAttribute) {
      // If there's no href, do nothing.
      return
    }

    // Let the browser handle modified clicks (e.g., Ctrl+Click to open in new tab)
    // or non-left mouse button clicks.
    if (
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return
    }

    // Prevent the default browser navigation.
    event.preventDefault()

    try {
      // Resolve the href against the current window's origin to get an absolute URL.
      const targetUrl = new URL(hrefAttribute, globalThis.location.href)

      // Check if it's an internal link (same origin).
      if (targetUrl.origin === globalThis.location.origin) {
        // Only push state if the URL is actually different to avoid redundant events.
        if (globalThis.location.href !== targetUrl.href) {
          history.pushState({}, '', targetUrl.href)
          // The 'locationchange' event should be dispatched by the patched history.pushState
          // (e.g., by extendHistoryApi from browser-extension-utils in App.svelte).
        }
      } else {
        // It's an external link, open it in a new tab.
        window.open(hrefAttribute, '_blank', 'noopener noreferrer')
      }
    } catch (error) {
      console.error('Error during client-side navigation:', error)
      // Fallback to default browser navigation if an error occurs.
      globalThis.location.href = hrefAttribute
    }
  }

  // Add the event listener to the anchor element.
  element.addEventListener('click', handleClick)

  // Return the cleanup function, which Svelte will call when the element is unmounted.
  return () => {
    element.removeEventListener('click', handleClick)
  }
}
