// ==UserScript==
// @name                 🏷️ UTags - Add usertags to links
// @name:zh-CN           🏷️ 小鱼标签 (UTags) - 为链接添加用户标签
// @namespace            https://utags.pipecraft.net/
// @homepageURL          https://github.com/utags/utags#readme
// @supportURL           https://github.com/utags/utags/issues
// @version              0.1.5
// @description          Allow users to add custom tags to links.
// @description:zh-CN    此插件允许用户为网站的链接添加自定义标签。比如，可以给论坛的用户或帖子添加标签。
// @icon                 https://utags.pipecraft.net/favicon.png
// @author               Pipecraft
// @license              MIT
// @match                https://*/*
// @match                http://*/*
// @grant                GM.getValue
// @grant                GM.setValue
// @grant                GM_addValueChangeListener
// @grant                GM_removeValueChangeListener
// ==/UserScript==
//
;(() => {
  "use strict"
  var doc = document
  var uniq = (array) => [...new Set(array)]
  var $ = (selectors, element) => (element || doc).querySelector(selectors)
  var $$ = (selectors, element) => [
    ...(element || doc).querySelectorAll(selectors),
  ]
  var createElement = (tagName, attributes) =>
    setAttributes(doc.createElement(tagName), attributes)
  var addEventListener = (element, type, listener, options) => {
    if (!element) {
      return
    }
    if (typeof type === "object") {
      for (const type1 in type) {
        if (Object.hasOwn(type, type1)) {
          element.addEventListener(type1, type[type1])
        }
      }
    } else if (typeof type === "string" && typeof listener === "function") {
      element.addEventListener(type, listener, options)
    }
  }
  var setAttribute = (element, name, value) =>
    element ? element.setAttribute(name, value) : void 0
  var setAttributes = (element, attributes) => {
    if (element && attributes) {
      for (const name in attributes) {
        if (Object.hasOwn(attributes, name)) {
          const value = attributes[name]
          if (value === void 0) {
            continue
          }
          if (/^(value|textContent|innerText|innerHTML)$/.test(name)) {
            element[name] = value
          } else if (name === "style") {
            setStyle(element, value, true)
          } else if (/on\w+/.test(name)) {
            const type = name.slice(2)
            addEventListener(element, type, value)
          } else {
            setAttribute(element, name, value)
          }
        }
      }
    }
    return element
  }
  var setStyle = (element, values, overwrite) => {
    if (!element) {
      return
    }
    const style = element.style
    if (typeof values === "string") {
      style.cssText = overwrite ? values : style.cssText + ";" + values
      return
    }
    if (overwrite) {
      style.cssText = ""
    }
    for (const key in values) {
      if (Object.hasOwn(values, key)) {
        style[key] = values[key].replace("!important", "")
      }
    }
  }
  var isUrl = (text) => /^https?:\/\//.test(text)
  if (typeof Object.hasOwn !== "function") {
    Object.hasOwn = (instance, prop) =>
      Object.prototype.hasOwnProperty.call(instance, prop)
  }
  var content_default =
    '\uFEFF#utags_layer{height:200px;width:200px;background-color:red}.utags_ul{display:inline;list-style-type:none;margin:0px;margin-left:2px;padding:0px;position:relative;line-height:10px}.utags_ul>li{display:inline-flex;align-items:center}.utags_text_tag{border:1px solid red;color:red !important;border-radius:3px;padding:1px 3px;margin:0px 3px;font-size:10px;line-height:10px;font-weight:normal;text-decoration:none;cursor:pointer}.utags_captain_tag,.utags_captain_tag2{border:none;text-indent:-9999px;width:12px;height:12px;padding:0;display:block;background-image:url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTcuNSA5QzguMzI4NDMgOSA5IDguMzI4NDMgOSA3LjVDOSA2LjY3MTU3IDguMzI4NDMgNiA3LjUgNkM2LjY3MTU3IDYgNiA2LjY3MTU3IDYgNy41QzYgOC4zMjg0MyA2LjY3MTU3IDkgNy41IDlaIiBmaWxsPSJibGFjayIvPgo8cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTIgNEMyIDIuODk1NDMgMi44OTU0MyAyIDQgMkgxMS4xNzE2QzExLjcwMiAyIDEyLjIxMDcgMi4yMTA3MSAxMi41ODU4IDIuNTg1NzlMMjEuNTg1OCAxMS41ODU4QzIyLjM2NjggMTIuMzY2OCAyMi4zNjY4IDEzLjYzMzIgMjEuNTg1OCAxNC40MTQyTDE0LjQxNDIgMjEuNTg1OEMxMy42MzMyIDIyLjM2NjggMTIuMzY2OCAyMi4zNjY4IDExLjU4NTggMjEuNTg1OEwyLjU4NTc5IDEyLjU4NThDMi4yMTA3MSAxMi4yMTA3IDIgMTEuNzAyIDIgMTEuMTcxNlY0Wk0yMC4xNzE2IDEzTDExLjE3MTYgNEg0VjExLjE3MTZMMTMgMjAuMTcxNkwyMC4xNzE2IDEzWiIgZmlsbD0iYmxhY2siLz4KPC9zdmc+Cg==);background-size:contain}.utags_captain_tag{opacity:1%;position:absolute;top:0px;left:-2px;padding:0;margin:0;border:none;width:4px;height:4px;font-size:1px;background-color:#fff}.utags_captain_tag:hover,.utags_captain_tag2:hover{background-image:url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTcuNSA5QzguMzI4NDMgOSA5IDguMzI4NDMgOSA3LjVDOSA2LjY3MTU3IDguMzI4NDMgNiA3LjUgNkM2LjY3MTU3IDYgNiA2LjY3MTU3IDYgNy41QzYgOC4zMjg0MyA2LjY3MTU3IDkgNy41IDlaIiBmaWxsPSJyZWQiLz4KPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0yIDRDMiAyLjg5NTQzIDIuODk1NDMgMiA0IDJIMTEuMTcxNkMxMS43MDIgMiAxMi4yMTA3IDIuMjEwNzEgMTIuNTg1OCAyLjU4NTc5TDIxLjU4NTggMTEuNTg1OEMyMi4zNjY4IDEyLjM2NjggMjIuMzY2OCAxMy42MzMyIDIxLjU4NTggMTQuNDE0MkwxNC40MTQyIDIxLjU4NThDMTMuNjMzMiAyMi4zNjY4IDEyLjM2NjggMjIuMzY2OCAxMS41ODU4IDIxLjU4NThMMi41ODU3OSAxMi41ODU4QzIuMjEwNzEgMTIuMjEwNyAyIDExLjcwMiAyIDExLjE3MTZWNFpNMjAuMTcxNiAxM0wxMS4xNzE2IDRINFYxMS4xNzE2TDEzIDIwLjE3MTZMMjAuMTcxNiAxM1oiIGZpbGw9InJlZCIvPgo8L3N2Zz4K)}*:hover+.utags_ul .utags_captain_tag,.utags_ul:hover .utags_captain_tag,:not(a)+.utags_ul .utags_captain_tag{opacity:100%;font-size:10px;width:12px;height:12px}html:has(#vimiumHintMarkerContainer) .utags_captain_tag{opacity:99%;font-size:10px;width:12px;height:12px}:not(a)+.utags_ul .utags_captain_tag{position:relative}[data-utags_list_node*=",\u6807\u9898\u515A,"],[data-utags_list_node*=",\u63A8\u5E7F,"],[data-utags_list_node*=",\u65E0\u804A,"],[data-utags_list_node*=",\u5FFD\u7565,"],[data-utags_list_node*=",sb,"]{opacity:10%}[data-utags_list_node*=",\u5DF2\u9605,"],[data-utags_list_node*=",\u65B0\u7528\u6237,"]{opacity:50%}[data-utags_list_node*=",hide,"],[data-utags_list_node*=",\u9690\u85CF,"],[data-utags_list_node*=",\u4E0D\u518D\u663E\u793A,"],[data-utags_list_node*=",block,"]{opacity:5%;display:none}[data-utags_list_node*=",\u70ED\u95E8,"],[data-utags_list_node*=",\u6536\u85CF,"],[data-utags_list_node*=",\u5173\u6CE8,"],[data-utags_list_node*=",\u7A0D\u540E\u9605\u8BFB,"]{background-image:linear-gradient(to right, #ffffff, #fefce8) !important;opacity:100% !important;display:block !important}[data-utags_list_node*=",\u70ED\u95E8,"],[data-utags_list_node*=",\u6536\u85CF,"],[data-utags_list_node*=",\u5173\u6CE8,"]{background-image:linear-gradient(to right, #ffffff, #fef2f2) !important}[data-utags_list_node]:hover{opacity:100% !important}'
  function createTag(tagName) {
    const a = createElement("a")
    a.textContent = tagName
    a.dataset.utags_tag = tagName
    a.setAttribute("href", "https://utags.pipecraft.net/tags/#" + tagName)
    a.setAttribute("target", "_blank")
    a.setAttribute("class", "utags_text_tag")
    return a
  }
  var site = {
    getListNodes() {
      const patterns = [".box .cell"]
      return $$(patterns.join(","))
    },
    getConditionNodes() {
      const patterns = [
        ".box .cell .topic-link",
        ".item_hot_topic_title a",
        '.box .cell .topic_info strong:first-of-type a[href*="/member/"]',
        ".box .cell .topic_info .node",
        '#Main strong a.dark[href*="/member/"]',
      ]
      return $$(patterns.join(","))
    },
    matchedNodes() {
      const patterns = [
        'a[href*="/t/"]',
        'a[href*="/member/"]',
        'a[href*="/go/"]',
        '.topic_info a[href*="/member/"]',
        "a.topic-link",
        ".box .cell .topic_info .node",
        ".item_hot_topic_title a",
        '#Main strong a.dark[href*="/member/"]',
        '.topic_content a[href*="/member/"]',
        '.topic_content a[href*="/t/"]',
        '.reply_content a[href*="/member/"]',
        '.reply_content a[href*="/t/"]',
        '.header small a[href*="/member/"]',
        '.header a[href*="/go/"]',
        '.dock_area a[href*="/member/"]',
        '.dock_area a[href*="/t/"]',
      ]
      const elements = $$(patterns.join(","))
      const excludePatterns = [
        ".site-nav a",
        ".cell_tabs a",
        ".tab-alt-container a",
        "#SecondaryTabs a",
        "a.page_normal,a.page_current",
        "a.count_livid",
      ]
      const excludeElements = new Set($$(excludePatterns.join(",")))
      function getCanonicalUrl2(url) {
        return url
          .replace(/[?#].*/, "")
          .replace(/(\w+\.)?v2ex.com/, "www.v2ex.com")
      }
      const nodes = [...elements].map((element) => {
        if (excludeElements.has(element)) {
          return {}
        }
        if (element.querySelector("img")) {
          return {}
        }
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
      if (location.pathname.includes("/go/")) {
        const header = $(".cell_ops.flex-one-row input")
        if (header) {
          const key = getCanonicalUrl2(
            "https://www.v2ex.com" + location.pathname
          )
          const title = document.title.replace(/.*›\s*/, "").trim()
          const meta = { title }
          header.utags = { key, meta }
          nodes.push(header)
        }
      }
      return nodes
    },
  }
  var v2ex_default = site
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
    return [...set]
  }
  var listeners = {}
  var getValue = async (key) => {
    const value = await GM.getValue(key)
    return value && value !== "undefined" ? JSON.parse(value) : void 0
  }
  var setValue = async (key, value) => {
    if (value !== void 0) {
      const newValue = JSON.stringify(value)
      if (listeners[key]) {
        const oldValue = await GM.getValue(key)
        await GM.setValue(key, newValue)
        if (newValue !== oldValue) {
          for (const func of listeners[key]) {
            func(key, oldValue, newValue)
          }
        }
      } else {
        await GM.setValue(key, newValue)
      }
    }
  }
  var _addValueChangeListener = (key, func) => {
    listeners[key] = listeners[key] || []
    listeners[key].push(func)
    return () => {
      if (listeners[key] && listeners[key].length > 0) {
        for (let i = listeners[key].length - 1; i >= 0; i--) {
          if (listeners[key][i] === func) {
            listeners[key].splice(i, 1)
          }
        }
      }
    }
  }
  var addValueChangeListener = (key, func) => {
    if (typeof GM_addValueChangeListener !== "function") {
      console.warn("Do not support GM_addValueChangeListener!")
      return _addValueChangeListener(key, func)
    }
    const listenerId = GM_addValueChangeListener(key, func)
    return () => {
      GM_removeValueChangeListener(listenerId)
    }
  }
  var extensionVersion = "0.1.5"
  var databaseVersion = 2
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
    const urlMap = await getUrlMap()
    urlMap.meta = Object.assign({}, urlMap.meta, {
      extensionVersion,
      databaseVersion,
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
        meta: newMeta,
      }
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
          meta: newMata,
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
  var hostname = location.hostname
  var getStyle = () => {
    const style = createElement("style")
    style.id = "utags_style"
    style.textContent = content_default
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
  async function displayTags() {
    const conditionNodes = getConditionNodes(hostname)
    for (const node of conditionNodes) {
      node.dataset.utags_condition_node = ""
    }
    const nodes = matchedNodes(hostname)
    await Promise.all(
      nodes.map(async (node) => {
        if (!node.utags || !node.utags.key) {
          return
        }
        const object = await getTags(node.utags.key)
        const tags = object.tags || []
        appendTagsToPage(node, node.utags.key, tags, node.utags.meta)
      })
    )
    const listNodes = getListNodes(hostname)
    for (const node of listNodes) {
      const tags = node.querySelectorAll(
        "[data-utags_condition_node] + .utags_ul > li > .utags_text_tag[data-utags_tag]"
      )
      if (tags.length > 0) {
        node.dataset.utags_list_node =
          [...tags].reduce(
            (accumulator, tag) => accumulator + "," + tag.textContent,
            ""
          ) + ","
      } else {
        node.dataset.utags_list_node = ""
      }
    }
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
    await displayTags()
    countOfLinks = $$("a:not(.utags_text_tag)").length
    setInterval(async () => {
      const count = $$("a:not(.utags_text_tag)").length
      if (countOfLinks !== count) {
        countOfLinks = count
        await displayTags()
      }
    }, 1e3)
  }
  main()
})()
