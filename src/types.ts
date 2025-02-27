export type UserTag = {
  key: string
  meta?: UserTagMeta
}

export type UserTagMeta = {
  title?: string
  type?: string
}

export type RecentTag = {
  tag: string
  score: number
}

// eslint-disable-next-line @typescript-eslint/ban-types
export type NullOrUndefined = null | undefined

// eslint-disable-next-line @typescript-eslint/naming-convention
export type UtagsHTMLElement = {
  utags?: UserTag
  href?: string
} & HTMLElement

// eslint-disable-next-line @typescript-eslint/naming-convention
export type UtagsHTMLAnchorElement = {
  utags?: UserTag
} & HTMLAnchorElement
