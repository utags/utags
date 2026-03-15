const utagsElementMap = new WeakMap<HTMLElement, HTMLElement>()
const utagsUlSet = new Set<HTMLElement>()

export function registerElementUtagsUl(
  element: HTMLElement,
  ul: HTMLElement
): void {
  utagsElementMap.set(element, ul)
  utagsUlSet.add(ul)
}

export function getUtagsUl(element: HTMLElement): HTMLElement | undefined {
  return utagsElementMap.get(element)
}

export function unregisterElementUtagsUl(
  element: HTMLElement
): HTMLElement | undefined {
  const ul = utagsElementMap.get(element)
  if (ul) {
    utagsUlSet.delete(ul)
    utagsElementMap.delete(element)
  }

  return ul
}

export function ensureUtagsUlTracked(ul: HTMLElement): void {
  utagsUlSet.add(ul)
}

export function isUtagsUlTracked(ul: HTMLElement): boolean {
  return utagsUlSet.has(ul)
}

export function unregisterUtagsUl(ul: HTMLElement): void {
  utagsUlSet.delete(ul)
}

export function getAllRegisteredUtagsUls(): IterableIterator<HTMLElement> {
  return utagsUlSet.values()
}

export function getRegisteredUtagsUlCount(): number {
  return utagsUlSet.size
}

export function clearUtagsUlRegistry(): void {
  utagsUlSet.clear()
}
