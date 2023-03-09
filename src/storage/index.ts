import { addValueChangeListener, getValue, setValue } from "~storage/chrome"

import { uniq } from "../utils"

const STORAGE_KEY = "extension.utags.urlmap"
let cachedUrlMap

async function getUrlMap() {
  return (await getValue(STORAGE_KEY)) || {}
}

export async function getTags(key: string) {
  if (!cachedUrlMap) {
    cachedUrlMap = await getUrlMap()
  }

  return cachedUrlMap[key] || []
}

export async function saveTags(key: string, tags: string[]) {
  const urlMap = await getUrlMap()
  urlMap[key] = uniq(tags.map((v) => (v ? v.trim() : v)).filter(Boolean))
  if (urlMap[key].length === 0) {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete urlMap[key]
  }

  await setValue(STORAGE_KEY, urlMap)
}

export function addTagsValueChangeListener(func) {
  addValueChangeListener(STORAGE_KEY, func)
}

addTagsValueChangeListener(() => {
  cachedUrlMap = null
})
