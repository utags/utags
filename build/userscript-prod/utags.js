// ==UserScript==
// @name         UTags - Add usertags to links
// @name:zh-CN   小鱼标签 (UTags) - 为链接添加用户标签
// @namespace    https://utags.pipecraft.net/
// @homepage     https://utags.pipecraft.net/
// @version      0.1.0
// @description  Allow users to add custom tags to links.
// @description:zh-CN 此插件允许用户为网站的链接添加自定义标签。比如，可以给论坛的用户或帖子添加标签。
// @author       Pipecraft
// @license      MIT
// @match        https://*/*
// @match        http://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addValueChangeListener
// ==/UserScript==

;(() => {
  "use strict"
  var style_default =
    '#utags_layer {\n  height: 200px;\n  width: 200px;\n  background-color: red;\n}\n\n.utags_ul {\n  display: inline-block;\n  list-style-type: none;\n  margin: 0px;\n  position: relative;\n}\n\n.utags_ul > li {\n  display: inline-block;\n}\n\n.utags_text_tag {\n  border: 1px solid red;\n  color: red !important;\n  border-radius: 3px;\n  padding: 1px 3px;\n  margin: 1px 3px;\n  font-size: 10px;\n  font-weight: normal;\n  cursor: pointer;\n}\n\n.utags_captain_tag {\n  opacity: 1%;\n  position: absolute;\n  top: 0px;\n  left: 0px;\n  padding: 0;\n  margin: 0;\n  border: none;\n  width: 4px;\n  height: 4px;\n  font-size: 1px;\n  background-color: #fff;\n}\n\n.utags_captain_tag2 {\n  border: none;\n}\n\n*:hover+.utags_ul .utags_captain_tag,\n.utags_ul:hover .utags_captain_tag,\n:not(a)+.utags_ul .utags_captain_tag,\n/* vimium extension */\nhtml:has(#vimiumHintMarkerContainer) .utags_captain_tag {\n  opacity: 90%;\n  width: auto;\n  height: auto;\n  padding: 2px 6px;\n  font-size: 10px;\n}\n\n:not(a) + .utags_ul .utags_captain_tag {\n  position: relative;\n}\n\n.utags_favicon {\n  width: 16px;\n  height: 16px;\n  margin-right: 10px;\n}\n\n[data-utags_list_node]:has(\n    [data-utags_condition_node] + .utags_ul .utags_text_tag[data-utags_tag="sb"]\n  ) {\n  opacity: 40%;\n}\n\n[data-utags_list_node]:has(\n    [data-utags_condition_node]\n      + .utags_ul\n      .utags_text_tag[data-utags_tag="block"]\n  ) {\n  opacity: 20%;\n  /* display: none; */\n}\n'

  // src/utils/index.ts
  var doc = document
  var uniq = (array) => [...new Set(array)]
  var $ = doc.querySelector.bind(doc)
  var $$ = doc.querySelectorAll.bind(doc)
  var createElement = doc.createElement.bind(doc)
  var extensionVersion = "0.1.0"
  var databaseVersion = 2
  var isUrl = (text) => /^https?:\/\//.test(text)

  // src/components/tag.ts
  function createTag(tagName) {
    const a = createElement("a")
    a.textContent = tagName
    a.dataset.utags_tag = tagName
    a.setAttribute("href", "https://utags.pipecraft.net/tags/#" + tagName)
    a.setAttribute("target", "_blank")
    a.setAttribute("class", "utags_text_tag")
    return a
  }

  // src/sites/v2ex.ts
  var site = {
    getListNodes() {
      const patterns = [".box .cell"]
      return $$(patterns.join(","))
    },
    getConditionNodes() {
      const patterns = [
        ".box .cell .topic-link",
        // 帖子标题
        ".item_hot_topic_title a",
        // 右边栏标题
        '.box .cell .topic_info strong:first-of-type a[href*="/member/"]',
        // 帖子作者
        '#Main strong a.dark[href*="/member/"]'
        // 评论者
      ]
      return $$(patterns.join(","))
    },
    matchedNodes() {
      const patterns = [
        '.topic_info a[href*="/member/"]',
        // 帖子作者，最后回复者
        "a.topic-link",
        // 帖子标题
        ".item_hot_topic_title a",
        // 右边栏标题
        '#Main strong a.dark[href*="/member/"]',
        // 评论者
        '.topic_content a[href*="/member/"]',
        // 帖子内容中 @用户
        '.topic_content a[href*="/t/"]',
        // 帖子内容中帖子链接
        '.reply_content a[href*="/member/"]',
        // 回复内容中 @用户
        '.reply_content a[href*="/t/"]',
        // 回复内容中帖子链接
        '.header small a[href*="/member/"]',
        // 帖子详细页作者
        '.dock_area a[href*="/member/"]',
        // 个人主页回复列表作者
        '.dock_area a[href*="/t/"]'
        // 个人主页回复列表帖子标题
      ]
      const elements = $$(patterns.join(","))
      function getCanonicalUrl2(url) {
        return url
          .replace(/[?#].*/, "")
          .replace(/(\w+\.)?v2ex.com/, "www.v2ex.com")
      }
      const nodes = [...elements].map((element) => {
        const key = getCanonicalUrl2(element.href)
        const title = element.textContent
        const meta = { title }
        element.utags = { key, meta }
        return element
      })
      if (location.pathname.includes("/member/")) {
        const profile = $("h1")
        if (profile) {
          const key = "https://www.v2ex.com/member/" + profile.textContent
          const meta = { title: profile.textContent }
          profile.utags = { key, meta }
          nodes.push(profile)
        }
      }
      if (location.pathname.includes("/t/")) {
        const header = $(".topic_content")
        if (header) {
          const key = getCanonicalUrl2(
            "https://www.v2ex.com" + location.pathname
          )
          const title = $("h1").textContent
          const meta = { title }
          header.utags = { key, meta }
          nodes.push(header)
        }
      }
      return nodes
    }
  }
  var v2ex_default = site

  // src/sites/index.ts
  function matchedSite(hostname2) {
    if (/v2ex\.com|v2hot\./.test(hostname2)) {
      return v2ex_default
    }
    return null
  }
  function getListNodes(hostname2) {
    const site2 = matchedSite(hostname2)
    if (site2) {
      return site2.getListNodes()
    }
    return []
  }
  function getConditionNodes(hostname2) {
    const site2 = matchedSite(hostname2)
    if (site2) {
      return site2.getConditionNodes()
    }
    return []
  }
  function getCanonicalUrl(url) {
    return url
  }
  function matchedNodes(hostname2) {
    const site2 = matchedSite(hostname2)
    const set = /* @__PURE__ */ new Set()
    if (site2) {
      const array2 = site2.matchedNodes()
      for (const element of array2) {
        set.add(element)
      }
    }
    const array = $$("[data-utags_primary_link]")
    for (const element of array) {
      if (!element.utags) {
        const key = getCanonicalUrl(element.href)
        const title = element.textContent
        const meta = {}
        if (!isUrl(title)) {
          meta.title = title
        }
        element.utags = { key, meta }
      }
      set.add(element)
    }
    console.log(set)
    return [...set]
  }

  // src/storage/userscript.js
  if (
    typeof GM_getValue !== "function" &&
    typeof document.GM_getValue === "function"
  ) {
    GM_getValue = document.GM_getValue
    GM_setValue = document.GM_setValue
    GM_addValueChangeListener = document.GM_addValueChangeListener
  }
  var getValue = (key) => JSON.parse(GM_getValue(key) || "{}")
  var setValue = (key, value) => GM_setValue(key, JSON.stringify(value))
  var addValueChangeListener = GM_addValueChangeListener

  // src/storage/index.ts
  var STORAGE_KEY = "extension.utags.urlmap"
  var cachedUrlMap
  async function getUrlMap() {
    return (await getValue(STORAGE_KEY)) || {}
  }
  async function getUrlMapVesion1() {
    return getValue("plugin.utags.tags.v1")
  }
  async function getTags(key) {
    if (!cachedUrlMap) {
      cachedUrlMap = await getUrlMap()
    }
    return cachedUrlMap[key] || { tags: [] }
  }
  async function saveTags(key, tags, meta) {
    console.log("saveTags 1", key, tags, meta)
    const urlMap = await getUrlMap()
    urlMap.meta = Object.assign({}, urlMap.meta, {
      extensionVersion,
      databaseVersion
    })
    const newTags = mergeTags(tags, [])
    if (newTags.length === 0) {
      delete urlMap[key]
    } else {
      const now = Date.now()
      const data = urlMap[key] || {}
      const newMeta = Object.assign({}, data.meta, meta, { updated: now })
      newMeta.created = newMeta.created || now
      urlMap[key] = {
        tags: newTags,
        meta: newMeta
      }
      console.log("saveTags 2", key, JSON.stringify(urlMap[key]))
    }
    await setValue(STORAGE_KEY, urlMap)
  }
  function addTagsValueChangeListener(func) {
    addValueChangeListener(STORAGE_KEY, func)
  }
  addTagsValueChangeListener(async () => {
    cachedUrlMap = null
    await checkVersion()
  })
  async function reload() {
    console.log("Current extionsion is outdated, need reload page")
    const urlMap = await getUrlMap()
    urlMap.meta = urlMap.meta || {}
    await setValue(STORAGE_KEY, urlMap)
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
        await reload()
        return false
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
  function mergeTags(tags, tags2) {
    tags = tags || []
    tags2 = tags2 || []
    return uniq(
      tags
        .concat(tags2)
        .map((v) => (v ? String(v).trim() : v))
        .filter(Boolean)
    )
  }
  async function migrationData(urlMap) {
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
          delete urlMap[key]
        }
      }
      meta.databaseVersion = 2
    }
    if (meta.databaseVersion === 2) {
    }
    urlMap.meta = meta
    console.log("After migration", JSON.stringify(urlMap))
    return urlMap
  }
  async function mergeData(urlMapNew) {
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
      const tags = urlMapNew[key].tags || []
      const meta = urlMapNew[key].meta || {}
      if (!isValidTags(tags)) {
        throw new Error("Invaid data format.")
      }
      const orgData = urlMap[key] || { tags: [] }
      const orgTags = orgData.tags || []
      const newTags = mergeTags(orgTags, tags)
      if (newTags.length > 0) {
        const orgMeta = orgData.meta || {}
        const created = Math.min(orgMeta.created || 0, meta.created || 0)
        const updated = Math.max(orgMeta.updated || 0, meta.updated || 0)
        const newMata = Object.assign({}, orgMeta, meta, { created, updated })
        urlMap[key] = Object.assign({}, orgData, {
          tags: newTags,
          meta: newMata
        })
        numberOfTags += Math.max(newTags.length - orgTags.length, 0)
        if (orgTags.length === 0) {
          numberOfLinks++
        }
      } else {
        delete urlMap[key]
      }
    }
    await setValue(STORAGE_KEY, urlMap)
    console.log(
      `\u6570\u636E\u5DF2\u6210\u529F\u5BFC\u5165\uFF0C\u65B0\u589E ${numberOfLinks} \u6761\u94FE\u63A5\uFF0C\u65B0\u589E ${numberOfTags} \u6761\u6807\u7B7E\u3002`
    )
    return { numberOfLinks, numberOfTags }
  }
  async function migration() {
    const result = await checkVersion()
    if (!result) {
      return
    }
    cachedUrlMap = await getUrlMap()
    console.log(cachedUrlMap)
    const meta = cachedUrlMap.meta || {}
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
      const result2 = await mergeData(urlMapVer1)
      if (result2) {
        await setValue("plugin.utags.tags.v1", null)
      }
    }
  }

  // src/contents/utags.ts
  var hostname = location.hostname
  var getStyle = () => {
    const style = createElement("style")
    style.id = "utags_style"
    style.textContent = style_default
    document.head.append(style)
  }
  function appendTagsToPage(element, key, tags, meta) {
    var _a, _b
    if (
      (_b = (_a = element.nextSibling) == null ? void 0 : _a.classList) == null
        ? void 0
        : _b.contains("utags_ul")
    ) {
      element.nextSibling.remove()
    }
    const ul = createElement("ul")
    let li = createElement("li")
    let a = createElement("a")
    a.textContent = "\u{1F3F7}\uFE0F"
    a.setAttribute(
      "class",
      tags.length === 0
        ? "utags_text_tag utags_captain_tag"
        : "utags_text_tag utags_captain_tag2"
    )
    a.addEventListener("click", async function () {
      const newTags = prompt(
        "[UTags] \u8BF7\u8F93\u5165\u6807\u7B7E\uFF0C\u7528\u9017\u53F7\u5206\u5F00\u591A\u4E2A\u6807\u7B7E",
        tags.join(", ")
      )
      if (newTags !== null) {
        const newTagsArray = newTags.split(/\s*[,，]\s*/)
        await saveTags(key, newTagsArray, meta)
      }
    })
    li.append(a)
    ul.append(li)
    for (const tag of tags) {
      li = createElement("li")
      a = createTag(tag)
      li.append(a)
      ul.append(li)
    }
    ul.setAttribute("class", "utags_ul")
    element.after(ul)
  }
  function displayTags() {
    const listNodes = getListNodes(hostname)
    for (const node of listNodes) {
      node.dataset.utags_list_node = ""
    }
    const conditionNodes = getConditionNodes(hostname)
    for (const node of conditionNodes) {
      node.dataset.utags_condition_node = ""
    }
    const nodes = matchedNodes(hostname)
    nodes.map(async (node) => {
      if (!node.utags || !node.utags.key) {
        return
      }
      const object = await getTags(node.utags.key)
      const tags = object.tags || []
      appendTagsToPage(node, node.utags.key, tags, node.utags.meta)
    })
  }
  async function outputData() {
    if (
      /^(utags\.pipecraft\.net|localhost|127\.0\.0\.1)$/.test(location.hostname)
    ) {
      const urlMap = await getUrlMap()
      const textarea = createElement("textarea")
      textarea.id = "utags_output"
      textarea.setAttribute("style", "display:none")
      textarea.value = JSON.stringify(urlMap)
      document.body.append(textarea)
      textarea.addEventListener("click", async () => {
        if (textarea.dataset.utags_type === "export") {
          const urlMap2 = await getUrlMap()
          textarea.value = JSON.stringify(urlMap2)
          textarea.dataset.utags_type = "export_done"
          textarea.click()
        } else if (textarea.dataset.utags_type === "import") {
          const data = textarea.value
          try {
            const result = await mergeData(JSON.parse(data))
            textarea.value = JSON.stringify(result)
            textarea.dataset.utags_type = "import_done"
            textarea.click()
          } catch (error) {
            console.error(error)
            textarea.value = JSON.stringify(error)
            textarea.dataset.utags_type = "import_failed"
            textarea.click()
          }
        }
      })
    }
  }
  async function initStorage() {
    await migration()
    addTagsValueChangeListener(displayTags)
  }
  var countOfLinks = 0
  async function main() {
    document.addEventListener("mouseover", (event) => {
      if (event.target && event.target.tagName === "A") {
      }
    })
    getStyle()
    setTimeout(outputData, 1)
    await initStorage()
    displayTags()
    countOfLinks = $$("a:not(.utags_text_tag)").length
    setInterval(() => {
      const count = $$("a:not(.utags_text_tag)").length
      if (countOfLinks !== count) {
        console.log(countOfLinks, count)
        countOfLinks = count
        displayTags()
      }
    }, 1e3)
  }
  main()
})()
