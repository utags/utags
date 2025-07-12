import { createElement, doc } from "browser-extension-utils"

import { getUrlMap } from "../storage/bookmarks"
import type { BookmarkTagsAndMetadata } from "../types/bookmarks.js"

const mergeData = async () => {
  return { numberOfLinks: 0, numberOfTags: 0 }
}

export async function outputData() {
  if (
    /^(utags\.pipecraft\.net|localhost|127\.0\.0\.1)$/.test(location.hostname)
  ) {
    const urlMap = await getUrlMap()

    const textarea = createElement("textarea")
    textarea.id = "utags_output"
    textarea.setAttribute("style", "display:none")
    textarea.value = JSON.stringify(urlMap)
    doc.body.append(textarea)

    textarea.addEventListener("click", async () => {
      if (textarea.dataset.utags_type === "export") {
        const urlMap = await getUrlMap()

        const sortedBookmarks = Object.fromEntries(
          sortBookmarks(Object.entries(urlMap))
        )

        textarea.value = JSON.stringify(sortedBookmarks)
        textarea.dataset.utags_type = "export_done"
        // Triger change event
        textarea.click()
      } else if (textarea.dataset.utags_type === "import") {
        const data = textarea.value as string
        try {
          const result = await mergeData(
            JSON.parse(data) as Record<string, unknown>
          )
          textarea.value = JSON.stringify(result)
          textarea.dataset.utags_type = "import_done"
          // Triger change event
          textarea.click()
        } catch (error) {
          console.error(error)
          textarea.value = JSON.stringify(error)
          textarea.dataset.utags_type = "import_failed"
          // Triger change event
          textarea.click()
        }
      }
    })
  }
}

type BookmarkItem = [string, BookmarkTagsAndMetadata]

/**
 * Sort an array of bookmarks by created date desc
 * @param bookmarks Array of bookmarks in format [[url, entry], ...]
 * @returns Sorted array of bookmarks
 */
export function sortBookmarks(bookmarks: BookmarkItem[]): BookmarkItem[] {
  return [...bookmarks].sort((a, b) => {
    const entryA = a[1]
    const entryB = b[1]

    return entryB.meta.created - entryA.meta.created
  })
}
