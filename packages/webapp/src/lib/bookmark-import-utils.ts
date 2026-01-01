import Console from 'console-tagger'
import { splitTags, trimTitle } from 'utags-utils'
import { type BookmarksStore } from '../types/bookmarks.js'
import { convertDate, isValidDate } from '../utils/date.js'
import { normalizeHierachyPath } from '../utils/bookmarks.js'

const console = new Console({
  prefix: 'bookmark-import-utils',
  color: {
    line: 'black',
    background: 'cyan',
  },
})

const NO_ADD_DATE = '99999999999999'

const NO_LAST_MODIFIED = '0'

export function validateBookmarks(bookmarksStore: BookmarksStore) {
  try {
    const data = bookmarksStore

    // 验证基本结构
    if (!data || typeof data !== 'object') {
      throw new Error('无效的JSON格式')
    }

    // 验证BookmarksStore结构
    if (!data.data || typeof data.data !== 'object') {
      throw new Error('缺少data字段或格式不正确')
    }

    if (!data.meta || typeof data.meta !== 'object') {
      // throw new Error('缺少meta字段或格式不正确')
      console.warn('缺少meta字段或格式不正确')
      data.meta = {
        databaseVersion: 3,
        created: Date.now(),
        exported: Date.now(),
      }
    }

    // 验证meta字段
    if (
      typeof data.meta.databaseVersion !== 'number' ||
      data.meta.databaseVersion !== 3
    ) {
      throw new TypeError('数据文件版本不支持，请联系开发者')
    }

    if (
      (data.meta.created && typeof data.meta.created !== 'number') ||
      (data.meta.exported && typeof data.meta.exported !== 'number')
    ) {
      throw new TypeError('meta 字段里的属性类型错误')
    }

    // 验证data字段中的每个书签
    let total = 0
    const newCount = 0
    const conflicts = 0
    let noCreated = 0

    for (const [url, bookmark] of Object.entries(data.data)) {
      total++

      if (!bookmark.tags || !Array.isArray(bookmark.tags)) {
        throw new Error(`书签 ${url} 缺少有效的tags字段`)
      }

      if (!bookmark.meta || typeof bookmark.meta !== 'object') {
        throw new Error(`书签 ${url} 缺少有效的meta字段`)
      }

      if (
        typeof bookmark.meta.created !== 'number' ||
        typeof bookmark.meta.updated !== 'number'
      ) {
        throw new TypeError(`书签 ${url} 的meta字段缺少必要属性`)
      }

      if (!isValidDate(bookmark.meta.created)) {
        noCreated++
      }
    }

    return {
      total,
      noCreated,
      new: newCount,
      conflicts,
      data, // 返回解析后的数据
    }
  } catch (error) {
    console.error('文件验证失败:', error)
    throw new Error(
      `文件验证失败: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

function prepareHtml(html: string) {
  // 去除所有 p, HR(Firefox) 标签
  return html.replaceAll(/<\/?p>|<\/?HR>/g, '')
}

export function htmlToBookmarks(html: string): BookmarksStore {
  const parser = new DOMParser()
  const document_ = parser.parseFromString(prepareHtml(html), 'text/html')

  const result: BookmarksStore = {
    data: {},
    meta: {
      databaseVersion: 3,
      created: Date.now(),
      exported: Date.now(),
    },
  }

  // 递归处理文件夹
  const processFolder = (
    dlElement: HTMLElement,
    currentPath: string[] = []
  ) => {
    console.log(
      `Processing folder: ${currentPath.join('/')}, Path: ${currentPath.join(
        '/'
      )}`
    )
    const items = Array.from(dlElement.children).filter(
      (child) => child.tagName === 'DT'
    )
    console.log(`Found ${items.length} items in folder`)

    for (const item of items) {
      // 处理文件夹
      const folderHeader = item.querySelector('h3')
      if (folderHeader) {
        const folderName = folderHeader.textContent || ''
        const nextDlElement = folderHeader.nextElementSibling // || item.nextElementSibling

        console.log(
          `Found folder: ${folderName}, Path: ${currentPath.join('/')}`
        )

        if (nextDlElement && nextDlElement.tagName === 'DL') {
          processFolder(nextDlElement as HTMLElement, [
            ...currentPath,
            folderName,
          ])
        }

        continue
      }

      // 处理书签
      const link = item.querySelector('a')
      if (!link) continue

      const href = link.getAttribute('href')
      if (!href || href.startsWith('place:')) continue

      const title = trimTitle(link.textContent || '')
      const addDate = Number.parseInt(
        link.getAttribute('add_date') === '0'
          ? NO_ADD_DATE
          : link.getAttribute('add_date') || NO_ADD_DATE,
        10
      )
      const lastModified = Number.parseInt(
        link.getAttribute('last_modified') === '0'
          ? NO_LAST_MODIFIED
          : link.getAttribute('last_modified') || NO_LAST_MODIFIED,
        10
      )
      const tagsAttribute = link.getAttribute('tags') || ''

      // 构建标签数组
      const tags = [
        '/' + normalizeHierachyPath(currentPath.join('/') || 'Other Bookmarks'),
        ...splitTags(tagsAttribute),
      ]

      // console.log(
      //   `Processing bookmark: ${title}, URL: ${href.slice(0, 50)}, Tags: ${tags.join(', ')}, Created: ${new Date(convertDate(addDate)).toISOString()}, Updated: ${new Date(convertDate(lastModified)).toISOString()}`
      // )

      // 处理重复书签
      const existingBookmark = result.data[href]
      if (existingBookmark) {
        // 合并标签
        const mergedTags = [...new Set([...existingBookmark.tags, ...tags])]

        // 选择更早的创建日期
        const created = Math.min(
          existingBookmark.meta.created,
          convertDate(addDate)
        )

        // 选择更晚的修改日期
        const updated = Math.max(
          existingBookmark.meta.updated,
          convertDate(lastModified)
        )

        // 选择修改日期更晚的标题
        const selectedTitle =
          updated === convertDate(lastModified)
            ? title
            : existingBookmark.meta.title

        result.data[href] = {
          tags: mergedTags,
          meta: {
            title: selectedTitle,
            created,
            updated,
          },
        }

        console.log(
          `Merged bookmark: ${selectedTitle}, URL: ${href.slice(0, 50)}, Tags: ${mergedTags.join(
            ', '
          )}, Created: ${new Date(created).toISOString()}, Updated: ${new Date(updated).toISOString()}`
        )
      } else {
        result.data[href] = {
          tags,
          meta: {
            title,
            created: convertDate(addDate),
            updated: convertDate(lastModified),
          },
        }
      }
    }
  }

  // 判断是否有跟 DL 元素。Safari 导出的 HTML 可能没有根 DL 元素，直接出现 DT 元素。
  const hasRootDlElement = !Array.from(document_.body.children).some(
    (child) => child.tagName === 'DT'
  )
  // 从根 DL 或 BODY 开始处理
  const rootElement = hasRootDlElement
    ? document_.querySelector('dl')
    : document_.body
  console.log('Root DL:', rootElement, rootElement?.outerHTML)
  if (rootElement) {
    processFolder(rootElement)
  }

  console.log('Final result:', result)
  return result
}

export async function validateBookmarksFile(
  file: File,
  fileType: 'json' | 'html'
) {
  try {
    const content = await file.text()
    let bookmarksStore: BookmarksStore
    if (fileType === 'html') {
      bookmarksStore = htmlToBookmarks(content)
    } else if (fileType === 'json') {
      bookmarksStore = JSON.parse(content) as BookmarksStore
    } else {
      throw new Error('不支持的文件类型')
    }

    return validateBookmarks(bookmarksStore)
  } catch (error) {
    console.error('文件验证失败:', error)
    throw new Error(
      `文件验证失败: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
