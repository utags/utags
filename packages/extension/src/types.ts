export type UserTag = {
  key: string
  meta?: UserTagMeta
  originalKey?: string
}

export type UserTagMeta = {
  title?: string
  type?: string
  description?: string
}

export type RecentTag = {
  tag: string
  score: number
}

// eslint-disable-next-line @typescript-eslint/no-restricted-types
export type NullOrUndefined = null | undefined

export type UtagsHTMLElement = {
  href?: string
} & HTMLElement

// Global interface extensions
declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface HTMLElement {
    utags?: UserTag
  }
}
