import { getSettingsValue } from "browser-extension-settings"
import {
  addValueChangeListener,
  getValue,
  setValue,
} from "browser-extension-storage"
import { isUrl, uniq } from "browser-extension-utils"

import type { RecentTag } from "../types"
import { splitTags } from "../utils"

type TagsAndMeta = {
  tags: string[]
  meta?: ItemMeta
}

type ItemMeta = Record<string, any>

type UrlMapMeta = {
  extensionVersion: string
  databaseVersion: number
}
type UrlMap = Record<string, TagsAndMeta | UrlMapMeta>

const extensionVersion = "0.8.0"
const databaseVersion = 2
const storageKey = "extension.utags.urlmap"
const storageKeyRecentTags = "extension.utags.recenttags"
const storageKeyMostUsedTags = "extension.utags.mostusedtags"
const storageKeyRecentAddedTags = "extension.utags.recentaddedtags"
let cachedUrlMap: UrlMap | undefined

export async function getUrlMap(): Promise<UrlMap> {
  return ((await getValue(storageKey)) as UrlMap) || ({} as UrlMap)
}

async function getUrlMapVesion1(): Promise<Record<string, unknown>> {
  return getValue("plugin.utags.tags.v1") as Promise<Record<string, unknown>>
}

export async function getCachedUrlMap(): Promise<Record<string, unknown>> {
  if (!cachedUrlMap) {
    cachedUrlMap = await getUrlMap()
  }

  return cachedUrlMap
}

export function getTags(key: string): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
  return (cachedUrlMap && cachedUrlMap[key]) || { tags: [] }
}

export async function saveTags(
  key: string,
  tags: string[],
  meta: Record<string, any>
) {
  // console.log("saveTags 1", key, tags, meta)
  const urlMap = await getUrlMap()

  urlMap.meta = Object.assign({}, urlMap.meta as Record<string, unknown>, {
    extensionVersion,
    databaseVersion,
  })

  const newTags = mergeTags(tags, [])
  let oldTags: string[] = []
  if (newTags.length === 0) {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete urlMap[key]
  } else {
    const now = Date.now()
    const data = (urlMap[key] as TagsAndMeta) || ({} as TagsAndMeta)
    oldTags = data.tags
    const newMeta = Object.assign({}, data.meta, meta, {
      updated: now,
    }) as ItemMeta
    newMeta.created = (newMeta.created as number) || now
    urlMap[key] = {
      tags: newTags,
      meta: newMeta,
    }
    // console.log("saveTags 2", key, JSON.stringify(urlMap[key]))
  }

  await setValue(storageKey, urlMap)

  await addRecentTags(newTags, oldTags)
}

function getScore(weight = 1) {
  return (Math.floor(Date.now() / 1000) / 1_000_000_000) * weight
}

async function addRecentTags(newTags: string[], oldTags: string[]) {
  if (newTags.length === 0) {
    return
  }

  newTags =
    oldTags && oldTags.length > 0
      ? newTags.filter((v) => !oldTags.includes(v))
      : newTags

  if (newTags.length > 0) {
    const recentTags: RecentTag[] = (await getValue(storageKeyRecentTags)) || []
    const score = getScore()

    for (const tag of newTags) {
      recentTags.push({
        tag,
        score,
      })
    }

    if (recentTags.length > 1000) {
      recentTags.splice(0, 100)
    }

    await setValue(storageKeyRecentTags, recentTags)
    await generateMostUsedAndRecentAddedTags(recentTags)
  }
}

async function generateMostUsedAndRecentAddedTags(recentTags: RecentTag[]) {
  const mostUsed: Record<string, RecentTag> = {}

  for (const recentTag of recentTags) {
    if (!recentTag.tag) {
      continue
    }

    if (mostUsed[recentTag.tag]) {
      mostUsed[recentTag.tag].score += recentTag.score
    } else if (recentTag.tag) {
      mostUsed[recentTag.tag] = {
        tag: recentTag.tag,
        score: recentTag.score,
      }
    }
  }

  const mostUsedTags = Object.values(mostUsed)
    // Use at least 2 times
    .filter((v) => v.score > getScore(1.5))
    .sort((a, b) => {
      return b.score - a.score
    })
    .map((v) => v.tag)
    .slice(0, 200)

  const uniqSet = new Set()
  const recentAddedTags = recentTags
    .map((v) => v.tag)
    .reverse()
    .filter((v) => v && !uniqSet.has(v) && uniqSet.add(v))
    .slice(0, 200)

  await setValue(storageKeyMostUsedTags, mostUsedTags)
  await setValue(storageKeyRecentAddedTags, recentAddedTags)
}

export async function getMostUsedTags(): Promise<string[]> {
  return (await getValue(storageKeyMostUsedTags)) || []
}

export async function getRecentAddedTags(): Promise<string[]> {
  return (await getValue(storageKeyRecentAddedTags)) || []
}

export async function getPinnedTags(): Promise<string[]> {
  return splitTags((getSettingsValue("pinnedTags") as string) || "")
}

export function addTagsValueChangeListener(func) {
  addValueChangeListener(storageKey, func)
}

addTagsValueChangeListener(async () => {
  cachedUrlMap = undefined
  await checkVersion()
})

