import { createElement, doc } from "browser-extension-utils"

import { getUrlMap } from "../storage/bookmarks"
import { normalizeBookmarkData, sortBookmarks } from "../utils/index.js"

const mergeData = async () => {
  return { numberOfLinks: 0, numberOfTags: 0 }
}

export async function outputData() {
  if (
    /^(utags\.pipecraft\.net|localhost|127\.0\.0\.1)$/.test(location.hostname)
  ) {
    const urlMap = await getUrlMap()

    const textarea = createElement("textarea") as HTMLTextAreaElement
    textarea.id = "utags_output"
    textarea.setAttribute("style", "display:none")
    textarea.value = JSON.stringify(urlMap)
    doc.body.append(textarea)

    textarea.addEventListener("click", async () => {
      if (textarea.dataset.utags_type === "export") {
        const urlMap = await getUrlMap()

        const sortedBookmarks = Object.fromEntries(
          normalizeBookmarkData(sortBookmarks(Object.entries(urlMap)))
        )

        textarea.value = JSON.stringify(sortedBookmarks)
        textarea.dataset.utags_type = "export_done"
        // Triger change event
        textarea.click()
      } else if (textarea.dataset.utags_type === "import") {
        const data = textarea.value
        try {
          const result = await mergeData()
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
