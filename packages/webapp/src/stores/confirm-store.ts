import { writable, get } from 'svelte/store'

export type ConfirmOptions = {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
}

type ConfirmState = ConfirmOptions & {
  isOpen: boolean
  resolver?: (result: boolean) => void
}

const initialState: ConfirmState = {
  isOpen: false,
  title: '',
  message: '',
  confirmText: undefined,
  cancelText: undefined,
  resolver: undefined,
}

export const confirmState = writable<ConfirmState>(initialState)

export async function requestConfirm(
  options: ConfirmOptions
): Promise<boolean> {
  // Fallback for non-browser/test environments where document is unavailable
  if (typeof document === 'undefined') {
    const proceed =
      // eslint-disable-next-line no-alert
      typeof confirm === 'function' ? confirm(options.message) : true
    return proceed
  }

  return new Promise((resolve) => {
    confirmState.set({
      isOpen: true,
      ...options,
      resolver: resolve,
    })
  })
}

export function resolveConfirm(result: boolean): void {
  const current = get(confirmState)
  // Resolve pending promise if any
  current.resolver?.(result)
  // Reset state
  confirmState.set(initialState)
}