async function reload() {
  console.log("Current extionsion is outdated, need reload page")
  const urlMap = await getUrlMap()
  urlMap.meta = urlMap.meta || {}
  await setValue(storageKey, urlMap)
  location.reload()
}

async function checkVersion() {
  cachedUrlMap = await getUrlMap()
  const meta = cachedUrlMap.meta || {}
  if (meta.extensionVersion !== extensionVersion) {
    console.log(
      "Previous extension version:",
      meta.extensionVersion,
      "current extension version:",
      extensionVersion
    )
    if (meta.extensionVersion > extensionVersion) {
      // await reload()
      // return false
    }
  }

  if (meta.databaseVersion !== databaseVersion) {
    console.log(
      "Previous database version:",
      meta.databaseVersion,
      "current database version:",
      databaseVersion
    )
    if (meta.databaseVersion > databaseVersion) {
      await reload()
      return false
    }
  }

  return true
}

function isValidKey(key) {
  return isUrl(key)
}

function isValidTags(tags) {
  return Array.isArray(tags)
}

function mergeTags(tags: string[], tags2: string[]) {
  tags = tags || []
  tags2 = tags2 || []
  return uniq(
    tags
      .concat(tags2)
      .map((v) => (v ? String(v).trim() : v))
      .filter(Boolean)
  ) as string[]
}

async function migrationData(urlMap: Record<string, unknown>) {
  console.log("Before migration", JSON.stringify(urlMap))
  const meta = urlMap.meta || {}

  const now = Date.now()
  const meta2 = { created: now, updated: now }

  if (!meta.databaseVersion) {
    meta.databaseVersion = 1
  }

  if (meta.databaseVersion === 1) {
    for (const key in urlMap) {
      if (!Object.hasOwn(urlMap, key)) {
        continue
      }

      if (!isValidKey(key)) {
        continue
      }

      const tags = urlMap[key]
      if (!isValidTags(tags)) {
        throw new Error("Invaid data format.")
      }

      const newTags = mergeTags(tags, [])
      if (newTags.length > 0) {
        urlMap[key] = { tags: newTags, meta: meta2 }
      } else {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete urlMap[key]
      }
    }

    meta.databaseVersion = 2
  }

  if (meta.databaseVersion === 2) {
    // Latest version
  }

  urlMap.meta = meta

  console.log("After migration", JSON.stringify(urlMap))
  return urlMap
}

export async function mergeData(urlMapNew: Record<string, unknown>) {
  if (typeof urlMapNew !== "object") {
    throw new TypeError("Invalid data format")
  }

  let numberOfLinks = 0
  let numberOfTags = 0
  const urlMap = await getUrlMap()
  if (
    !urlMapNew.meta ||
    urlMapNew.meta.databaseVersion !== urlMap.meta.databaseVersion
  ) {
    urlMapNew = await migrationData(urlMapNew)
  }

  if (urlMapNew.meta.databaseVersion !== urlMap.meta.databaseVersion) {
    throw new Error("Invalid database version")
  }

  for (const key in urlMapNew) {
    if (!Object.hasOwn(urlMapNew, key)) {
      continue
    }

    if (!isValidKey(key)) {
      continue
    }

    const tags = (urlMapNew[key].tags as string[]) || []
    const meta = (urlMapNew[key].meta as ItemMeta) || {}
    if (!isValidTags(tags)) {
      throw new Error("Invaid data format.")
    }

    const orgData: TagsAndMeta = (urlMap[key] as TagsAndMeta) || { tags: [] }
    const orgTags = orgData.tags || []
    const newTags = mergeTags(orgTags, tags)
    const now = Date.now()
    if (newTags.length > 0) {
      const orgMeta = orgData.meta || {}
      const created = Math.min(orgMeta.created || now, meta.created || now)
      const updated = Math.max(orgMeta.updated || 0, meta.updated || 0, created)
      const newMata = Object.assign({}, orgMeta, meta, { created, updated })
      urlMap[key] = Object.assign({}, orgData, { tags: newTags, meta: newMata })
      numberOfTags += Math.max(newTags.length - orgTags.length, 0)
      if (orgTags.length === 0) {
        numberOfLinks++
      }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete urlMap[key]
    }
  }

  await setValue(storageKey, urlMap)
  console.log(
    `数据已成功导入，新增 ${numberOfLinks} 条链接，新增 ${numberOfTags} 条标签。`
  )
  return { numberOfLinks, numberOfTags }
}

export async function migration() {
  const result = await checkVersion()
  if (!result) {
    return
  }

  cachedUrlMap = await getUrlMap()
  // console.log(cachedUrlMap)
  const meta = (cachedUrlMap.meta as UrlMapMeta) || ({} as UrlMapMeta)

  if (meta.databaseVersion !== databaseVersion) {
    meta.databaseVersion = meta.databaseVersion || 1

    if (meta.databaseVersion < databaseVersion) {
      console.log("Migration start")
      await saveTags("any", [])
      console.log("Migration done")
    }
  }

  const urlMapVer1 = await getUrlMapVesion1()
  if (urlMapVer1) {
    console.log(
      "Migration start: database version 1 to database version",
      databaseVersion
    )
    const result = await mergeData(urlMapVer1)
    if (result) {
      await setValue("plugin.utags.tags.v1", null)
    }
  }
}
