declare module 'css:*' {
  const cssText: string
  export default cssText
}

declare const browser: typeof chrome

// eslint-disable-next-line @typescript-eslint/naming-convention
declare const GM_info: {
  scriptHandler: string
}

declare function GM_addValueChangeListener(
  key: string,
  cb: (key: string, oldValue: any, newValue: any, remote: boolean) => void
): number

declare type RegisterMenuCommandOptions = Parameters<
  typeof GM_registerMenuCommand
>[2]

declare function GM_registerMenuCommand(
  caption: string,
  onClick: () => void,
  options_or_accessKey?:
    | string
    | {
        id?: string | number
        accessKey?: string
        autoClose?: boolean
        // Tampermonkey-specific
        title?: string
        // ScriptCat-specific
        nested?: boolean
        // ScriptCat-specific
        individual?: boolean
      }
): number

declare function GM_unregisterMenuCommand(menuId: number): void

declare const GM: {
  info: {
    scriptHandler: string
    version: string
  }
  getValue<T = unknown>(key: string, defaultValue: T): Promise<T>
  setValue(key: string, value: unknown): Promise<void>
  deleteValue(key: string): Promise<void>
  addValueChangeListener(
    key: string,
    cb: (key: string, oldValue: any, newValue: any, remote: boolean) => void
  ): Promise<number>
  removeValueChangeListener(id: number): Promise<void>
  xmlHttpRequest(options: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE'
    url: string
    headers?: Record<string, string>
    data?: string | FormData | ArrayBuffer
    responseType?: 'text' | 'json' | 'blob'
    onload?: (response: {
      status: number
      responseText?: string
      response?: any
      responseHeaders?: string
    }) => void
    onerror?: (error: any) => void
  }): Promise<void>
  setClipboard(text: string): Promise<void>
  addStyle(css: string): Promise<HTMLStyleElement>
  addElement(
    tag: string,
    attributes?: Record<string, string>
  ): Promise<HTMLElement>
  addElement(
    parentNode: Element,
    tag: string,
    attributes?: Record<string, string>
  ): Promise<HTMLElement>
  registerMenuCommand(
    caption: string,
    onClick: () => void,
    options_or_accessKey?:
      | string
      | {
          id?: string | number
          accessKey?: string
          autoClose?: boolean
          // Tampermonkey-specific
          title?: string
          // ScriptCat-specific
          nested?: boolean
          // ScriptCat-specific
          individual?: boolean
        }
  ): Promise<number>
  unregisterMenuCommand(menuId: number): Promise<void>
  download(options: {
    url: string
    name: string
    onload?: () => void
  }): Promise<void>
  openInTab(
    url: string,
    options?: { active?: boolean; insert?: boolean }
  ): Promise<void>
  notification(options: {
    text: string
    title?: string
    image?: string
    onclick?: () => void
  }): Promise<void>
}

declare function GM_getValue<T = unknown>(key: string, defaultValue: T): any
declare function GM_setValue(key: string, value: any): void
declare function GM_deleteValue(key: string): void
declare function GM_addStyle(css: string): HTMLStyleElement
declare function GM_addElement(
  tag: string,
  attributes?: Record<string, string>
): HTMLElement
declare function GM_addElement(
  parentNode: Element,
  tag: string,
  attributes?: Record<string, string>
): HTMLElement
declare function GM_openInTab(
  url: string,
  options?: { active?: boolean; insert?: boolean }
): void
declare function GM_removeValueChangeListener(id: number): void
declare function GM_download(options: {
  url: string
  name: string
  onload?: () => void
}): void
declare function GM_notification(options: {
  text: string
  title?: string
  image?: string
  onclick?: () => void
}): void

declare function GM_xmlhttpRequest(options: {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  url: string
  headers?: Record<string, string>
  data?: string | FormData | ArrayBuffer
  responseType?: 'text' | 'json' | 'blob'
  onload?: (response: {
    status: number
    responseText?: string
    response?: any
    responseHeaders?: string
  }) => void
  onerror?: (error: any) => void
}): void

declare function GM_setClipboard(text: string): void
