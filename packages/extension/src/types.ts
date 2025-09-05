export type UserTag = {
  key: string
  meta?: UserTagMeta
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

// eslint-disable-next-line @typescript-eslint/ban-types
export type NullOrUndefined = null | undefined

// eslint-disable-next-line @typescript-eslint/naming-convention
export type UtagsHTMLElement = {
  href?: string
} & HTMLElement

// Global interface extensions
declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/naming-convention
  interface HTMLElement {
    utags?: UserTag
  }
}
