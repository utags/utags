export type UserTag = {
  key?: string
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
