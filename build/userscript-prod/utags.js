// ==UserScript==
// @name         UTags - Add usertags to links
// @name:zh-CN   小鱼标签 (UTags) - 为链接添加用户标签
// @namespace    http://tampermonkey.net/
// @version      0.0.2
// @description  Allow users to add tags to links.
// @description:zh-cn 此插件允许用户为网站的链接添加自定义标签。比如，可以给论坛的用户或帖子添加标签。
// @author       Pipecraft
// @license      MIT
// @match        https://*/*
// @match        http://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addValueChangeListener
// ==/UserScript==

;(function () {
  ;("use strict")

  const uniq = (arr) => [...new Set(arr)]

  const v2ex = {
    matchedNodes: function () {
      const patterns = [
        '.topic_info a[href*="/member/"]',
        "a.topic-link",
        '#Main strong a.dark[href*="/member/"]',
        '.topic_content a[href*="/member/"]',
        '.reply_content a[href*="/member/"]',
        '.header small a[href*="/member/"]',
        '.dock_area a[href*="/member/"]',
        '.dock_area a[href*="/t/"]'
      ]
      const elements = document.querySelectorAll(patterns.join(","))

      function getCanonicalUrl(url) {
        return url
          .replace(/[?#].*/, "")
          .replace(/(\w+\.)?v2ex.com/, "www.v2ex.com")
      }
      const nodes = [...elements].map((element) => {
        const key = getCanonicalUrl(element.href)
        return { element, key }
      })

      if (location.pathname.includes("/member/")) {
        const profile = document.querySelector("h1")
        if (profile) {
          const key = "https://www.v2ex.com/member/" + profile.textContent
          nodes.push({ element: profile, key })
        }
      }

      if (location.pathname.includes("/t/")) {
        const header = document.querySelector(".topic_content")
        if (header) {
          const key = getCanonicalUrl(
            "https://www.v2ex.com" + location.pathname
          )
          nodes.push({ element: header, key })
        }
      }

      return nodes
    }
  }

  function getCanonicalUrl(url) {
    return url
  }

  const STORAGE = {
    getValue: GM_getValue,
    setValue: GM_setValue,
    addValueChangeListener: GM_addValueChangeListener
  }
  const STORAGE_KEY = "plugin.utags.tags.v1"

  function initStorage() {
    STORAGE.addValueChangeListener(
      STORAGE_KEY,
      function (key, oldValue, newValue, remote) {
        console.log("[UTags] The value of tags has chenged.")
        // console.log(
        //   "The value of the '" +
        //     key +
        //     "' key has changed from '" +
        //     oldValue +
        //     "' to '" +
        //     newValue +
        //     "'"
        // );
        displayTags()
      }
    )
  }
  function getTagMap() {
    const tagJsonStr = STORAGE.getValue(STORAGE_KEY) || "{}"
    try {
      return JSON.parse(tagJsonStr)
    } catch (e) {
      console.error("Invalid JSON string.", tagJsonStr)
      return {}
    }
  }
  function getTags(key) {
    const tagMap = getTagMap()
    return tagMap[key] || []
  }

  function saveTags(key, tags) {
    const tagMap = getTagMap()
    tagMap[key] = uniq(tags.map((v) => (v ? v.trim() : v)).filter(Boolean))
    if (tagMap[key].length === 0) {
      delete tagMap[key]
    }
    STORAGE.setValue(STORAGE_KEY, JSON.stringify(tagMap))
  }

  function appendTagsToPage(element, key, tags) {
    if (
      element.nextSibling &&
      element.nextSibling.classList &&
      element.nextSibling.classList.contains("utags_ul")
    ) {
      element.nextSibling.remove()
    }
    let ul = document.createElement("ul")
    let li = document.createElement("li")
    let a = document.createElement("a")
    // a.textContent = "添加标签🏷️";
    a.textContent = "🏷️"
    a.setAttribute(
      "class",
      tags.length === 0
        ? "utags_text_tag utags_captain_tag"
        : "utags_text_tag utags_captain_tag2"
    )
    a.addEventListener("click", function () {
      let newTags = prompt(
        "[UTags] 请输入标签，用逗号分开多个标签",
        tags.join(", ")
      )
      if (newTags) {
        let newTagsArray = newTags.split(/\s*[,，]\s*/)
        console.log(newTagsArray)
        saveTags(key, newTagsArray)
      }
    })
    li.append(a)
    ul.append(li)

    for (let tag of tags) {
      li = document.createElement("li")
      a = document.createElement("a")
      a.textContent = tag
      a.setAttribute("data-tag", tag)
      a.setAttribute("href", "https://utags.pipecraft.net/tags/#" + tag)
      a.setAttribute("target", "_blank")
      a.setAttribute("class", "utags_text_tag")
      li.append(a)
      ul.append(li)
    }

    ul.setAttribute("class", "utags_ul")
    element.insertAdjacentElement("afterend", ul)
  }

  function displayTags() {
    if (location.hostname === "utags.pipecraft.net") {
      document.GM_getValue = GM_getValue
      document.GM_setValue = GM_setValue
      document.GM_addValueChangeListener = GM_addValueChangeListener
    } else {
      // Display tags for matched components on matched pages
      const nodes = v2ex.matchedNodes()
      nodes.forEach((node) => {
        const tags = getTags(node.key)
        appendTagsToPage(node.element, node.key, tags)
      })
    }
  }

  function main() {
    initStorage()
    const style0 = document.createElement("style")
    style0.id = "utags_style0"
    style0.textContent = `
.utags_ul {
  display: none;
}
  `
    document.head.append(style0)
    const style = document.createElement("link")
    style.id = "utags_style"
    style.rel = "stylesheet"
    style.type = "text/css"
    style.setAttribute("data-utags_site_domain", location.hostname)
    // style.href = "http://localhost:8081/style.css";
    style.href = "https://utags.pipecraft.net/style.css"
    document.head.append(style)

    // const style2 = document.createElement("link");
    // style2.id = "utags_style";
    // style2.rel = "stylesheet";
    // style2.type = "text/css";
    // style2.setAttribute("data-utags_site_domain", location.hostname);
    // style2.href = "https://utags.github.io/" + location.hostname + "style.css";
    // document.head.append(style2);

    displayTags()
  }

  main()
})()
