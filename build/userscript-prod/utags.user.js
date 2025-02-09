// ==UserScript==
// @name                 🏷️ UTags - Add usertags to links
// @name:zh-CN           🏷️ 小鱼标签 (UTags) - 为链接添加用户标签
// @namespace            https://utags.pipecraft.net/
// @homepageURL          https://github.com/utags/utags#readme
// @supportURL           https://github.com/utags/utags/issues
// @version              0.10.7
// @description          Allow users to add custom tags to links. Works on Greasy Fork, Hacker News, Reddit, GitHub, X(Twitter), Facebook, Threads, Instagram, Youtube, TikTok, pixiv and many sites.
// @description:zh-CN    此插件允许用户为网站的链接添加自定义标签。比如，可以给论坛的用户或帖子添加标签。支持 V2EX, Greasy Fork, GitHub, B站, 抖音, 小红书, 知乎, 掘金, 豆瓣, 吾爱破解, pixiv, LINUX DO, 小众软件, NGA 等网站。
// @icon                 data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%23ff6361' class='bi bi-tags-fill' viewBox='0 0 16 16'%3E %3Cpath d='M2 2a1 1 0 0 1 1-1h4.586a1 1 0 0 1 .707.293l7 7a1 1 0 0 1 0 1.414l-4.586 4.586a1 1 0 0 1-1.414 0l-7-7A1 1 0 0 1 2 6.586V2zm3.5 4a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z'/%3E %3Cpath d='M1.293 7.793A1 1 0 0 1 1 7.086V2a1 1 0 0 0-1 1v4.586a1 1 0 0 0 .293.707l7 7a1 1 0 0 0 1.414 0l.043-.043-7.457-7.457z'/%3E %3C/svg%3E
// @author               Pipecraft
// @license              MIT
// @match                https://x.com/*
// @match                https://twitter.com/*
// @match                https://github.com/*
// @match                https://www.reddit.com/*
// @match                https://www.instagram.com/*
// @match                https://www.threads.net/*
// @match                https://*.facebook.com/*
// @match                https://*.youtube.com/*
// @match                https://www.tiktok.com/*
// @match                https://*.bilibili.com/*
// @match                https://*.biligame.com/*
// @match                https://greasyfork.org/*
// @match                https://lobste.rs/*
// @match                https://news.ycombinator.com/*
// @match                https://*.v2ex.com/*
// @match                https://*.v2ex.co/*
// @match                https://*.zhihu.com/*
// @match                https://*.weibo.com/*
// @match                https://*.weibo.cn/*
// @match                https://*.douban.com/*
// @match                https://www.52pojie.cn/*
// @match                https://juejin.cn/*
// @match                https://mp.weixin.qq.com/*
// @match                https://www.xiaohongshu.com/*
// @match                https://sspai.com/*
// @match                https://www.douyin.com/*
// @match                https://podcasts.google.com/*
// @match                https://sleazyfork.org/*
// @match                https://tilde.news/*
// @match                https://www.journalduhacker.net/*
// @match                https://rebang.today/*
// @match                https://myanimelist.net/*
// @match                https://www.pixiv.net/*
// @match                https://linux.do/*
// @match                https://meta.appinn.net/*
// @match                https://meta.discourse.org/*
// @match                https://community.openai.com/*
// @match                https://community.cloudflare.com/*
// @match                https://bbs.nga.cn/*
// @match                https://nga.178.com/*
// @match                https://ngabbs.com/*
// @match                https://www.dlsite.com/*
// @match                https://keylol.com/*
// @match                https://kemono.su/*
// @match                https://coomer.su/*
// @match                https://nekohouse.su/*
// @match                https://rule34video.com/*
// @match                https://rule34gen.com/*
// @match                https://community.wanikani.com/*
// @match                https://panda.chaika.moe/*
// @match                https://v2hot.pipecraft.net/*
// @match                https://utags.pipecraft.net/*
// @match                https://*.pipecraft.net/*
// @run-at               document-start
// @grant                GM.getValue
// @grant                GM.setValue
// @grant                GM_addValueChangeListener
// @grant                GM_removeValueChangeListener
// @grant                GM_addElement
// @grant                GM.registerMenuCommand
// ==/UserScript==
//
;(() => {
  "use strict"
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
        for (let i3 = listeners[key].length - 1; i3 >= 0; i3--) {
          if (listeners[key][i3] === func) {
            listeners[key].splice(i3, 1)
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
  var doc = document
  var win = window
  var uniq = (array) => [...new Set(array)]
  if (typeof String.prototype.replaceAll !== "function") {
    String.prototype.replaceAll = String.prototype.replace
  }
  var $ = (selectors, element) => (element || doc).querySelector(selectors)
  var $$ = (selectors, element) => [
    ...(element || doc).querySelectorAll(selectors),
  ]
  var getRootElement = (type) =>
    type === 1
      ? doc.head || doc.body || doc.documentElement
      : type === 2
      ? doc.body || doc.documentElement
      : doc.documentElement
  var createElement = (tagName, attributes) =>
    setAttributes(doc.createElement(tagName), attributes)
  var addElement = (parentNode, tagName, attributes) => {
    if (typeof parentNode === "string") {
      return addElement(null, parentNode, tagName)
    }
    if (!tagName) {
      return
    }
    if (!parentNode) {
      parentNode = /^(script|link|style|meta)$/.test(tagName)
        ? getRootElement(1)
        : getRootElement(2)
    }
    if (typeof tagName === "string") {
      const element = createElement(tagName, attributes)
      parentNode.append(element)
      return element
    }
    setAttributes(tagName, attributes)
    parentNode.append(tagName)
    return tagName
  }
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
  var removeEventListener = (element, type, listener, options) => {
    if (!element) {
      return
    }
    if (typeof type === "object") {
      for (const type1 in type) {
        if (Object.hasOwn(type, type1)) {
          element.removeEventListener(type1, type[type1])
        }
      }
    } else if (typeof type === "string" && typeof listener === "function") {
      element.removeEventListener(type, listener, options)
    }
  }
  var getAttribute = (element, name) =>
    element && element.getAttribute ? element.getAttribute(name) : null
  var setAttribute = (element, name, value) =>
    element && element.setAttribute ? element.setAttribute(name, value) : void 0
  var setAttributes = (element, attributes) => {
    if (element && attributes) {
      for (const name in attributes) {
        if (Object.hasOwn(attributes, name)) {
          const value = attributes[name]
          if (value === void 0) {
            continue
          }
          if (/^(value|textContent|innerText)$/.test(name)) {
            element[name] = value
          } else if (/^(innerHTML)$/.test(name)) {
            element[name] = createHTML(value)
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
  var addClass = (element, className) => {
    if (!element || !element.classList) {
      return
    }
    element.classList.add(className)
  }
  var removeClass = (element, className) => {
    if (!element || !element.classList) {
      return
    }
    element.classList.remove(className)
  }
  var hasClass = (element, className) => {
    if (!element || !element.classList) {
      return false
    }
    return element.classList.contains(className)
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
  var throttle = (func, interval) => {
    let timeoutId = null
    let next = false
    const handler = (...args) => {
      if (timeoutId) {
        next = true
      } else {
        func.apply(void 0, args)
        timeoutId = setTimeout(() => {
          timeoutId = null
          if (next) {
            next = false
            handler()
          }
        }, interval)
      }
    }
    return handler
  }
  if (typeof Object.hasOwn !== "function") {
    Object.hasOwn = (instance, prop) =>
      Object.prototype.hasOwnProperty.call(instance, prop)
  }
  var extendHistoryApi = () => {
    const pushState = history.pushState
    const replaceState = history.replaceState
    history.pushState = function () {
      pushState.apply(history, arguments)
      window.dispatchEvent(new Event("pushstate"))
      window.dispatchEvent(new Event("locationchange"))
    }
    history.replaceState = function () {
      replaceState.apply(history, arguments)
      window.dispatchEvent(new Event("replacestate"))
      window.dispatchEvent(new Event("locationchange"))
    }
    window.addEventListener("popstate", function () {
      window.dispatchEvent(new Event("locationchange"))
    })
  }
  var getOffsetPosition = (element, referElement) => {
    const position = { top: 0, left: 0 }
    referElement = referElement || doc.body
    while (element && element !== referElement) {
      position.top += element.offsetTop
      position.left += element.offsetLeft
      element = element.offsetParent
    }
    return position
  }
  var parseInt10 = (number, defaultValue) => {
    if (typeof number === "number" && !Number.isNaN(number)) {
      return number
    }
    if (typeof defaultValue !== "number") {
      defaultValue = Number.NaN
    }
    if (!number) {
      return defaultValue
    }
    const result = Number.parseInt(number, 10)
    return Number.isNaN(result) ? defaultValue : result
  }
  var rootFuncArray = []
  var headFuncArray = []
  var bodyFuncArray = []
  var headBodyObserver
  var startObserveHeadBodyExists = () => {
    if (headBodyObserver) {
      return
    }
    headBodyObserver = new MutationObserver(() => {
      if (doc.head && doc.body) {
        headBodyObserver.disconnect()
      }
      if (doc.documentElement && rootFuncArray.length > 0) {
        for (const func of rootFuncArray) {
          func()
        }
        rootFuncArray.length = 0
      }
      if (doc.head && headFuncArray.length > 0) {
        for (const func of headFuncArray) {
          func()
        }
        headFuncArray.length = 0
      }
      if (doc.body && bodyFuncArray.length > 0) {
        for (const func of bodyFuncArray) {
          func()
        }
        bodyFuncArray.length = 0
      }
    })
    headBodyObserver.observe(doc, {
      childList: true,
      subtree: true,
    })
  }
  var runWhenHeadExists = (func) => {
    if (!doc.head) {
      headFuncArray.push(func)
      startObserveHeadBodyExists()
      return
    }
    func()
  }
  var runWhenDomReady = (func) => {
    if (doc.readyState === "interactive" || doc.readyState === "complete") {
      return func()
    }
    const handler = () => {
      if (doc.readyState === "interactive" || doc.readyState === "complete") {
        func()
        removeEventListener(doc, "readystatechange", handler)
      }
    }
    addEventListener(doc, "readystatechange", handler)
  }
  var isVisible = (element) => {
    if (typeof element.checkVisibility === "function") {
      return element.checkVisibility()
    }
    return element.offsetParent !== null
  }
  var isTouchScreen = () => "ontouchstart" in win
  var escapeHTMLPolicy =
    typeof trustedTypes !== "undefined" &&
    typeof trustedTypes.createPolicy === "function"
      ? trustedTypes.createPolicy("beuEscapePolicy", {
          createHTML: (string) => string,
        })
      : void 0
  var createHTML = (html) => {
    return escapeHTMLPolicy ? escapeHTMLPolicy.createHTML(html) : html
  }
  var addElement2 =
    typeof GM_addElement === "function"
      ? (parentNode, tagName, attributes) => {
          if (typeof parentNode === "string") {
            return addElement2(null, parentNode, tagName)
          }
          if (!tagName) {
            return
          }
          if (!parentNode) {
            parentNode = /^(script|link|style|meta)$/.test(tagName)
              ? getRootElement(1)
              : getRootElement(2)
          }
          if (typeof tagName === "string") {
            let attributes2
            if (attributes) {
              const entries1 = []
              const entries2 = []
              for (const entry of Object.entries(attributes)) {
                if (/^(on\w+|innerHTML)$/.test(entry[0])) {
                  entries2.push(entry)
                } else {
                  entries1.push(entry)
                }
              }
              attributes = Object.fromEntries(entries1)
              attributes2 = Object.fromEntries(entries2)
            }
            const element = GM_addElement(null, tagName, attributes)
            setAttributes(element, attributes2)
            parentNode.append(element)
            return element
          }
          setAttributes(tagName, attributes)
          parentNode.append(tagName)
          return tagName
        }
      : addElement
  var addStyle = (styleText) =>
    addElement2(null, "style", { textContent: styleText })
  var registerMenuCommand = (name, callback, accessKey) => {
    if (window !== top) {
      return
    }
    if (typeof GM.registerMenuCommand !== "function") {
      console.warn("Do not support GM.registerMenuCommand!")
      return
    }
    GM.registerMenuCommand(name, callback, accessKey)
  }
  var style_default =
    '#browser_extension_settings_container{--browser-extension-settings-background-color: #f2f2f7;--browser-extension-settings-text-color: #444444;--browser-extension-settings-link-color: #217dfc;--sb-track-color: #00000000;--sb-thumb-color: #33334480;--sb-size: 2px;--font-family: "helvetica neue", "microsoft yahei", arial, sans-serif;position:fixed;top:10px;right:30px;max-height:90%;height:600px;overflow:hidden;display:none;z-index:100000;border-radius:5px;-webkit-box-shadow:0px 10px 39px 10px rgba(62,66,66,.22);-moz-box-shadow:0px 10px 39px 10px rgba(62,66,66,.22);box-shadow:0px 10px 39px 10px rgba(62,66,66,.22) !important}#browser_extension_settings_container .browser_extension_settings_wrapper{display:flex;height:100%;overflow:hidden;background-color:var(--browser-extension-settings-background-color);font-family:var(--font-family)}#browser_extension_settings_container .browser_extension_settings_wrapper h1,#browser_extension_settings_container .browser_extension_settings_wrapper h2{border:none;color:var(--browser-extension-settings-text-color);padding:0;font-family:var(--font-family);line-height:normal;letter-spacing:normal}#browser_extension_settings_container .browser_extension_settings_wrapper h1{font-size:26px;font-weight:800;margin:18px 0}#browser_extension_settings_container .browser_extension_settings_wrapper h2{font-size:18px;font-weight:600;margin:14px 0}#browser_extension_settings_container .browser_extension_settings_wrapper footer{display:flex;justify-content:center;flex-direction:column;font-size:11px;margin:10px auto 0px;background-color:var(--browser-extension-settings-background-color);color:var(--browser-extension-settings-text-color);font-family:var(--font-family)}#browser_extension_settings_container .browser_extension_settings_wrapper footer a{color:var(--browser-extension-settings-link-color) !important;font-family:var(--font-family);text-decoration:none;padding:0}#browser_extension_settings_container .browser_extension_settings_wrapper footer p{text-align:center;padding:0;margin:2px;line-height:13px;font-size:11px;color:var(--browser-extension-settings-text-color);font-family:var(--font-family)}#browser_extension_settings_container .browser_extension_settings_wrapper a.navigation_go_previous{color:var(--browser-extension-settings-link-color);cursor:pointer;display:none}#browser_extension_settings_container .browser_extension_settings_wrapper a.navigation_go_previous::before{content:"< "}#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container{overflow-x:auto;box-sizing:border-box;padding:10px 15px;background-color:var(--browser-extension-settings-background-color);color:var(--browser-extension-settings-text-color)}#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .installed_extension_list div,#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .related_extension_list div{background-color:#fff;font-size:14px;border-top:1px solid #ccc;padding:6px 15px 6px 15px}#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .installed_extension_list div a,#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .installed_extension_list div a:visited,#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .related_extension_list div a,#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .related_extension_list div a:visited{display:flex;justify-content:space-between;align-items:center;cursor:pointer;text-decoration:none;color:var(--browser-extension-settings-text-color);font-family:var(--font-family)}#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .installed_extension_list div a:hover,#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .installed_extension_list div a:visited:hover,#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .related_extension_list div a:hover,#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .related_extension_list div a:visited:hover{text-decoration:none;color:var(--browser-extension-settings-text-color)}#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .installed_extension_list div a span,#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .installed_extension_list div a:visited span,#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .related_extension_list div a span,#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .related_extension_list div a:visited span{margin-right:10px;line-height:24px;font-family:var(--font-family)}#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .installed_extension_list div.active,#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .installed_extension_list div:hover,#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .related_extension_list div.active,#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .related_extension_list div:hover{background-color:#e4e4e6}#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .installed_extension_list div.active a,#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .related_extension_list div.active a{cursor:default}#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .installed_extension_list div:first-of-type,#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .related_extension_list div:first-of-type{border-top:none;border-top-right-radius:10px;border-top-left-radius:10px}#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .installed_extension_list div:last-of-type,#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .related_extension_list div:last-of-type{border-bottom-right-radius:10px;border-bottom-left-radius:10px}#browser_extension_settings_container .thin_scrollbar{scrollbar-color:var(--sb-thumb-color) var(--sb-track-color);scrollbar-width:thin}#browser_extension_settings_container .thin_scrollbar::-webkit-scrollbar{width:var(--sb-size)}#browser_extension_settings_container .thin_scrollbar::-webkit-scrollbar-track{background:var(--sb-track-color);border-radius:10px}#browser_extension_settings_container .thin_scrollbar::-webkit-scrollbar-thumb{background:var(--sb-thumb-color);border-radius:10px}#browser_extension_settings_main{min-width:250px;overflow-y:auto;overflow-x:hidden;box-sizing:border-box;padding:10px 15px;background-color:var(--browser-extension-settings-background-color);color:var(--browser-extension-settings-text-color);font-family:var(--font-family)}#browser_extension_settings_main h2{text-align:center;margin:5px 0 0}#browser_extension_settings_main .option_groups{background-color:#fff;padding:6px 15px 6px 15px;border-radius:10px;display:flex;flex-direction:column;margin:10px 0 0}#browser_extension_settings_main .option_groups .action{font-size:14px;padding:6px 0 6px 0;color:var(--browser-extension-settings-link-color);cursor:pointer}#browser_extension_settings_main .bes_external_link{font-size:14px;padding:6px 0 6px 0}#browser_extension_settings_main .bes_external_link a,#browser_extension_settings_main .bes_external_link a:visited,#browser_extension_settings_main .bes_external_link a:hover{color:var(--browser-extension-settings-link-color);font-family:var(--font-family);text-decoration:none;cursor:pointer}#browser_extension_settings_main .option_groups textarea{font-size:12px;margin:10px 0 10px 0;height:100px;width:100%;border:1px solid #a9a9a9;border-radius:4px;box-sizing:border-box}#browser_extension_settings_main .switch_option,#browser_extension_settings_main .select_option{display:flex;justify-content:space-between;align-items:center;padding:6px 0 6px 0;font-size:14px}#browser_extension_settings_main .option_groups>*{border-top:1px solid #ccc}#browser_extension_settings_main .option_groups>*:first-child{border-top:none}#browser_extension_settings_main .bes_option>.bes_icon{width:24px;height:24px;margin-right:10px}#browser_extension_settings_main .bes_option>.bes_title{margin-right:10px;flex-grow:1}#browser_extension_settings_main .bes_option>.bes_select{box-sizing:border-box;background-color:#fff;height:24px;padding:0 2px 0 2px;margin:0;border-radius:6px;border:1px solid #ccc}#browser_extension_settings_main .option_groups .bes_tip{position:relative;margin:0;padding:0 15px 0 0;border:none;max-width:none;font-size:14px}#browser_extension_settings_main .option_groups .bes_tip .bes_tip_anchor{cursor:help;text-decoration:underline}#browser_extension_settings_main .option_groups .bes_tip .bes_tip_content{position:absolute;bottom:15px;left:0;background-color:#fff;color:var(--browser-extension-settings-text-color);text-align:left;padding:10px;display:none;border-radius:5px;-webkit-box-shadow:0px 10px 39px 10px rgba(62,66,66,.22);-moz-box-shadow:0px 10px 39px 10px rgba(62,66,66,.22);box-shadow:0px 10px 39px 10px rgba(62,66,66,.22) !important}#browser_extension_settings_main .option_groups .bes_tip .bes_tip_anchor:hover+.bes_tip_content,#browser_extension_settings_main .option_groups .bes_tip .bes_tip_content:hover{display:block}#browser_extension_settings_main .option_groups .bes_tip p,#browser_extension_settings_main .option_groups .bes_tip pre{margin:revert;padding:revert}#browser_extension_settings_main .option_groups .bes_tip pre{font-family:Consolas,panic sans,bitstream vera sans mono,Menlo,microsoft yahei,monospace;font-size:13px;letter-spacing:.015em;line-height:120%;white-space:pre;overflow:auto;background-color:#f5f5f5;word-break:normal;overflow-wrap:normal;padding:.5em;border:none}#browser_extension_settings_main .bes_switch_container{--button-width: 51px;--button-height: 24px;--toggle-diameter: 20px;--color-off: #e9e9eb;--color-on: #34c759;width:var(--button-width);height:var(--button-height);position:relative;padding:0;margin:0;flex:none;user-select:none}#browser_extension_settings_main input[type=checkbox]{opacity:0;width:0;height:0;position:absolute}#browser_extension_settings_main .bes_switch{width:100%;height:100%;display:block;background-color:var(--color-off);border-radius:calc(var(--button-height)/2);border:none;cursor:pointer;transition:all .2s ease-out}#browser_extension_settings_main .bes_switch::before{display:none}#browser_extension_settings_main .bes_slider{width:var(--toggle-diameter);height:var(--toggle-diameter);position:absolute;left:2px;top:calc(50% - var(--toggle-diameter)/2);border-radius:50%;background:#fff;box-shadow:0px 3px 8px rgba(0,0,0,.15),0px 3px 1px rgba(0,0,0,.06);transition:all .2s ease-out;cursor:pointer}#browser_extension_settings_main input[type=checkbox]:checked+.bes_switch{background-color:var(--color-on)}#browser_extension_settings_main input[type=checkbox]:checked+.bes_switch .bes_slider{left:calc(var(--button-width) - var(--toggle-diameter) - 2px)}#browser_extension_side_menu{min-height:80px;width:30px;opacity:0;position:fixed;top:80px;right:0;padding-top:20px;z-index:10000}#browser_extension_side_menu:hover{opacity:1}#browser_extension_side_menu button{cursor:pointer;width:24px;height:24px;padding:0;border:none;background-color:rgba(0,0,0,0);background-image:none}#browser_extension_side_menu button svg{width:24px;height:24px}#browser_extension_side_menu button:hover{opacity:70%}#browser_extension_side_menu button:active{opacity:100%}@media(max-width: 500px){#browser_extension_settings_container{right:10px}#browser_extension_settings_container .browser_extension_settings_wrapper a.navigation_go_previous{display:block}#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container{display:none}#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container.bes_active{display:block}#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container.bes_active+div{display:none}}'
  function createSwitch(options = {}) {
    const container = createElement("label", { class: "bes_switch_container" })
    const checkbox = createElement(
      "input",
      options.checked ? { type: "checkbox", checked: "" } : { type: "checkbox" }
    )
    addElement2(container, checkbox)
    const switchElm = createElement("span", { class: "bes_switch" })
    addElement2(switchElm, "span", { class: "bes_slider" })
    addElement2(container, switchElm)
    if (options.onchange) {
      addEventListener(checkbox, "change", options.onchange)
    }
    return container
  }
  function createSwitchOption(icon, text, options) {
    if (typeof text !== "string") {
      return createSwitchOption(void 0, icon, text)
    }
    const div = createElement("div", { class: "switch_option bes_option" })
    if (icon) {
      addElement2(div, "img", { src: icon, class: "bes_icon" })
    }
    addElement2(div, "span", { textContent: text, class: "bes_title" })
    div.append(createSwitch(options))
    return div
  }
  var besVersion = 55
  var openButton =
    '<svg viewBox="0 0 60.2601318359375 84.8134765625" version="1.1" xmlns="http://www.w3.org/2000/svg" class=" glyph-box" style="height: 9.62969px; width: 6.84191px;"><g transform="matrix(1 0 0 1 -6.194965820312518 77.63671875)"><path d="M66.4551-35.2539C66.4551-36.4746 65.9668-37.5977 65.0391-38.4766L26.3672-76.3672C25.4883-77.1973 24.4141-77.6367 23.1445-77.6367C20.6543-77.6367 18.7012-75.7324 18.7012-73.1934C18.7012-71.9727 19.1895-70.8496 19.9707-70.0195L55.5176-35.2539L19.9707-0.488281C19.1895 0.341797 18.7012 1.41602 18.7012 2.68555C18.7012 5.22461 20.6543 7.12891 23.1445 7.12891C24.4141 7.12891 25.4883 6.68945 26.3672 5.81055L65.0391-32.0312C65.9668-32.959 66.4551-34.0332 66.4551-35.2539Z"></path></g></svg>'
  var openInNewTabButton =
    '<svg viewBox="0 0 72.127685546875 72.2177734375" version="1.1" xmlns="http://www.w3.org/2000/svg" class=" glyph-box" style="height: 8.19958px; width: 8.18935px;"><g transform="matrix(1 0 0 1 -12.451127929687573 71.3388671875)"><path d="M84.5703-17.334L84.5215-66.4551C84.5215-69.2383 82.7148-71.1914 79.7852-71.1914L30.6641-71.1914C27.9297-71.1914 26.0742-69.0918 26.0742-66.748C26.0742-64.4043 28.1738-62.4023 30.4688-62.4023L47.4609-62.4023L71.2891-63.1836L62.207-55.2246L13.8184-6.73828C12.9395-5.85938 12.4512-4.73633 12.4512-3.66211C12.4512-1.31836 14.5508 0.878906 16.9922 0.878906C18.1152 0.878906 19.1895 0.488281 20.0684-0.439453L68.5547-48.877L76.6113-58.0078L75.7324-35.2051L75.7324-17.1387C75.7324-14.8438 77.7344-12.6953 80.127-12.6953C82.4707-12.6953 84.5703-14.6973 84.5703-17.334Z"></path></g></svg>'
  var settingButton =
    '<svg viewBox="0 0 16 16" version="1.1">\n<path d="M8 0a8.2 8.2 0 0 1 .701.031C9.444.095 9.99.645 10.16 1.29l.288 1.107c.018.066.079.158.212.224.231.114.454.243.668.386.123.082.233.09.299.071l1.103-.303c.644-.176 1.392.021 1.82.63.27.385.506.792.704 1.218.315.675.111 1.422-.364 1.891l-.814.806c-.049.048-.098.147-.088.294.016.257.016.515 0 .772-.01.147.038.246.088.294l.814.806c.475.469.679 1.216.364 1.891a7.977 7.977 0 0 1-.704 1.217c-.428.61-1.176.807-1.82.63l-1.102-.302c-.067-.019-.177-.011-.3.071a5.909 5.909 0 0 1-.668.386c-.133.066-.194.158-.211.224l-.29 1.106c-.168.646-.715 1.196-1.458 1.26a8.006 8.006 0 0 1-1.402 0c-.743-.064-1.289-.614-1.458-1.26l-.289-1.106c-.018-.066-.079-.158-.212-.224a5.738 5.738 0 0 1-.668-.386c-.123-.082-.233-.09-.299-.071l-1.103.303c-.644.176-1.392-.021-1.82-.63a8.12 8.12 0 0 1-.704-1.218c-.315-.675-.111-1.422.363-1.891l.815-.806c.05-.048.098-.147.088-.294a6.214 6.214 0 0 1 0-.772c.01-.147-.038-.246-.088-.294l-.815-.806C.635 6.045.431 5.298.746 4.623a7.92 7.92 0 0 1 .704-1.217c.428-.61 1.176-.807 1.82-.63l1.102.302c.067.019.177.011.3-.071.214-.143.437-.272.668-.386.133-.066.194-.158.211-.224l.29-1.106C6.009.645 6.556.095 7.299.03 7.53.01 7.764 0 8 0Zm-.571 1.525c-.036.003-.108.036-.137.146l-.289 1.105c-.147.561-.549.967-.998 1.189-.173.086-.34.183-.5.29-.417.278-.97.423-1.529.27l-1.103-.303c-.109-.03-.175.016-.195.045-.22.312-.412.644-.573.99-.014.031-.021.11.059.19l.815.806c.411.406.562.957.53 1.456a4.709 4.709 0 0 0 0 .582c.032.499-.119 1.05-.53 1.456l-.815.806c-.081.08-.073.159-.059.19.162.346.353.677.573.989.02.03.085.076.195.046l1.102-.303c.56-.153 1.113-.008 1.53.27.161.107.328.204.501.29.447.222.85.629.997 1.189l.289 1.105c.029.109.101.143.137.146a6.6 6.6 0 0 0 1.142 0c.036-.003.108-.036.137-.146l.289-1.105c.147-.561.549-.967.998-1.189.173-.086.34-.183.5-.29.417-.278.97-.423 1.529-.27l1.103.303c.109.029.175-.016.195-.045.22-.313.411-.644.573-.99.014-.031.021-.11-.059-.19l-.815-.806c-.411-.406-.562-.957-.53-1.456a4.709 4.709 0 0 0 0-.582c-.032-.499.119-1.05.53-1.456l.815-.806c.081-.08.073-.159.059-.19a6.464 6.464 0 0 0-.573-.989c-.02-.03-.085-.076-.195-.046l-1.102.303c-.56.153-1.113.008-1.53-.27a4.44 4.44 0 0 0-.501-.29c-.447-.222-.85-.629-.997-1.189l-.289-1.105c-.029-.11-.101-.143-.137-.146a6.6 6.6 0 0 0-1.142 0ZM11 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM9.5 8a1.5 1.5 0 1 0-3.001.001A1.5 1.5 0 0 0 9.5 8Z"></path>\n</svg>'
  function initI18n(messageMaps, language) {
    language = (language || navigator.language).toLowerCase()
    const language2 = language.slice(0, 2)
    let messagesDefault
    let messagesLocal
    for (const entry of Object.entries(messageMaps)) {
      const langs = new Set(
        entry[0]
          .toLowerCase()
          .split(",")
          .map((v) => v.trim())
      )
      const value = entry[1]
      if (langs.has(language)) {
        messagesLocal = value
      }
      if (langs.has(language2) && !messagesLocal) {
        messagesLocal = value
      }
      if (langs.has("en")) {
        messagesDefault = value
      }
      if (langs.has("en-us") && !messagesDefault) {
        messagesDefault = value
      }
    }
    if (!messagesLocal) {
      messagesLocal = {}
    }
    if (!messagesDefault || messagesDefault === messagesLocal) {
      messagesDefault = {}
    }
    return function (key, ...parameters) {
      let text = messagesLocal[key] || messagesDefault[key] || key
      if (parameters && parameters.length > 0 && text !== key) {
        for (let i3 = 0; i3 < parameters.length; i3++) {
          text = text.replaceAll(
            new RegExp("\\{".concat(i3 + 1, "\\}"), "g"),
            String(parameters[i3])
          )
        }
      }
      return text
    }
  }
  var messages = {
    "settings.title": "Settings",
    "settings.otherExtensions": "Other Extensions",
    "settings.displaySettingsButtonInSideMenu":
      "Display Settings Button in Side Menu",
    "settings.menu.settings": "\u2699\uFE0F Settings",
    "settings.extensions.utags.title":
      "\u{1F3F7}\uFE0F UTags - Add usertags to links",
    "settings.extensions.links-helper.title": "\u{1F517} Links Helper",
    "settings.extensions.v2ex.rep.title":
      "V2EX.REP - \u4E13\u6CE8\u63D0\u5347 V2EX \u4E3B\u9898\u56DE\u590D\u6D4F\u89C8\u4F53\u9A8C",
    "settings.extensions.v2ex.min.title":
      "v2ex.min - V2EX Minimalist (\u6781\u7B80\u98CE\u683C)",
    "settings.extensions.replace-ugly-avatars.title": "Replace Ugly Avatars",
    "settings.extensions.more-by-pipecraft.title":
      "Find more useful userscripts",
  }
  var en_default = messages
  var messages2 = {
    "settings.title": "\u8BBE\u7F6E",
    "settings.otherExtensions": "\u5176\u4ED6\u6269\u5C55",
    "settings.displaySettingsButtonInSideMenu":
      "\u5728\u4FA7\u8FB9\u680F\u83DC\u5355\u4E2D\u663E\u793A\u8BBE\u7F6E\u6309\u94AE",
    "settings.menu.settings": "\u2699\uFE0F \u8BBE\u7F6E",
    "settings.extensions.utags.title":
      "\u{1F3F7}\uFE0F \u5C0F\u9C7C\u6807\u7B7E (UTags) - \u4E3A\u94FE\u63A5\u6DFB\u52A0\u7528\u6237\u6807\u7B7E",
    "settings.extensions.links-helper.title":
      "\u{1F517} \u94FE\u63A5\u52A9\u624B",
    "settings.extensions.v2ex.rep.title":
      "V2EX.REP - \u4E13\u6CE8\u63D0\u5347 V2EX \u4E3B\u9898\u56DE\u590D\u6D4F\u89C8\u4F53\u9A8C",
    "settings.extensions.v2ex.min.title":
      "v2ex.min - V2EX \u6781\u7B80\u98CE\u683C",
    "settings.extensions.replace-ugly-avatars.title":
      "\u8D50\u4F60\u4E2A\u5934\u50CF\u5427",
    "settings.extensions.more-by-pipecraft.title":
      "\u66F4\u591A\u6709\u8DA3\u7684\u811A\u672C",
  }
  var zh_cn_default = messages2
  var i = initI18n({
    "en,en-US": en_default,
    "zh,zh-CN": zh_cn_default,
  })
  var lang = navigator.language
  var locale
  if (lang === "zh-TW" || lang === "zh-HK") {
    locale = "zh-TW"
  } else if (lang.includes("zh")) {
    locale = "zh-CN"
  } else {
    locale = "en"
  }
  var relatedExtensions = [
    {
      id: "utags",
      title: i("settings.extensions.utags.title"),
      url: "https://greasyfork.org/".concat(
        locale,
        "/scripts/460718-utags-add-usertags-to-links"
      ),
    },
    {
      id: "links-helper",
      title: i("settings.extensions.links-helper.title"),
      description:
        "\u5728\u65B0\u6807\u7B7E\u9875\u4E2D\u6253\u5F00\u7B2C\u4E09\u65B9\u7F51\u7AD9\u94FE\u63A5\uFF0C\u56FE\u7247\u94FE\u63A5\u8F6C\u56FE\u7247\u6807\u7B7E\u7B49",
      url: "https://greasyfork.org/".concat(
        locale,
        "/scripts/464541-links-helper"
      ),
    },
    {
      id: "v2ex.rep",
      title: i("settings.extensions.v2ex.rep.title"),
      url: "https://greasyfork.org/".concat(
        locale,
        "/scripts/466589-v2ex-rep-%E4%B8%93%E6%B3%A8%E6%8F%90%E5%8D%87-v2ex-%E4%B8%BB%E9%A2%98%E5%9B%9E%E5%A4%8D%E6%B5%8F%E8%A7%88%E4%BD%93%E9%AA%8C"
      ),
    },
    {
      id: "v2ex.min",
      title: i("settings.extensions.v2ex.min.title"),
      url: "https://greasyfork.org/".concat(
        locale,
        "/scripts/463552-v2ex-min-v2ex-%E6%9E%81%E7%AE%80%E9%A3%8E%E6%A0%BC"
      ),
    },
    {
      id: "replace-ugly-avatars",
      title: i("settings.extensions.replace-ugly-avatars.title"),
      url: "https://greasyfork.org/".concat(
        locale,
        "/scripts/472616-replace-ugly-avatars"
      ),
    },
    {
      id: "more-by-pipecraft",
      title: i("settings.extensions.more-by-pipecraft.title"),
      url: "https://greasyfork.org/".concat(locale, "/users/1030884-pipecraft"),
    },
  ]
  var getInstalledExtesionList = () => {
    return $(".extension_list_container .installed_extension_list")
  }
  var getRelatedExtesionList = () => {
    return $(".extension_list_container .related_extension_list")
  }
  var isInstalledExtension = (id) => {
    const list = getInstalledExtesionList()
    if (!list) {
      return false
    }
    const installed = $('[data-extension-id="'.concat(id, '"]'), list)
    return Boolean(installed)
  }
  var addCurrentExtension = (extension) => {
    const list = getInstalledExtesionList()
    if (!list) {
      return
    }
    if (isInstalledExtension(extension.id)) {
      return
    }
    const element = createInstalledExtension(extension)
    list.append(element)
    const list2 = getRelatedExtesionList()
    if (list2) {
      updateRelatedExtensions(list2)
    }
  }
  var activeExtension = (id) => {
    const list = getInstalledExtesionList()
    if (!list) {
      return false
    }
    for (const element of $$(".active", list)) {
      removeClass(element, "active")
    }
    const installed = $('[data-extension-id="'.concat(id, '"]'), list)
    if (installed) {
      addClass(installed, "active")
    }
  }
  var activeExtensionList = () => {
    const extensionListContainer = $(".extension_list_container")
    if (extensionListContainer) {
      addClass(extensionListContainer, "bes_active")
    }
  }
  var deactiveExtensionList = () => {
    const extensionListContainer = $(".extension_list_container")
    if (extensionListContainer) {
      removeClass(extensionListContainer, "bes_active")
    }
  }
  var createInstalledExtension = (installedExtension) => {
    const div = createElement("div", {
      class: "installed_extension",
      "data-extension-id": installedExtension.id,
    })
    const a = addElement2(div, "a", {
      onclick: installedExtension.onclick,
    })
    addElement2(a, "span", {
      textContent: installedExtension.title,
    })
    const svg = addElement2(a, "svg")
    svg.outerHTML = createHTML(openButton)
    return div
  }
  var updateRelatedExtensions = (container) => {
    const relatedExtensionElements = $$("[data-extension-id]", container)
    if (relatedExtensionElements.length > 0) {
      for (const relatedExtensionElement of relatedExtensionElements) {
        if (
          isInstalledExtension(
            relatedExtensionElement.dataset.extensionId || "noid"
          )
        ) {
          relatedExtensionElement.remove()
        }
      }
    } else {
      container.innerHTML = createHTML("")
    }
    for (const relatedExtension of relatedExtensions) {
      if (
        isInstalledExtension(relatedExtension.id) ||
        $('[data-extension-id="'.concat(relatedExtension.id, '"]'), container)
      ) {
        continue
      }
      if ($$("[data-extension-id]", container).length >= 4) {
        return
      }
      const div4 = addElement2(container, "div", {
        class: "related_extension",
        "data-extension-id": relatedExtension.id,
      })
      const a = addElement2(div4, "a", {
        href: relatedExtension.url,
        target: "_blank",
      })
      addElement2(a, "span", {
        textContent: relatedExtension.title,
      })
      const svg = addElement2(a, "svg")
      svg.outerHTML = createHTML(openInNewTabButton)
    }
  }
  function createExtensionList(installedExtensions) {
    const div = createElement("div", {
      class: "extension_list_container thin_scrollbar",
    })
    addElement2(div, "h1", { textContent: i("settings.title") })
    const div2 = addElement2(div, "div", {
      class: "installed_extension_list",
    })
    for (const installedExtension of installedExtensions) {
      if (isInstalledExtension(installedExtension.id)) {
        continue
      }
      const element = createInstalledExtension(installedExtension)
      div2.append(element)
    }
    addElement2(div, "h2", { textContent: i("settings.otherExtensions") })
    const div3 = addElement2(div, "div", {
      class: "related_extension_list",
    })
    updateRelatedExtensions(div3)
    return div
  }
  var prefix = "browser_extension_settings_"
  var randomId = String(Math.round(Math.random() * 1e4))
  var settingsContainerId = prefix + "container_" + randomId
  var settingsElementId = prefix + "main_" + randomId
  var getSettingsElement = () => $("#" + settingsElementId)
  var getSettingsStyle = () =>
    style_default
      .replaceAll(/browser_extension_settings_container/gm, settingsContainerId)
      .replaceAll(/browser_extension_settings_main/gm, settingsElementId)
  var storageKey = "settings"
  var settingsOptions
  var settingsTable = {}
  var settings = {}
  async function getSettings() {
    var _a
    return (_a = await getValue(storageKey)) != null ? _a : {}
  }
  async function saveSettingsValue(key, value) {
    const settings2 = await getSettings()
    settings2[key] =
      settingsTable[key] && settingsTable[key].defaultValue === value
        ? void 0
        : value
    await setValue(storageKey, settings2)
  }
  function getSettingsValue(key) {
    var _a
    return Object.hasOwn(settings, key)
      ? settings[key]
      : (_a = settingsTable[key]) == null
      ? void 0
      : _a.defaultValue
  }
  var closeModal = () => {
    const settingsContainer = getSettingsContainer()
    if (settingsContainer) {
      settingsContainer.style.display = "none"
    }
    removeEventListener(document, "click", onDocumentClick, true)
    removeEventListener(document, "keydown", onDocumentKeyDown, true)
  }
  var onDocumentClick = (event) => {
    const target = event.target
    if (
      target == null ? void 0 : target.closest(".".concat(prefix, "container"))
    ) {
      return
    }
    closeModal()
  }
  var onDocumentKeyDown = (event) => {
    if (event.defaultPrevented) {
      return
    }
    if (event.key === "Escape") {
      closeModal()
      event.preventDefault()
    }
  }
  async function updateOptions() {
    if (!getSettingsElement()) {
      return
    }
    for (const key in settingsTable) {
      if (Object.hasOwn(settingsTable, key)) {
        const item = settingsTable[key]
        const type = item.type || "switch"
        switch (type) {
          case "switch": {
            const checkbox = $(
              "#"
                .concat(
                  settingsElementId,
                  ' .option_groups .switch_option[data-key="'
                )
                .concat(key, '"] input')
            )
            if (checkbox) {
              checkbox.checked = getSettingsValue(key)
            }
            break
          }
          case "select": {
            const options = $$(
              "#"
                .concat(
                  settingsElementId,
                  ' .option_groups .select_option[data-key="'
                )
                .concat(key, '"] .bes_select option')
            )
            for (const option of options) {
              option.selected = option.value === String(getSettingsValue(key))
            }
            break
          }
          case "textarea": {
            const textArea = $(
              "#"
                .concat(
                  settingsElementId,
                  ' .option_groups textarea[data-key="'
                )
                .concat(key, '"]')
            )
            if (textArea) {
              textArea.value = getSettingsValue(key)
            }
            break
          }
          default: {
            break
          }
        }
      }
    }
    if (typeof settingsOptions.onViewUpdate === "function") {
      const settingsMain = createSettingsElement()
      settingsOptions.onViewUpdate(settingsMain)
    }
  }
  function getSettingsContainer() {
    const container = $(".".concat(prefix, "container"))
    if (container) {
      const theVersion = parseInt10(container.dataset.besVersion, 0)
      if (theVersion < besVersion) {
        container.id = settingsContainerId
        container.dataset.besVersion = String(besVersion)
      }
      return container
    }
    return addElement2(doc.body, "div", {
      id: settingsContainerId,
      class: "".concat(prefix, "container"),
      "data-bes-version": besVersion,
      style: "display: none;",
    })
  }
  function getSettingsWrapper() {
    const container = getSettingsContainer()
    return (
      $(".".concat(prefix, "wrapper"), container) ||
      addElement2(container, "div", {
        class: "".concat(prefix, "wrapper"),
      })
    )
  }
  function initExtensionList() {
    const wrapper = getSettingsWrapper()
    if (!$(".extension_list_container", wrapper)) {
      const list = createExtensionList([])
      wrapper.append(list)
    }
    addCurrentExtension({
      id: settingsOptions.id,
      title: settingsOptions.title,
      onclick: showSettings,
    })
  }
  function createSettingsElement() {
    let settingsMain = getSettingsElement()
    if (!settingsMain) {
      const wrapper = getSettingsWrapper()
      for (const element of $$(".".concat(prefix, "main"))) {
        element.remove()
      }
      settingsMain = addElement2(wrapper, "div", {
        id: settingsElementId,
        class: "".concat(prefix, "main thin_scrollbar"),
      })
      addElement2(settingsMain, "a", {
        textContent: "Settings",
        class: "navigation_go_previous",
        onclick() {
          activeExtensionList()
        },
      })
      if (settingsOptions.title) {
        addElement2(settingsMain, "h2", { textContent: settingsOptions.title })
      }
      const optionGroups = []
      const getOptionGroup = (index) => {
        if (index > optionGroups.length) {
          for (let i3 = optionGroups.length; i3 < index; i3++) {
            optionGroups.push(
              addElement2(settingsMain, "div", {
                class: "option_groups",
              })
            )
          }
        }
        return optionGroups[index - 1]
      }
      for (const key in settingsTable) {
        if (Object.hasOwn(settingsTable, key)) {
          const item = settingsTable[key]
          const type = item.type || "switch"
          const group = item.group || 1
          const optionGroup = getOptionGroup(group)
          switch (type) {
            case "switch": {
              const switchOption = createSwitchOption(item.icon, item.title, {
                async onchange(event) {
                  const checkbox = event.target
                  if (checkbox) {
                    let result = true
                    if (typeof item.onConfirmChange === "function") {
                      result = item.onConfirmChange(checkbox.checked)
                    }
                    if (result) {
                      await saveSettingsValue(key, checkbox.checked)
                    } else {
                      checkbox.checked = !checkbox.checked
                    }
                  }
                },
              })
              switchOption.dataset.key = key
              addElement2(optionGroup, switchOption)
              break
            }
            case "textarea": {
              let timeoutId
              const div = addElement2(optionGroup, "div", {
                class: "bes_textarea",
              })
              addElement2(div, "textarea", {
                "data-key": key,
                placeholder: item.placeholder || "",
                onkeyup(event) {
                  const textArea = event.target
                  if (timeoutId) {
                    clearTimeout(timeoutId)
                    timeoutId = void 0
                  }
                  timeoutId = setTimeout(async () => {
                    if (textArea) {
                      await saveSettingsValue(key, textArea.value.trim())
                    }
                  }, 100)
                },
              })
              break
            }
            case "action": {
              addElement2(optionGroup, "a", {
                class: "action",
                textContent: item.title,
                onclick: item.onclick,
              })
              break
            }
            case "externalLink": {
              const div4 = addElement2(optionGroup, "div", {
                class: "bes_external_link",
              })
              addElement2(div4, "a", {
                textContent: item.title,
                href: item.url,
                target: "_blank",
              })
              break
            }
            case "select": {
              const div = addElement2(optionGroup, "div", {
                class: "select_option bes_option",
                "data-key": key,
              })
              if (item.icon) {
                addElement2(div, "img", { src: item.icon, class: "bes_icon" })
              }
              addElement2(div, "span", {
                textContent: item.title,
                class: "bes_title",
              })
              const select = addElement2(div, "select", {
                class: "bes_select",
                async onchange() {
                  await saveSettingsValue(key, select.value)
                },
              })
              for (const option of Object.entries(item.options)) {
                addElement2(select, "option", {
                  textContent: option[0],
                  value: option[1],
                })
              }
              break
            }
            case "tip": {
              const tip = addElement2(optionGroup, "div", {
                class: "bes_tip",
              })
              addElement2(tip, "a", {
                class: "bes_tip_anchor",
                textContent: item.title,
              })
              const tipContent = addElement2(tip, "div", {
                class: "bes_tip_content",
                innerHTML: createHTML(item.tipContent),
              })
              break
            }
          }
        }
      }
      if (settingsOptions.footer) {
        const footer = addElement2(settingsMain, "footer")
        footer.innerHTML = createHTML(
          typeof settingsOptions.footer === "string"
            ? settingsOptions.footer
            : '<p>Made with \u2764\uFE0F by\n      <a href="https://www.pipecraft.net/" target="_blank">\n        Pipecraft\n      </a></p>'
        )
      }
    }
    return settingsMain
  }
  function addSideMenu() {
    if (!getSettingsValue("displaySettingsButtonInSideMenu")) {
      return
    }
    const menu =
      $("#browser_extension_side_menu") ||
      addElement2(doc.body, "div", {
        id: "browser_extension_side_menu",
        "data-bes-version": besVersion,
      })
    const button = $("button[data-bes-version]", menu)
    if (button) {
      const theVersion = parseInt10(button.dataset.besVersion, 0)
      if (theVersion >= besVersion) {
        return
      }
      button.remove()
    }
    addElement2(menu, "button", {
      type: "button",
      "data-bes-version": besVersion,
      title: i("settings.menu.settings"),
      onclick() {
        setTimeout(showSettings, 1)
      },
      innerHTML: settingButton,
    })
  }
  function addCommonSettings(settingsTable3) {
    let maxGroup = 0
    for (const key in settingsTable3) {
      if (Object.hasOwn(settingsTable3, key)) {
        const item = settingsTable3[key]
        const group = item.group || 1
        if (group > maxGroup) {
          maxGroup = group
        }
      }
    }
    settingsTable3.displaySettingsButtonInSideMenu = {
      title: i("settings.displaySettingsButtonInSideMenu"),
      defaultValue: !(
        typeof GM === "object" && typeof GM.registerMenuCommand === "function"
      ),
      group: maxGroup + 1,
    }
  }
  function handleShowSettingsUrl() {
    if (location.hash === "#bes-show-settings") {
      setTimeout(showSettings, 100)
    }
  }
  async function showSettings() {
    const settingsContainer = getSettingsContainer()
    const settingsMain = createSettingsElement()
    await updateOptions()
    settingsContainer.style.display = "block"
    addEventListener(document, "click", onDocumentClick, true)
    addEventListener(document, "keydown", onDocumentKeyDown, true)
    activeExtension(settingsOptions.id)
    deactiveExtensionList()
  }
  var initSettings = async (options) => {
    settingsOptions = options
    settingsTable = options.settingsTable || {}
    addCommonSettings(settingsTable)
    addValueChangeListener(storageKey, async () => {
      settings = await getSettings()
      await updateOptions()
      addSideMenu()
      if (typeof options.onValueChange === "function") {
        options.onValueChange()
      }
    })
    settings = await getSettings()
    runWhenHeadExists(() => {
      addStyle(getSettingsStyle())
    })
    runWhenDomReady(() => {
      initExtensionList()
      addSideMenu()
    })
    registerMenuCommand(i("settings.menu.settings"), showSettings, "o")
    handleShowSettingsUrl()
  }
  var content_default =
    '\uFEFF#TOFIX_uFEFF{display:block}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) [data-utags_key]{display:none !important}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_ul{box-sizing:border-box !important;display:inline-flex !important;flex-wrap:wrap;align-content:flex-start;justify-content:flex-start;overflow:visible;white-space:normal;list-style-type:none !important;margin:0 !important;padding:0 !important;vertical-align:text-bottom !important;line-height:normal !important;background-color:rgba(0,0,0,0);border:none !important;box-shadow:none !important;width:max-content !important}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_ul>li{box-sizing:border-box !important;display:inline-flex !important;align-items:center !important;float:none !important;overflow:visible;width:unset !important;height:unset !important;border:none !important;padding:0 !important;margin:0 !important}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_ul>li:first-child .utags_text_tag{margin-left:3px !important}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_ul>li:last-child .utags_text_tag{margin-right:3px !important}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_ul>li::before,:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_ul>li::after{content:none}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_ul .utags_text_tag{box-sizing:border-box !important;display:block !important;border:var(--utags-text-tag-border-width) solid var(--utags-text-tag-border-color);color:var(--utags-text-tag-color) !important;border-radius:3px !important;padding:1px 3px !important;margin:0 1px !important;font-size:var(--utags-text-tag-font-size) !important;font-family:var(--utags-text-tag-font-family) !important;letter-spacing:0 !important;line-height:1 !important;height:unset !important;width:unset !important;font-weight:normal !important;text-decoration:none !important;text-align:center !important;text-shadow:none !important;min-width:unset !important;min-height:unset !important;max-width:unset !important;max-height:unset !important;background:unset !important;background-color:var(--utags-text-tag-background-color) !important;z-index:0;pointer-events:auto}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_ul .utags_text_tag:link{cursor:pointer}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_ul .utags_text_tag[data-utags_tag]::before{content:attr(data-utags_tag);display:block;font-size:var(--utags-text-tag-font-size);line-height:1;height:unset;width:unset;border-radius:unset;border:unset;background:unset;margin:unset;padding:unset}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_ul .utags_emoji_tag{--utags-text-tag-background-color: var( --utags-emoji-tag-background-color );--utags-text-tag-font-size: var(--utags-emoji-tag-font-size);--utags-text-tag-font-family: var(--utags-emoji-tag-font-family);--utags-text-tag-border-width: var(--utags-emoji-tag-border-width);--utags-text-tag-border-color: var(--utags-emoji-tag-border-color)}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_ul .utags_captain_tag,:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_ul .utags_captain_tag2{width:var(--utags-captain-tag-size) !important;height:var(--utags-captain-tag-size) !important;padding:1px 0 0 1px !important;background:none !important;color:var(--utags-captain-tag-color) !important;border:none !important}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_ul .utags_captain_tag::before,:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_ul .utags_captain_tag2::before{content:none !important}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_ul .utags_captain_tag svg,:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_ul .utags_captain_tag2 svg{fill:currentColor !important;vertical-align:-3px}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_ul .utags_captain_tag *,:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_ul .utags_captain_tag2 *{color:inherit !important;fill:currentColor !important;width:unset;height:unset}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_ul .utags_captain_tag{opacity:1%;position:absolute;top:var(--utags-notag-captain-tag-top, 0);left:var(--utags-notag-captain-tag-left, 0);padding:0 !important;margin:0 !important;width:4px !important;height:4px !important;font-size:1px !important;background-color:var(--utags-captain-tag-background-color) !important;transition:all 0s .3s !important}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_ul .utags_captain_tag:hover,:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_ul .utags_captain_tag:focus,:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_ul .utags_captain_tag2:hover,:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_ul .utags_captain_tag2:focus{color:var(--utags-captain-tag-hover-color) !important}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_ul.utags_ul_0{margin:0 !important;display:var(--utags-notag-ul-disply, inline) !important;float:var(--utags-notag-ul-float, none);height:var(--utags-notag-ul-height, unset);width:var(--utags-notag-ul-width, unset) !important;position:var(--utags-notag-ul-position, unset);top:var(--utags-notag-ul-top, unset)}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_ul.utags_ul_0>li{position:relative !important;height:var(--utags-captain-tag-size) !important}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_captain_tag:focus,:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) *:hover+.utags_ul .utags_captain_tag,:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_ul:hover .utags_captain_tag,:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_show_all .utags_captain_tag,:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) :not(a):not([data-utags_node_type=link])+.utags_ul .utags_captain_tag{opacity:100%;width:calc(var(--utags-captain-tag-size) + 8px) !important;height:calc(var(--utags-captain-tag-size) + 8px) !important;padding:5px 4px 4px 5px !important;transition:all 0s .1s !important;z-index:90}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_hide_all .utags_captain_tag,:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_show_all .utags_captain_tag{transition:unset !important}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) :not(a):not([data-utags_node_type=link])+.utags_ul .utags_captain_tag{position:relative}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_ul_notag_float_left .utags_ul_0,:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_ul_0.utags_ul_notag_float_left{float:left}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_modal{position:fixed;top:0;left:0;height:0;width:0;z-index:200000}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_modal .utags_modal_wrapper{position:fixed;display:flex;align-items:flex-start;justify-content:center;width:100%;inset:0px;padding:14vh 16px 16px;background-color:rgba(255,255,255,.1);z-index:200000}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_modal .utags_modal_content{box-sizing:border-box;display:flex;flex-direction:column;max-width:600px;max-height:100%;overflow:auto;color:#000;background-color:#fff;border-radius:5px;padding:14px;-webkit-box-shadow:0px 10px 39px 10px rgba(62,66,66,.22);-moz-box-shadow:0px 10px 39px 10px rgba(62,66,66,.22);box-shadow:0px 10px 39px 10px rgba(62,66,66,.22)}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_modal .utags_title{display:block;color:#000;margin-bottom:10px;font-size:14px}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_modal .utags_buttons_wrapper{display:flex;flex-direction:row;justify-content:end;padding:10px 0 10px 0}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_modal .utags_buttons_wrapper button{font-size:14px;height:32px;min-width:80px;font-weight:600;padding:0 8px;border-radius:2px;color:var(--utags-button-text-color);border:1px solid var(--utags-button-border-color);background-color:var(--utags-button-bg-color);text-shadow:none;text-align:center;font-family:revert}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_modal .utags_buttons_wrapper button:hover{background-color:var(--utags-button-hover-bg-color);border-color:var(--utags-button-hover-border-color)}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_modal .utags_buttons_wrapper button:not(:first-child){margin-left:10px}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_modal .utags_buttons_wrapper button.utags_primary{--utags-button-text-color: var(--utags-action-button-text-color);--utags-button-bg-color: var(--utags-action-button-bg-color);--utags-button-border-color: var(--utags-action-button-border-color);--utags-button-hover-bg-color: var( --utags-action-button-hover-bg-color );--utags-button-hover-border-color: var( --utags-action-button-hover-border-color )}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_modal .utags_prompt input{-webkit-appearance:none;background-color:var(--utags-button-hover-bg-color);border:none;border-bottom:2px solid var(--utags-button-hover-bg-color);border-radius:4px;box-sizing:border-box;caret-color:var(--cr-input-focus-color);color:var(--cr-input-color);font-family:var(--utags-text-tag-font-family) !important;font-weight:inherit;line-height:inherit;min-height:var(--cr-input-min-height, auto);outline:0;padding-bottom:var(--cr-input-padding-bottom, 6px);padding-inline-end:var(--cr-input-padding-end, 8px);padding-inline-start:var(--cr-input-padding-start, 8px);padding-top:var(--cr-input-padding-top, 6px);text-align:left;text-overflow:ellipsis;width:100%;margin:0;font-size:12px}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_modal .utags_prompt input:focus,:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_modal .utags_prompt input:focus-visible{outline:0;border-bottom:2px solid var(--utags-action-button-hover-border-color)}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_current_tags_wrapper{display:flex;justify-content:space-between}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_current_tags_wrapper .utags_button_copy{cursor:pointer;font-size:10px;line-height:1;height:18px;padding:0 6px;border-radius:2px;color:var(--utags-action-button-text-color);background-color:var(--utags-action-button-bg-color);border:1px solid var(--utags-action-button-border-color);text-shadow:none;text-align:center;font-family:revert}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) ul.utags_current_tags{list-style-type:none;margin:0;padding:0 0 10px 0 !important;display:flex !important;flex-direction:row;flex-wrap:wrap}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) ul.utags_current_tags:empty,:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) ul.utags_current_tags:empty+button{display:none !important}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) ul.utags_current_tags li .utags_text_tag:hover{--utags-text-tag-color: #000;--utags-text-tag-border-color: #000;--utags-text-tag-background-color: unset;opacity:.5;text-decoration:line-through !important}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_list_wrapper{display:flex;justify-content:space-between;max-height:200px;overflow-y:auto}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) ul.utags_select_list{flex-grow:1;list-style-type:none;margin:0;padding:10px 0 10px 0}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) ul.utags_select_list:empty{display:none !important}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) ul.utags_select_list:not(:first-child){margin-left:4px}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) ul.utags_select_list::before{content:attr(data-utags_list_name);position:sticky;top:0;display:block;font-size:12px;font-weight:600;text-align:left;padding:0 2px 0 8px;cursor:default;background-color:#f8fafe}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) ul.utags_select_list li{box-sizing:border-box;cursor:pointer;font-size:12px;height:16px;display:flex;align-items:center;padding:0 2px 0 8px;margin:0;max-width:150px;overflow:hidden;text-overflow:ellipsis}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) ul.utags_select_list li.utags_active,:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) ul.utags_select_list li.utags_active2{background-color:#fef2f2}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) ul.utags_select_list li span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:var(--utags-text-tag-font-family) !important;font-size:12px;line-height:1}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) [data-utags_list_node*=",\u6807\u9898\u515A,"],:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) [data-utags_list_node*=",\u63A8\u5E7F,"],:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) [data-utags_list_node*=",\u65E0\u804A,"],:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) [data-utags_list_node*=",\u5FFD\u7565,"],:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) [data-utags_list_node*=",ignore,"],:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) [data-utags_list_node*=",clickbait,"],:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) [data-utags_list_node*=",promotion,"],:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) [data-utags_list_node*=",sb,"]{opacity:10%}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) [data-utags_list_node*=",\u5DF2\u9605,"],:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) [data-utags_list_node*=",\u65B0\u7528\u6237,"]{opacity:50%}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) [data-utags_list_node*=",hide,"],:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) [data-utags_list_node*=",\u9690\u85CF,"],:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) [data-utags_list_node*=",\u5C4F\u853D,"],:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) [data-utags_list_node*=",\u4E0D\u518D\u663E\u793A,"],:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) [data-utags_list_node*=",block,"]{opacity:5%;display:none}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) [data-utags_list_node*=",\u70ED\u95E8,"],:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) [data-utags_list_node*=",\u6536\u85CF,"],:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) [data-utags_list_node*=",\u5173\u6CE8,"],:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) [data-utags_list_node*=",\u7A0D\u540E\u9605\u8BFB,"]{background-image:linear-gradient(to right, rgba(255, 255, 255, 0), #fefce8) !important;opacity:100% !important;display:var(--utags-list-node-display) !important}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) [data-utags_list_node*=",\u70ED\u95E8,"],:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) [data-utags_list_node*=",\u6536\u85CF,"],:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) [data-utags_list_node*=",\u5173\u6CE8,"]{background-image:linear-gradient(to right, rgba(255, 255, 255, 0), #fef2f2) !important}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) [data-utags_list_node]:hover{opacity:100% !important}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) [data-utags_other="1"]+ul.utags_ul .utags_captain_tag,:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) [data-utags_other="1"]+ul.utags_ul .utags_captain_tag2{color:#ff0 !important}.utags_no_hide [data-utags_list_node*=","]{display:var(--utags-list-node-display) !important}.utags_no_opacity_effect [data-utags_list_node*=","]{opacity:100% !important}textarea[data-key=emojiTags]{font-family:var(--utags-text-tag-font-family)}:root{--utags-list-node-display: block;--utags-captain-tag-background-color: #ffffffb3;--utags-captain-tag-background-color-overlap: #ffffffdd;--utags-captain-tag-color: #ff6361;--utags-captain-tag-hover-color: #256cf1;--utags-captain-tag-size: 14px;--utags-text-tag-color: red;--utags-text-tag-border-color: red;--utags-text-tag-background-color: unset;--utags-text-tag-font-size: 10px;--utags-text-tag-border-width: 1px;--utags-text-tag-font-family: "helvetica neue", "Helvetica", "microsoft yahei", "Arial", "sans-serif", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "noto color emoji", "android emoji", "emojisymbols", "emojione mozilla", "twemoji mozilla", "Segoe UI", "Noto Sans";--utags-emoji-tag-border-color: #fff0;--utags-emoji-tag-background-color: #fff0;--utags-emoji-tag-font-size: 12px;--utags-emoji-tag-border-width: 0;--utags-emoji-tag-font-family: "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "noto color emoji", "android emoji", "emojisymbols", "emojione mozilla", "twemoji mozilla", "Segoe UI", "Noto Sans";--utags-button-text-color: #1a73e8;--utags-button-bg-color: #ffffff;--utags-button-border-color: #dadce0;--utags-button-hover-bg-color: #4285f40a;--utags-button-hover-border-color: #d2e3fc;--utags-action-button-text-color: #ffffff;--utags-action-button-bg-color: #1a73e8;--utags-action-button-border-color: #1a73e8;--utags-action-button-hover-bg-color: #1a73e8e6;--utags-action-button-hover-border-color: #1a73e8e6;--utags-notag-ul-disply-1: inline;--utags-notag-ul-float-1: none;--utags-notag-ul-height-1: unset;--utags-notag-ul-width-1: unset;--utags-notag-ul-position-1: unset;--utags-notag-ul-top-1: unset;--utags-notag-captain-tag-top-1: 0;--utags-notag-captain-tag-left-1: 0;--utags-notag-ul-disply-2: block;--utags-notag-ul-height-2: 0;--utags-notag-ul-width-2: 0;--utags-notag-ul-position-2: unset;--utags-notag-ul-top-2: unset;--utags-notag-captain-tag-top-2: -22px;--utags-notag-captain-tag-left-2: -4px;--utags-notag-ul-disply-3: block;--utags-notag-ul-height-3: 0;--utags-notag-ul-width-3: 0;--utags-notag-ul-position-3: absolute;--utags-notag-ul-top-3: 0;--utags-notag-captain-tag-top-3: 0;--utags-notag-captain-tag-left-3: -4px;--utags-notag-ul-disply-4: block;--utags-notag-ul-height-4: 0;--utags-notag-ul-width-4: 0;--utags-notag-ul-position-4: absolute;--utags-notag-ul-top-4: unset;--utags-notag-captain-tag-top-4: 0;--utags-notag-captain-tag-left-4: -4px;--utags-notag-ul-disply-5: block;--utags-notag-ul-height-5: 0;--utags-notag-ul-width-5: 0;--utags-notag-ul-position-5: absolute;--utags-notag-ul-top-5: -9999px;--utags-notag-captain-tag-top-5: 0;--utags-notag-captain-tag-left-5: -4px;--utags-notag-ul-disply: var(--utags-notag-ul-disply-1);--utags-notag-ul-float: var(--utags-notag-ul-float-1);--utags-notag-ul-height: var(--utags-notag-ul-height-1);--utags-notag-ul-width: var(--utags-notag-ul-width-1);--utags-notag-ul-position: var(--utags-notag-ul-position-1);--utags-notag-ul-top: var(--utags-notag-ul-top-1);--utags-notag-captain-tag-top: var(--utags-notag-captain-tag-top-1);--utags-notag-captain-tag-left: var(--utags-notag-captain-tag-left-1)}'
  function createTag(tagName, options) {
    const a = createElement("a")
    if (options.enableSelect) {
      a.textContent = tagName
    } else {
      a.dataset.utags_tag = tagName
    }
    if (!options.noLink) {
      a.setAttribute(
        "href",
        "https://utags.pipecraft.net/tags/#" + encodeURIComponent(tagName)
      )
      a.setAttribute("target", "_blank")
    }
    a.setAttribute(
      "class",
      options.isEmoji ? "utags_text_tag utags_emoji_tag" : "utags_text_tag"
    )
    return a
  }
  var messages3 = {
    "settings.enableCurrentSite": "Enable on current site",
    "settings.showHidedItems": "Show hidden items (tags with 'block', 'hide')",
    "settings.noOpacityEffect":
      "No opacity mask effect (tags with 'ignore', 'clickbait', 'promotion')",
    "settings.pinnedTags": "Add the tags you want to pin, separated by commas.",
    "settings.pinnedTagsDefaultValue":
      "block, hide, ignore, clickbait, promotion",
    "settings.pinnedTagsPlaceholder": "foo, bar",
    "settings.emojiTags": "Add the emoji tags, separated by commas",
    "settings.useSimplePrompt": "Use simple prompt method to add tags",
    "settings.openTagsPage": "Open the tag list page",
    "settings.openDataPage": "Open the import data/export data page",
    "settings.title": "\u{1F3F7}\uFE0F UTags - Add usertags to links",
    "settings.information":
      "After changing the settings, reload the page to take effect",
    "settings.report": "Report and Issue...",
    "prompt.addTags":
      "[UTags] Please enter tags, multiple tags are separated by commas",
    "prompt.pinnedTags": "Pinned",
    "prompt.mostUsedTags": "Recently commonly used",
    "prompt.recentAddedTags": "Newly added",
    "prompt.emojiTags": "Emoji",
    "prompt.copy": "Copy",
    "prompt.cancel": "Cancle",
    "prompt.ok": "OK",
  }
  var en_default2 = messages3
  var messages4 = {
    "settings.enableCurrentSite": "\u5728\u5F53\u524D\u7F51\u7AD9\u542F\u7528",
    "settings.showHidedItems":
      "\u663E\u793A\u88AB\u9690\u85CF\u7684\u5185\u5BB9 (\u6DFB\u52A0\u4E86 'block', 'hide', '\u9690\u85CF'\u7B49\u6807\u7B7E\u7684\u5185\u5BB9)",
    "settings.noOpacityEffect":
      "\u53BB\u9664\u534A\u900F\u660E\u6548\u679C (\u6DFB\u52A0\u4E86 'sb', '\u5FFD\u7565', '\u6807\u9898\u515A'\u7B49\u6807\u7B7E\u7684\u5185\u5BB9)",
    "settings.pinnedTags":
      "\u5728\u4E0B\u9762\u6DFB\u52A0\u8981\u7F6E\u9876\u7684\u6807\u7B7E\uFF0C\u4EE5\u9017\u53F7\u5206\u9694",
    "settings.pinnedTagsDefaultValue":
      "\u6536\u85CF, block, sb, \u5C4F\u853D, \u9690\u85CF, \u5DF2\u9605, \u5FFD\u7565, \u6807\u9898\u515A, \u63A8\u5E7F, \u5173\u6CE8",
    "settings.pinnedTagsPlaceholder": "foo, bar",
    "settings.emojiTags":
      "\u5728\u4E0B\u9762\u6DFB\u52A0\u8868\u60C5\u7B26\u53F7\u6807\u7B7E\uFF0C\u4EE5\u9017\u53F7\u5206\u9694",
    "settings.useSimplePrompt":
      "\u4F7F\u7528\u7B80\u5355\u65B9\u5F0F\u6DFB\u52A0\u6807\u7B7E",
    "settings.openTagsPage": "\u6807\u7B7E\u5217\u8868",
    "settings.openDataPage":
      "\u5BFC\u51FA\u6570\u636E/\u5BFC\u5165\u6570\u636E",
    "settings.title":
      "\u{1F3F7}\uFE0F \u5C0F\u9C7C\u6807\u7B7E (UTags) - \u4E3A\u94FE\u63A5\u6DFB\u52A0\u7528\u6237\u6807\u7B7E",
    "settings.information":
      "\u66F4\u6539\u8BBE\u7F6E\u540E\uFF0C\u91CD\u65B0\u52A0\u8F7D\u9875\u9762\u5373\u53EF\u751F\u6548",
    "settings.report": "\u53CD\u9988\u95EE\u9898",
    "prompt.addTags":
      "[UTags] \u8BF7\u8F93\u5165\u6807\u7B7E\uFF0C\u591A\u4E2A\u6807\u7B7E\u4EE5\u9017\u53F7\u5206\u9694",
    "prompt.pinnedTags": "\u7F6E\u9876",
    "prompt.mostUsedTags": "\u6700\u8FD1\u5E38\u7528",
    "prompt.recentAddedTags": "\u6700\u65B0\u6DFB\u52A0",
    "prompt.emojiTags": "\u7B26\u53F7",
    "prompt.copy": "\u590D\u5236",
    "prompt.cancel": "\u53D6\u6D88",
    "prompt.ok": "\u786E\u8BA4",
  }
  var zh_cn_default2 = messages4
  var i2 = initI18n({
    "en,en-US": en_default2,
    "zh,zh-CN": zh_cn_default2,
  })
  function getFirstHeadElement(tagName = "h1") {
    for (const element of $$(tagName)) {
      if (element.closest(".browser_extension_settings_container")) {
        continue
      }
      return element
    }
    return void 0
  }
  function splitTags(text) {
    if (!text) {
      return []
    }
    return text
      .trim()
      .replaceAll(/[\n\r\t]/gm, " ")
      .split(/\s*[,，]\s*/)
  }
  function sortTags(tags, privilegedTags) {
    return tags.sort((a, b) => {
      const pA = privilegedTags.includes(a)
      const pB = privilegedTags.includes(b)
      if (pA && pB) {
        return 0
      }
      if (pA) {
        return -1
      }
      if (pB) {
        return 1
      }
      return 0
    })
  }
  async function copyText(data) {
    const textArea = createElement("textarea", {
      style: "position: absolute; left: -100%;",
      contentEditable: "true",
    })
    textArea.value = data.replaceAll("\xA0", " ")
    document.body.append(textArea)
    textArea.select()
    await navigator.clipboard.writeText(textArea.value)
    textArea.remove()
  }
  function deleteUrlParameters(urlString, keys, excepts) {
    const url = new URL(urlString)
    if (keys === "*") {
      if (excepts && excepts.length > 0) {
        const parameters2 = new URLSearchParams(url.search)
        keys = []
        for (const key of parameters2.keys()) {
          if (!excepts.includes(key)) {
            keys.push(key)
          }
        }
      } else {
        url.search = ""
        return url.toString()
      }
    }
    if (typeof keys === "string") {
      keys = [keys]
    }
    const parameters = new URLSearchParams(url.search)
    for (const key of keys) {
      parameters.delete(key)
    }
    url.search = parameters.size === 0 ? "" : "?" + parameters.toString()
    return url.toString()
  }
  function getUrlParameters(urlString, keys, allowEmpty = false) {
    const url = new URL(urlString)
    if (typeof keys === "string") {
      keys = [keys]
    }
    const result = {}
    const parameters = new URLSearchParams(url.search)
    for (const key of keys) {
      if (key) {
        const value = parameters.get(key)
        if (
          (allowEmpty && value !== void 0 && value !== null) ||
          (!allowEmpty && value)
        ) {
          result[key] = value
        }
      }
    }
    return result
  }
  var extensionVersion = "0.8.0"
  var databaseVersion = 2
  var storageKey2 = "extension.utags.urlmap"
  var storageKeyRecentTags = "extension.utags.recenttags"
  var storageKeyMostUsedTags = "extension.utags.mostusedtags"
  var storageKeyRecentAddedTags = "extension.utags.recentaddedtags"
  var cachedUrlMap
  async function getUrlMap() {
    return (await getValue(storageKey2)) || {}
  }
  async function getUrlMapVesion1() {
    return getValue("plugin.utags.tags.v1")
  }
  async function getCachedUrlMap() {
    if (!cachedUrlMap) {
      cachedUrlMap = await getUrlMap()
    }
    return cachedUrlMap
  }
  function getTags(key) {
    return (cachedUrlMap && cachedUrlMap[key]) || { tags: [] }
  }
  async function saveTags(key, tags, meta) {
    const urlMap = await getUrlMap()
    urlMap.meta = Object.assign({}, urlMap.meta, {
      extensionVersion,
      databaseVersion,
    })
    const newTags = mergeTags(tags, [])
    let oldTags = []
    if (newTags.length === 0) {
      delete urlMap[key]
    } else {
      const now = Date.now()
      const data = urlMap[key] || {}
      oldTags = data.tags
      const newMeta = Object.assign({}, data.meta, meta, {
        updated: now,
      })
      newMeta.created = newMeta.created || now
      urlMap[key] = {
        tags: newTags,
        meta: newMeta,
      }
    }
    await setValue(storageKey2, urlMap)
    await addRecentTags(newTags, oldTags)
  }
  function getScore(weight = 1) {
    return (Math.floor(Date.now() / 1e3) / 1e9) * weight
  }
  async function addRecentTags(newTags, oldTags) {
    if (newTags.length === 0) {
      return
    }
    newTags =
      oldTags && oldTags.length > 0
        ? newTags.filter((v) => !oldTags.includes(v))
        : newTags
    if (newTags.length > 0) {
      const recentTags = (await getValue(storageKeyRecentTags)) || []
      const score = getScore()
      for (const tag of newTags) {
        recentTags.push({
          tag,
          score,
        })
      }
      if (recentTags.length > 1e3) {
        recentTags.splice(0, 100)
      }
      await setValue(storageKeyRecentTags, recentTags)
      await generateMostUsedAndRecentAddedTags(recentTags)
    }
  }
  async function generateMostUsedAndRecentAddedTags(recentTags) {
    const mostUsed = {}
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
    const mostUsedTags2 = Object.values(mostUsed)
      .filter((v) => v.score > getScore(1.5))
      .sort((a, b) => {
        return b.score - a.score
      })
      .map((v) => v.tag)
      .slice(0, 200)
    const uniqSet = /* @__PURE__ */ new Set()
    const recentAddedTags2 = recentTags
      .map((v) => v.tag)
      .reverse()
      .filter((v) => v && !uniqSet.has(v) && uniqSet.add(v))
      .slice(0, 200)
    await setValue(storageKeyMostUsedTags, mostUsedTags2)
    await setValue(storageKeyRecentAddedTags, recentAddedTags2)
  }
  async function getMostUsedTags() {
    return (await getValue(storageKeyMostUsedTags)) || []
  }
  async function getRecentAddedTags() {
    return (await getValue(storageKeyRecentAddedTags)) || []
  }
  async function getPinnedTags() {
    return splitTags(getSettingsValue("pinnedTags") || "")
  }
  async function getEmojiTags() {
    return splitTags(getSettingsValue("emojiTags") || "")
  }
  function addTagsValueChangeListener(func) {
    addValueChangeListener(storageKey2, func)
  }
  addTagsValueChangeListener(async () => {
    cachedUrlMap = void 0
    await checkVersion()
  })
  async function reload() {
    console.log("Current extionsion is outdated, need reload page")
    const urlMap = await getUrlMap()
    urlMap.meta = urlMap.meta || {}
    await setValue(storageKey2, urlMap)
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
      const now = Date.now()
      if (newTags.length > 0) {
        const orgMeta = orgData.meta || {}
        const created = Math.min(orgMeta.created || now, meta.created || now)
        const updated = Math.max(
          orgMeta.updated || 0,
          meta.updated || 0,
          created
        )
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
    await setValue(storageKey2, urlMap)
    console.log(
      "\u6570\u636E\u5DF2\u6210\u529F\u5BFC\u5165\uFF0C\u65B0\u589E "
        .concat(numberOfLinks, " \u6761\u94FE\u63A5\uFF0C\u65B0\u589E ")
        .concat(numberOfTags, " \u6761\u6807\u7B7E\u3002")
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
  async function outputData() {
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
  function createModal(attributes) {
    const div = addElement2(doc.body, "div", {
      class: "utags_modal",
    })
    const wrapper = addElement2(div, "div", {
      class: "utags_modal_wrapper",
    })
    const content = addElement2(wrapper, "div", attributes)
    addClass(content, "utags_modal_content")
    let removed = false
    return {
      remove() {
        if (!removed) {
          removed = true
          div.remove()
        }
      },
      getContentElement() {
        return content
      },
    }
  }
  var pinnedTags
  var mostUsedTags
  var recentAddedTags
  var emojiTags
  var displayedTags = /* @__PURE__ */ new Set()
  var currentTags = /* @__PURE__ */ new Set()
  function onSelect(selected, input) {
    if (selected) {
      input.value = ""
      const tags = splitTags(selected)
      for (const tag of tags) {
        if (tag.trim()) {
          currentTags.add(tag.trim())
        }
      }
      updateLists()
    }
  }
  function removeTag(tag) {
    if (tag) {
      tag = tag.trim()
      currentTags.delete(tag)
      updateLists()
    }
  }
  function updateLists() {
    displayedTags = /* @__PURE__ */ new Set()
    const ul1 = $(".utags_modal_content ul.utags_current_tags")
    if (ul1) {
      updateCurrentTagList(ul1)
    }
    const ul = $(".utags_modal_content ul.utags_select_list.utags_pined_list")
    if (ul) {
      updateCandidateTagList(ul, pinnedTags)
    }
    const ul4 = $(".utags_modal_content ul.utags_select_list.utags_emoji_list")
    if (ul4) {
      updateCandidateTagList(ul4, emojiTags)
    }
    const ul2 = $(".utags_modal_content ul.utags_select_list.utags_most_used")
    if (ul2) {
      updateCandidateTagList(ul2, mostUsedTags)
    }
    const ul3 = $(
      ".utags_modal_content ul.utags_select_list.utags_recent_added"
    )
    if (ul3) {
      updateCandidateTagList(ul3, recentAddedTags)
    }
  }
  function updateCandidateTagList(ul, candidateTags) {
    ul.textContent = ""
    let index = 0
    for (const text of candidateTags) {
      if (displayedTags.has(text)) {
        continue
      }
      displayedTags.add(text)
      const li = addElement2(ul, "li", {})
      addElement2(li, "span", {
        textContent: text,
      })
      index++
      if (index >= 50) {
        break
      }
    }
  }
  function getNextList(parentElement) {
    let parentNext = parentElement.nextElementSibling
    while (parentNext && parentNext.children.length === 0) {
      parentNext = parentNext.nextElementSibling
    }
    return parentNext
  }
  function getPreviousList(parentElement) {
    let parentPrevious = parentElement.previousElementSibling
    while (parentPrevious && parentPrevious.children.length === 0) {
      parentPrevious = parentPrevious.previousElementSibling
    }
    return parentPrevious
  }
  function updateCurrentTagList(ul) {
    ul.textContent = ""
    const sortedTags = sortTags([...currentTags], emojiTags)
    for (const tag of sortedTags) {
      displayedTags.add(tag)
      const li = addElement2(ul, "li")
      const a = createTag(tag, {
        isEmoji: emojiTags.includes(tag),
        noLink: true,
      })
      li.append(a)
    }
  }
  function removeAllActive(type) {
    if (type !== 2) {
      const selector = ".utags_modal_content ul.utags_select_list .utags_active"
      for (const li of $$(selector)) {
        removeClass(li, "utags_active")
      }
    }
    if (type !== 1) {
      const selector =
        ".utags_modal_content ul.utags_select_list .utags_active2"
      for (const li of $$(selector)) {
        removeClass(li, "utags_active2")
      }
    }
  }
  async function copyCurrentTags(input) {
    const value = sortTags([...currentTags], emojiTags).join(", ")
    await copyText(value)
    input.value = value
    input.focus()
    input.select()
  }
  function stopEventPropagation(event) {
    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation()
  }
  function createPromptView(message, value, resolve) {
    const modal = createModal({ class: "utags_prompt" })
    const content = modal.getContentElement()
    value = value || ""
    addElement2(content, "span", {
      class: "utags_title",
      textContent: message,
    })
    const currentTagsWrapper = addElement2(content, "div", {
      class: "utags_current_tags_wrapper",
    })
    addElement2(currentTagsWrapper, "span", {
      textContent: "",
      style: "display: none;",
      "data-utags": "",
    })
    addElement2(currentTagsWrapper, "ul", {
      class: "utags_current_tags utags_ul",
    })
    const input = addElement2(content, "input", {
      type: "text",
      placeholder: "foo, bar",
      onblur(event) {
        if (event.relatedTarget) {
          input.focus()
          stopEventPropagation(event)
        }
        setTimeout(() => {
          if (doc.activeElement === doc.body) {
            closeModal2()
          }
        }, 1)
      },
    })
    input.focus()
    input.select()
    addElement2(currentTagsWrapper, "button", {
      class: "utags_button_copy",
      textContent: i2("prompt.copy"),
      async onclick() {
        await copyCurrentTags(input)
      },
    })
    const listWrapper = addElement2(content, "div", {
      class: "utags_list_wrapper",
    })
    addElement2(listWrapper, "ul", {
      class: "utags_select_list utags_pined_list",
      "data-utags_list_name": i2("prompt.pinnedTags"),
    })
    addElement2(listWrapper, "ul", {
      class: "utags_select_list utags_most_used",
      "data-utags_list_name": i2("prompt.mostUsedTags"),
    })
    addElement2(listWrapper, "ul", {
      class: "utags_select_list utags_recent_added",
      "data-utags_list_name": i2("prompt.recentAddedTags"),
    })
    addElement2(listWrapper, "ul", {
      class: "utags_select_list utags_emoji_list",
      "data-utags_list_name": i2("prompt.emojiTags"),
    })
    updateLists()
    const buttonWrapper = addElement2(content, "div", {
      class: "utags_buttons_wrapper",
    })
    let closed = false
    const closeModal2 = (value2) => {
      if (closed) {
        return
      }
      closed = true
      removeEventListener(input, "keydown", keydonwHandler, true)
      removeEventListener(doc, "keydown", keydonwHandler, true)
      removeEventListener(doc, "mousedown", mousedownHandler, true)
      removeEventListener(doc, "click", clickHandler, true)
      removeEventListener(doc, "mouseover", mouseoverHandler, true)
      setTimeout(() => {
        modal.remove()
      })
      resolve(value2 == null ? null : value2)
    }
    const okHandler = () => {
      closeModal2(Array.from(currentTags).join(","))
    }
    addElement2(buttonWrapper, "button", {
      textContent: i2("prompt.cancel"),
      onclick() {
        closeModal2()
      },
    })
    addElement2(buttonWrapper, "button", {
      class: "utags_primary",
      textContent: i2("prompt.ok"),
      onclick() {
        onSelect(input.value.trim(), input)
        okHandler()
      },
    })
    const keydonwHandler = (event) => {
      if (event.defaultPrevented || !$(".utags_modal_content")) {
        return
      }
      let current = $(".utags_modal_content ul.utags_select_list .utags_active")
      switch (event.key) {
        case "Escape": {
          stopEventPropagation(event)
          closeModal2()
          break
        }
        case "Enter": {
          stopEventPropagation(event)
          input.focus()
          if (current) {
            onSelect(current.textContent, input)
          } else if (input.value.trim()) {
            onSelect(input.value.trim(), input)
          } else {
            okHandler()
          }
          break
        }
        case "Tab": {
          stopEventPropagation(event)
          input.focus()
          break
        }
        case "ArrowDown": {
          stopEventPropagation(event)
          input.focus()
          current = $(
            ".utags_modal_content ul.utags_select_list .utags_active,.utags_modal_content ul.utags_select_list .utags_active2"
          )
          if (current) {
            const next = current.nextElementSibling
            if (next) {
              next.scrollIntoView({ block: "end" })
              removeAllActive()
              addClass(next, "utags_active")
            }
          } else {
            const next = $(".utags_modal_content ul.utags_select_list li")
            if (next) {
              next.scrollIntoView({ block: "end" })
              removeAllActive()
              addClass(next, "utags_active")
            }
          }
          break
        }
        case "ArrowUp": {
          stopEventPropagation(event)
          input.focus()
          current = $(
            ".utags_modal_content ul.utags_select_list .utags_active,.utags_modal_content ul.utags_select_list .utags_active2"
          )
          if (current) {
            const previous = current.previousElementSibling
            if (previous) {
              previous.scrollIntoView({ block: "end" })
              removeAllActive()
              addClass(previous, "utags_active")
            }
          }
          break
        }
        case "ArrowLeft": {
          stopEventPropagation(event)
          input.focus()
          current = $(
            ".utags_modal_content ul.utags_select_list .utags_active,.utags_modal_content ul.utags_select_list .utags_active2"
          )
          if (current) {
            const parentElement = current.parentElement
            const index = Array.prototype.indexOf.call(
              parentElement.children,
              current
            )
            const parentPrevious = getPreviousList(parentElement)
            if (parentPrevious) {
              removeAllActive()
              const newIndex = Math.min(
                parentPrevious.children.length - 1,
                index
              )
              const next = parentPrevious.children[newIndex]
              next.scrollIntoView({ block: "end" })
              addClass(next, "utags_active")
            }
          }
          break
        }
        case "ArrowRight": {
          stopEventPropagation(event)
          input.focus()
          current = $(
            ".utags_modal_content ul.utags_select_list .utags_active,.utags_modal_content ul.utags_select_list .utags_active2"
          )
          if (current) {
            const parentElement = current.parentElement
            const index = Array.prototype.indexOf.call(
              parentElement.children,
              current
            )
            const parentNext = getNextList(parentElement)
            if (parentNext) {
              removeAllActive()
              const newIndex = Math.min(parentNext.children.length - 1, index)
              const next = parentNext.children[newIndex]
              next.scrollIntoView({ block: "end" })
              addClass(next, "utags_active")
            }
          }
          break
        }
        default: {
          removeAllActive()
          break
        }
      }
    }
    addEventListener(input, "keydown", keydonwHandler, true)
    addEventListener(doc, "keydown", keydonwHandler, true)
    const mousedownHandler = (event) => {
      if (event.defaultPrevented || !$(".utags_modal_content")) {
        return
      }
      const target = event.target
      if (!target) {
        return
      }
      if (target.closest(".utags_modal_content")) {
        if (target === input) {
          return
        }
        event.preventDefault()
        input.focus()
      } else {
        event.preventDefault()
        input.focus()
      }
    }
    addEventListener(doc, "mousedown", mousedownHandler, true)
    const clickHandler = (event) => {
      if (event.defaultPrevented || !$(".utags_modal_content")) {
        return
      }
      const target = event.target
      if (!target) {
        return
      }
      if (!target.closest(".utags_modal_content button")) {
        stopEventPropagation(event)
      }
      if (target.closest(".utags_modal_content")) {
        input.focus()
        if (target.closest(".utags_modal_content ul.utags_select_list li")) {
          onSelect(target.textContent, input)
        }
        if (target.closest(".utags_modal_content ul.utags_current_tags li a")) {
          removeTag(target.dataset.utags_tag)
        }
      } else {
        closeModal2()
      }
    }
    addEventListener(doc, "click", clickHandler, true)
    const mouseoverHandler = (event) => {
      const target = event.target
      if (!(target == null ? void 0 : target.closest(".utags_modal_content"))) {
        return
      }
      const li = target.closest("ul.utags_select_list li")
      if (li) {
        removeAllActive()
        addClass(li, "utags_active2")
      } else {
        removeAllActive(2)
      }
    }
    addEventListener(doc, "mousemove", mouseoverHandler, true)
  }
  async function advancedPrompt(message, value) {
    pinnedTags = await getPinnedTags()
    mostUsedTags = await getMostUsedTags()
    recentAddedTags = await getRecentAddedTags()
    emojiTags = await getEmojiTags()
    currentTags = new Set(splitTags(value))
    return new Promise((resolve) => {
      createPromptView(message, value, resolve)
    })
  }
  async function simplePrompt(message, value) {
    return prompt(message, value)
  }
  var numberLimitOfShowAllUtagsInArea = 10
  var lastShownArea
  function hideAllUtagsInArea(target) {
    const element = $(".utags_show_all")
    if (!element) {
      return
    }
    if (element === target || element.contains(target)) {
      return
    }
    if (!target) {
      lastShownArea = void 0
    }
    for (const element2 of $$(".utags_show_all")) {
      addClass(element2, "utags_hide_all")
      removeClass(element2, "utags_show_all")
      setTimeout(() => {
        removeClass(element2, "utags_hide_all")
      })
    }
  }
  function showAllUtagsInArea(element) {
    if (!element) {
      return false
    }
    const utags = $$(".utags_ul", element)
    if (utags.length > 0 && utags.length <= numberLimitOfShowAllUtagsInArea) {
      addClass(element, "utags_show_all")
      return true
    }
    return false
  }
  function bindDocumentEvents() {
    const eventType = isTouchScreen() ? "touchstart" : "click"
    addEventListener(
      doc,
      eventType,
      (event) => {
        let target = event.target
        if (!target) {
          return
        }
        if (target.closest(".utags_prompt")) {
          return
        }
        if (target.closest(".utags_ul")) {
          const captainTag = target.closest(
            ".utags_captain_tag,.utags_captain_tag2"
          )
          const textTag = target.closest(".utags_text_tag")
          if (captainTag) {
            event.preventDefault()
            event.stopPropagation()
            event.stopImmediatePropagation()
            if (!captainTag.dataset.utags_key) {
              return
            }
            setTimeout(async () => {
              const key = captainTag.dataset.utags_key
              const tags = captainTag.dataset.utags_tags
              const meta = captainTag.dataset.utags_meta
                ? JSON.parse(captainTag.dataset.utags_meta)
                : void 0
              const myPrompt = getSettingsValue("useSimplePrompt")
                ? simplePrompt
                : advancedPrompt
              const newTags = await myPrompt(i2("prompt.addTags"), tags)
              captainTag.focus()
              if (key && newTags != void 0) {
                const emojiTags3 = await getEmojiTags()
                const newTagsArray = sortTags(splitTags(newTags), emojiTags3)
                await saveTags(key, newTagsArray, meta)
              }
            })
          } else if (textTag) {
            event.stopPropagation()
            event.stopImmediatePropagation()
          }
          return
        }
        hideAllUtagsInArea(target)
        const targets = []
        do {
          targets.push(target)
          target = target.parentElement
        } while (targets.length <= 8 && target)
        while (targets.length > 0) {
          const area = targets.pop()
          if (showAllUtagsInArea(area)) {
            if (lastShownArea === area) {
              hideAllUtagsInArea()
              return
            }
            lastShownArea = area
            return
          }
        }
        lastShownArea = void 0
      },
      true
    )
    addEventListener(
      doc,
      "keydown",
      (event) => {
        if (event.defaultPrevented) {
          return
        }
        if (event.key === "Escape" && $(".utags_show_all")) {
          hideAllUtagsInArea()
          event.preventDefault()
        }
      },
      true
    )
  }
  function extendHistoryApi2() {
    let url = location.href
    setInterval(() => {
      const url2 = location.href
      if (url !== url2) {
        url = url2
        window.dispatchEvent(new Event("locationchange"))
      }
    }, 100)
  }
  function bindWindowEvents() {
    extendHistoryApi()
    extendHistoryApi2()
    addEventListener(window, "locationchange", function () {
      hideAllUtagsInArea()
    })
  }
  var getCanonicalUrl = (url) =>
    deleteUrlParameters(url, ["utm_campaign", "utm_source", "utm_medium"])
  var site = {
    matches: /.*/,
    matchedNodesSelectors: ["a[href]:not(.utags_text_tag)"],
    excludeSelectors: [".browser_extension_settings_container", "a a"],
    getCanonicalUrl,
  }
  var default_default = site
  function getCanonicalUrl2(url) {
    if (url.startsWith("https://links.pipecraft")) {
      url = url.replace("https://links.pipecraft.net/", "https://")
    }
    if (url.includes("v2ex.com")) {
      return url
        .replace(/[?#].*/, "")
        .replace(/(\w+\.)?v2ex.com/, "www.v2ex.com")
    }
    if (url.includes("v2ex.co")) {
      return url
        .replace(/[?#].*/, "")
        .replace(/(\w+\.)?v2ex.co/, "www.v2ex.com")
    }
    return url
  }
  function cloneWithoutCitedReplies(element) {
    const newElement = element.cloneNode(true)
    for (const cell of $$(".cell", newElement)) {
      cell.remove()
    }
    return newElement
  }
  var site2 = {
    matches: /v2ex\.com|v2hot\.|v2ex\.co/,
    listNodesSelectors: [".box .cell", ".my-box .comment"],
    conditionNodesSelectors: [
      ".box .cell .topic-link",
      ".item_hot_topic_title a",
      '.box .cell .topic_info strong:first-of-type a[href*="/member/"]',
      ".box .cell .topic_info .node",
      '.box .cell strong a.dark[href*="/member/"]',
      ".box .cell .ago a",
      ".box .cell .fade.small a",
      ".comment .username",
      ".comment .ago",
    ],
    matchedNodesSelectors: [
      'a[href*="/t/"]',
      'a[href*="/member/"]',
      'a[href*="/go/"]',
      'a[href^="https://"]:not([href*="v2ex.com"])',
      'a[href^="http://"]:not([href*="v2ex.com"])',
    ],
    excludeSelectors: [
      ...default_default.excludeSelectors,
      ".utags_text_tag",
      ".site-nav a",
      ".cell_tabs a",
      ".tab-alt-container a",
      "#SecondaryTabs a",
      "a.page_normal,a.page_current",
      "a.count_livid",
      ".post-item a.post-content",
    ],
    addExtraMatchedNodes(matchedNodesSet) {
      if (location.pathname.includes("/member/")) {
        const profile = $(".content h1")
        if (profile) {
          const username = profile.textContent
          if (username) {
            const key = "https://www.v2ex.com/member/".concat(username)
            const meta = { title: username, type: "user" }
            profile.utags = { key, meta }
            matchedNodesSet.add(profile)
          }
        }
      }
      if (location.pathname.includes("/t/")) {
        const header = $(".header h1")
        if (header) {
          const key = getCanonicalUrl2(
            "https://www.v2ex.com" + location.pathname
          )
          const title = $("h1").textContent
          const meta = { title, type: "topic" }
          header.utags = { key, meta }
          matchedNodesSet.add(header)
        }
        const main2 = $("#Main") || $(".content")
        const replyElements = $$(
          '.box .cell[id^="r_"],.box .cell[id^="related_r_"]',
          main2
        )
        for (const reply of replyElements) {
          const replyId = reply.id.replace("related_", "")
          const floorNoElement = $(".no", reply)
          const replyContentElement = $(".reply_content", reply)
          const agoElement = $(".ago,.fade.small", reply)
          if (replyId && floorNoElement && replyContentElement && agoElement) {
            let newAgoElement = $("a", agoElement)
            if (!newAgoElement) {
              newAgoElement = createElement("a", {
                textContent: agoElement.textContent,
                href: "#" + replyId,
              })
              agoElement.textContent = ""
              agoElement.append(newAgoElement)
            }
            const floorNo = parseInt10(floorNoElement.textContent, 1)
            const pageNo = Math.floor((floorNo - 1) / 100) + 1
            const key =
              getCanonicalUrl2("https://www.v2ex.com" + location.pathname) +
              "?p=" +
              String(pageNo) +
              "#" +
              replyId
            const title =
              cloneWithoutCitedReplies(replyContentElement).textContent
            const meta = { title, type: "reply" }
            newAgoElement.utags = { key, meta }
            matchedNodesSet.add(newAgoElement)
          }
        }
      }
      if (location.pathname.includes("/go/")) {
        const header = $(".cell_ops.flex-one-row input")
        if (header) {
          const key = getCanonicalUrl2(
            "https://www.v2ex.com" + location.pathname
          )
          const title = document.title.replace(/.*›\s*/, "").trim()
          const meta = { title, type: "node" }
          header.utags = { key, meta }
          matchedNodesSet.add(header)
        }
      }
    },
    getCanonicalUrl: getCanonicalUrl2,
  }
  var v2ex_default = site2
  var greasyfork_org_default =
    ":not(#a):not(#b):not(#c) .discussion-title+.utags_ul_0{display:block !important;height:0}:not(#a):not(#b):not(#c) .discussion-title+.utags_ul_0 .utags_captain_tag{top:-26px;background-color:rgba(255,255,255,.8666666667) !important}:not(#a):not(#b):not(#c) .discussion-title+.utags_ul_1{display:block !important;margin-top:-12px !important;margin-bottom:8px !important}:not(#a):not(#b):not(#c) .discussion-meta .script-link+.utags_ul_0{display:block !important;height:0}:not(#a):not(#b):not(#c) .discussion-meta .script-link+.utags_ul_0 .utags_captain_tag{top:-22px;background-color:rgba(255,255,255,.8666666667) !important}"
  function getScriptUrl(url) {
    return getCanonicalUrl3(url.replace(/(scripts\/\d+)(.*)/, "$1"))
  }
  function getCanonicalUrl3(url) {
    if (/(greasyfork|sleazyfork)\.org/.test(url)) {
      url = url.replace(
        /((greasyfork|sleazyfork)\.org\/)(\w{2}(-\w{2})?)(\/|$)/,
        "$1"
      )
      if (url.includes("/scripts/")) {
        return url.replace(/(scripts\/\d+)([^/]*)/, "$1")
      }
      if (url.includes("/users/")) {
        return url.replace(/(users\/\d+)(.*)/, "$1")
      }
    }
    return url
  }
  var site3 = {
    matches: /(greasyfork|sleazyfork)\.org/,
    listNodesSelectors: [".script-list > li", ".discussion-list-container"],
    conditionNodesSelectors: [
      ".script-list li .script-link",
      ".script-list li .script-list-author a",
      ".discussion-list-container .script-link",
      ".discussion-list-container .discussion-title",
      ".discussion-list-container .discussion-meta-item:nth-child(2) > a",
    ],
    matchedNodesSelectors: ["a[href]:not(.utags_text_tag)"],
    excludeSelectors: [
      ...default_default.excludeSelectors,
      ".sidebar",
      ".pagination",
      ".sign-out-link,.sign-in-link",
      ".with-submenu",
      "#script-links.tabs",
      "#install-area",
      ".history_versions .version-number",
      'a[href*="show_all_versions"]',
      'a[href*="/reports/new"]',
      'a[href*="/conversations/new"]',
      'a[href*="/discussions/mark_all_read"]',
      'a[href*="/discussions/new"]',
      "div.sidebarred-main-content > p:nth-child(3) > a",
    ],
    addExtraMatchedNodes(matchedNodesSet) {
      if (location.pathname.includes("/scripts/")) {
        const element = $("#script-info header h2")
        if (element) {
          const title = element.textContent
          if (title) {
            const key = getScriptUrl(location.href)
            const meta = { title }
            element.utags = { key, meta }
            matchedNodesSet.add(element)
          }
        }
      } else if (location.pathname.includes("/users/")) {
        const element = $("#about-user h2")
        if (element) {
          const title = element.textContent
          if (title) {
            const key = getCanonicalUrl3(location.href)
            const meta = { title }
            element.utags = { key, meta }
            matchedNodesSet.add(element)
          }
        }
      }
    },
    getCanonicalUrl: getCanonicalUrl3,
    getStyle: () => greasyfork_org_default,
  }
  var greasyfork_org_default2 = site3
  function cloneComment(element) {
    const newElement = element.cloneNode(true)
    for (const node of $$(".reply", newElement)) {
      node.remove()
    }
    return newElement
  }
  var site4 = {
    matches: /news\.ycombinator\.com/,
    listNodesSelectors: [".script-list li", ".discussion-list-container"],
    conditionNodesSelectors: [],
    matchedNodesSelectors: ["a[href]:not(.utags_text_tag)"],
    excludeSelectors: [
      ...default_default.excludeSelectors,
      ".pagetop",
      ".morelink",
      ".hnpast",
      ".clicky",
      ".navs > a",
      'a[href^="login"]',
      'a[href^="logout"]',
      'a[href^="forgot"]',
      'a[href^="vote"]',
      'a[href^="submit"]',
      'a[href^="hide"]',
      'a[href^="fave"]',
      'a[href^="reply"]',
      'a[href^="context"]',
      'a[href^="newcomments"]',
      'a[href^="#"]',
      '.subline > a[href^="item"]',
    ],
    addExtraMatchedNodes(matchedNodesSet) {
      if (location.pathname === "/item") {
        const comments = $$(".comment-tree .comtr[id]")
        for (const comment of comments) {
          const commentText = $(".commtext", comment)
          const target = $(".age a", comment)
          if (commentText && target) {
            const key = target.href
            const title = cloneComment(commentText).textContent
            if (key && title) {
              const meta = { title, type: "comment" }
              target.utags = { key, meta }
              matchedNodesSet.add(target)
            }
          }
        }
        const fatitem = $(".fatitem")
        if (fatitem) {
          const titleElement = $(".titleline a", fatitem)
          const commentText = titleElement || $(".commtext", fatitem)
          const type = titleElement ? "topic" : "comment"
          const target = $(".age a", fatitem)
          if (commentText && target) {
            const key = target.href
            const title = cloneComment(commentText).textContent
            if (key && title) {
              const meta = { title, type }
              target.utags = { key, meta }
              matchedNodesSet.add(target)
            }
          }
        }
      } else if (location.pathname === "/newcomments") {
        const comments = $$(".athing[id]")
        for (const comment of comments) {
          const commentText = $(".commtext", comment)
          const target = $(".age a", comment)
          if (commentText && target) {
            const key = target.href
            const title = cloneComment(commentText).textContent
            if (key && title) {
              const meta = { title, type: "comment" }
              target.utags = { key, meta }
              matchedNodesSet.add(target)
            }
          }
        }
      } else {
        const topics = $$(".athing[id]")
        for (const topic of topics) {
          const titleElement = $(".titleline a", topic)
          const subtext = topic.nextElementSibling
          if (subtext) {
            const target = $(".age a", subtext)
            if (titleElement && target) {
              const key = target.href
              const title = titleElement.textContent
              if (key && title) {
                const meta = { title, type: "topic" }
                target.utags = { key, meta }
                matchedNodesSet.add(target)
              }
            }
          }
        }
      }
    },
  }
  var news_ycombinator_com_default = site4
  var site5 = {
    matches: /lobste\.rs|dto\.pipecraft\.net|tilde\.news|journalduhacker\.net/,
    listNodesSelectors: [],
    conditionNodesSelectors: [],
    matchedNodesSelectors: ["a[href]:not(.utags_text_tag)"],
    excludeSelectors: [
      ...default_default.excludeSelectors,
      "#nav",
      "#header",
      "#subnav",
      ".mobile_comments",
      ".description_present",
      ".morelink",
      ".user_tree",
      ".dropdown_parent",
      'a[href^="/login"]',
      'a[href^="/logout"]',
      'a[href^="/u#"]',
      'a[href$="/save"]',
      'a[href$="/hide"]',
      'a[href$="/suggest"]',
    ],
  }
  var lobste_rs_default = site5
  var github_com_default =
    ':not(#a):not(#b):not(#c) .search-title .utags_ul_0,:not(#a):not(#b):not(#c) .d-flex.flex-justify-between a[href^="/topics/"]+.utags_ul_0,:not(#a):not(#b):not(#c) .d-md-flex.flex-justify-between a[href^="/topics/"].d-flex+.utags_ul_0,:not(#a):not(#b):not(#c) [id=user-starred-repos] a[href^="/topics/"].flex-items-center+.utags_ul_0,:not(#a):not(#b):not(#c) ul.f4 a[href^="/topics/"].d-flex+.utags_ul_0{--utags-notag-ul-disply: var(--utags-notag-ul-disply-4);--utags-notag-ul-height: var(--utags-notag-ul-height-4);--utags-notag-ul-position: var(--utags-notag-ul-position-4);--utags-notag-ul-top: var(--utags-notag-ul-top-4);--utags-notag-captain-tag-top: var(--utags-notag-captain-tag-top-4);--utags-notag-captain-tag-left: var(--utags-notag-captain-tag-left-4);--utags-captain-tag-background-color: var( --utags-captain-tag-background-color-overlap )}:not(#a):not(#b):not(#c) .search-title .utags_ul_0{--utags-notag-captain-tag-top: -10px}:not(#a):not(#b):not(#c) .d-flex.flex-justify-between a[href^="/topics/"]+.utags_ul_0{--utags-notag-captain-tag-top: 6px;--utags-notag-captain-tag-left: 76px}:not(#a):not(#b):not(#c) .d-md-flex.flex-justify-between a[href^="/topics/"].d-flex+.utags_ul_0{--utags-notag-captain-tag-top: 20px;--utags-notag-captain-tag-left: 76px}:not(#a):not(#b):not(#c) ul.f4 a[href^="/topics/"].d-flex+.utags_ul_0{--utags-notag-captain-tag-top: -24px;--utags-notag-captain-tag-left: -2px}:not(#a):not(#b):not(#c) div[id=repo-title-component] strong[itemprop=name] a+.utags_ul_0{--utags-notag-ul-disply: var(--utags-notag-ul-disply-4);--utags-notag-ul-height: var(--utags-notag-ul-height-4);--utags-notag-ul-position: var(--utags-notag-ul-position-4);--utags-notag-ul-top: var(--utags-notag-ul-top-4);--utags-notag-captain-tag-top: var(--utags-notag-captain-tag-top-4);--utags-notag-captain-tag-left: var(--utags-notag-captain-tag-left-4)}'
  var noneUsers = /* @__PURE__ */ new Set([
    "about",
    "pricing",
    "security",
    "login",
    "logout",
    "signup",
    "explore",
    "topics",
    "trending",
    "collections",
    "events",
    "sponsors",
    "features",
    "enterprise",
    "team",
    "customer-stories",
    "readme",
    "premium-support",
    "sitemap",
    "git-guides",
    "open-source",
    "marketplace",
    "codespaces",
    "issues",
    "pulls",
    "discussions",
    "dashboard",
    "account",
    "new",
    "notifications",
    "settings",
    "feedback",
    "organizations",
    "github-copilot",
    "search",
  ])
  var prefix2 = "https://github.com/"
  function getUserProfileUrl(href) {
    if (href.startsWith(prefix2)) {
      const href2 = href.slice(19)
      let username = ""
      if (/^[\w-]+$/.test(href2)) {
        username = /^([\w-]+)$/.exec(href2)[1]
      }
      if (/(author%3A|author=)[\w-]+/.test(href2)) {
        username = /(author%3A|author=)([\w-]+)/.exec(href2)[2]
      }
      if (username && !noneUsers.has(username)) {
        return prefix2 + username
      }
    }
    return void 0
  }
  function getRepoUrl(href) {
    if (href.startsWith(prefix2)) {
      const href2 = href.slice(19)
      if (/^[\w-]+\/[\w-.]+(\?.*)?$/.test(href2)) {
        const username = /^([\w-]+)/.exec(href2)[1]
        if (username && !noneUsers.has(username)) {
          return prefix2 + href2.replace(/(^[\w-]+\/[\w-.]+).*/, "$1")
        }
      }
    }
    return void 0
  }
  function getTopicsUrl(href) {
    if (href.startsWith(prefix2)) {
      const href2 = href.slice(19)
      if (/^topics\/[\w-.]+(\?.*)?$/.test(href2)) {
        return prefix2 + href2.replace(/(^topics\/[\w-.]+).*/, "$1")
      }
    }
    return void 0
  }
  function getIssuesUrl(href) {
    if (href.startsWith(prefix2)) {
      const href2 = href.slice(19)
      if (
        /^[\w-]+\/[\w-.]+\/(issues|pull|discussions)\/\d+(\?.*)?$/.test(href2)
      ) {
        const username = /^([\w-]+)/.exec(href2)[1]
        if (username && !noneUsers.has(username)) {
          return (
            prefix2 +
            href2.replace(
              /(^[\w-]+\/[\w-.]+\/(issues|pull|discussions)\/\d+).*/,
              "$1"
            )
          )
        }
      }
    }
    return void 0
  }
  var site6 = {
    matches: /github\.com/,
    listNodesSelectors: [],
    conditionNodesSelectors: [],
    getMatchedNodes() {
      return $$("a[href]:not(.utags_text_tag)").filter((element) => {
        const href = element.href
        if (href.startsWith(prefix2)) {
          if (/since|until/.test(href)) {
            return false
          }
          let key = getUserProfileUrl(href)
          if (key) {
            const username = /^https:\/\/github\.com\/([\w-]+)$/.exec(key)[1]
            const title = username
            const meta = { title, type: "user" }
            element.utags = { key, meta }
            return true
          }
          key = getRepoUrl(href)
          if (key) {
            const title = key.replace(prefix2, "")
            const meta = { title, type: "repo" }
            element.utags = { key, meta }
            return true
          }
          key = getTopicsUrl(href)
          if (key) {
            const text = element.textContent.trim()
            if (text === "#") {
              return false
            }
            const title = "#" + key.replace(prefix2 + "topics/", "")
            const meta = { title, type: "topic" }
            element.utags = { key, meta }
            return true
          }
          key = getIssuesUrl(href)
          if (key) {
            const meta = { type: "issue" }
            element.utags = { key, meta }
            return true
          }
          return false
        }
        return true
      })
    },
    excludeSelectors: [
      ...default_default.excludeSelectors,
      'section[aria-label~="User"] .Link--secondary',
      ".Popover-message .Link--secondary",
      ".IssueLabel",
      ".subnav-links",
      ".btn",
      ".filter-item",
      ".js-github-dev-shortcut",
      ".js-github-dev-new-tab-shortcut",
      ".js-skip-to-content",
    ],
    validMediaSelectors: ["svg.octicon-repo"],
    getStyle: () => github_com_default,
  }
  var github_com_default2 = site6
  var reddit_com_default =
    '\uFEFF#TOFIX_uFEFF{display:block}:not(#a):not(#b):not(#c) a+.utags_ul_0{object-position:200% 50%;--utags-notag-ul-disply: var(--utags-notag-ul-disply-5);--utags-notag-ul-height: var(--utags-notag-ul-height-5);--utags-notag-ul-position: var(--utags-notag-ul-position-5);--utags-notag-ul-top: var(--utags-notag-ul-top-5);--utags-notag-captain-tag-top: var(--utags-notag-captain-tag-top-5);--utags-notag-captain-tag-left: var(--utags-notag-captain-tag-left-5);--utags-captain-tag-background-color: var( --utags-captain-tag-background-color-overlap )}:not(#a):not(#b):not(#c) a+.utags_ul_1{object-position:0% 200%}:not(#a):not(#b):not(#c) shreddit-comment [slot=commentMeta]{position:relative}:not(#a):not(#b):not(#c) [data-testid=user-hover-card]{position:relative}:not(#a):not(#b):not(#c) div[slot=content]{position:relative}:not(#a):not(#b):not(#c) div[slot=comment]{position:relative}:not(#a):not(#b):not(#c) article:hover a[slot=title]+.utags_ul .utags_captain_tag,:not(#a):not(#b):not(#c) [slot=post-media-container]:hover a+.utags_ul .utags_captain_tag{opacity:100%;width:calc(var(--utags-captain-tag-size) + 8px) !important;height:calc(var(--utags-captain-tag-size) + 8px) !important;padding:5px 4px 4px 5px !important;transition:all 0s .1s !important;z-index:0}:not(#a):not(#b):not(#c) article a[slot=title][data-utags_fit_content="1"],:not(#a):not(#b):not(#c) recent-posts a[data-utags_fit_content="1"]{min-width:unset !important;width:fit-content !important}:not(#a):not(#b):not(#c) article a[slot=title][data-utags_fit_content="1"] *:not(svg),:not(#a):not(#b):not(#c) recent-posts a[data-utags_fit_content="1"] *:not(svg){width:fit-content !important}:not(#a):not(#b):not(#c) article a[slot=title]+.utags_ul_0,:not(#a):not(#b):not(#c) recent-posts a+.utags_ul_0{object-position:100% 50%}:not(#a):not(#b):not(#c) article a[slot=title]+.utags_ul_1,:not(#a):not(#b):not(#c) recent-posts a+.utags_ul_1{object-position:0% 200%;position:absolute;top:-9999px;margin-top:-4px !important;margin-left:0px !important}:not(#a):not(#b):not(#c) [data-utags_list_node*=",hide,"],:not(#a):not(#b):not(#c) [data-utags_list_node*=",\u9690\u85CF,"],:not(#a):not(#b):not(#c) [data-utags_list_node*=",\u5C4F\u853D,"],:not(#a):not(#b):not(#c) [data-utags_list_node*=",\u4E0D\u518D\u663E\u793A,"],:not(#a):not(#b):not(#c) [data-utags_list_node*=",block,"]{opacity:1%;display:block !important}'
  var prefix3 = "https://www.reddit.com/"
  function getUserProfileUrl2(url, exact = false) {
    if (url.startsWith(prefix3)) {
      const href2 = url.slice(prefix3.length)
      if (exact) {
        if (/^(user|u)\/[\w-]+\/?([?#].*)?$/.test(href2)) {
          return (
            prefix3 +
            "user/" +
            href2.replace(/^(user|u)\/([\w-]+).*/, "$2") +
            "/"
          )
        }
      } else if (/^(user|u)\/[\w-]+/.test(href2)) {
        return (
          prefix3 + "user/" + href2.replace(/^(user|u)\/([\w-]+).*/, "$2") + "/"
        )
      }
    }
    return void 0
  }
  function getCommunityUrl(url, exact = false) {
    if (url.startsWith(prefix3)) {
      const href2 = url.slice(prefix3.length)
      if (exact) {
        if (/^r\/\w+\/?(#.*)?$/.test(href2)) {
          return prefix3 + href2.replace(/^(r\/\w+).*/, "$1") + "/"
        }
      } else if (/^r\/\w+/.test(href2)) {
        return prefix3 + href2.replace(/^(r\/\w+).*/, "$1") + "/"
      }
    }
    return void 0
  }
  function getCommentsUrl(url, exact = false) {
    if (url.startsWith(prefix3)) {
      const href2 = url.slice(prefix3.length)
      if (exact) {
        if (/^(r\/\w+\/comments\/\w+(\/([^/]*\/?)?)?)$/.test(href2)) {
          return (
            prefix3 +
            href2.replace(/^(r\/\w+\/comments\/\w+(\/([^/]*)?)?).*/, "$1") +
            "/"
          )
        }
      } else if (/^(r\/\w+\/comments\/\w+(\/([^/]*)?)?).*/.test(href2)) {
        return (
          prefix3 +
          href2.replace(/^(r\/\w+\/comments\/\w+(\/([^/]*)?)?).*/, "$1") +
          "/"
        )
      }
    }
    return void 0
  }
  var site7 = {
    matches: /reddit\.com/,
    listNodesSelectors: [
      "shreddit-feed article",
      "shreddit-feed shreddit-ad-post",
      "shreddit-comment",
    ],
    conditionNodesSelectors: [
      'shreddit-feed article a[data-testid="subreddit-name"]',
      'shreddit-feed article a[slot="title"]',
      'shreddit-feed article [slot="authorName"] a',
      "shreddit-feed shreddit-ad-post a",
      "shreddit-comment faceplate-hovercard a",
    ],
    getMatchedNodes() {
      return $$("a[href]:not(.utags_text_tag)").filter((element) => {
        const href = element.href
        if (!href.startsWith(prefix3)) {
          return true
        }
        if ($("time,faceplate-number", element)) {
          return false
        }
        let key = getUserProfileUrl2(href, true)
        if (key) {
          const title = element.textContent.trim()
          if (!title) {
            return false
          }
          const meta = { type: "user", title }
          element.utags = { key, meta }
          element.dataset.utags = element.dataset.utags || ""
          return true
        }
        key = getCommunityUrl(href, true)
        if (key) {
          const title = element.textContent.trim()
          if (!title) {
            return false
          }
          const meta = { type: "community", title }
          element.utags = { key, meta }
          element.dataset.utags = element.dataset.utags || ""
          return true
        }
        key = getCommentsUrl(href, true)
        if (key) {
          const title = element.textContent.trim()
          if (!title) {
            return false
          }
          const meta = { type: "comments", title }
          element.utags = { key, meta }
          element.dataset.utags = element.dataset.utags || ""
          return true
        }
        return true
      })
    },
    excludeSelectors: [
      ...default_default.excludeSelectors,
      'a[data-testid="comment_author_icon"]',
      "#shreddit-skip-link",
      'a[slot="text-body"]',
      'a[slot="full-post-link"]',
      '[slot="post-media-container"] a.inset-0',
      '[bundlename="shreddit_sort_dropdown"]',
      '[slot="tabs"]',
    ],
    addExtraMatchedNodes(matchedNodesSet) {
      let element = $('[data-testid="profile-main"] .w-full p')
      if (element) {
        const title = element.textContent.trim()
        const key = getUserProfileUrl2(location.href)
        if (title && key) {
          const meta = { title, type: "user" }
          element.utags = { key, meta }
          matchedNodesSet.add(element)
        }
      }
      element = $(".w-full h1")
      if (element) {
        const title = element.textContent.trim()
        const key = getCommunityUrl(location.href)
        if (title && key) {
          const meta = { title, type: "community" }
          element.utags = { key, meta }
          matchedNodesSet.add(element)
        }
      }
      element = $('h1[slot="title"]')
      if (element) {
        const title = element.textContent.trim()
        const key = getCommentsUrl(location.href, true)
        if (title && key) {
          const meta = { title, type: "comments" }
          element.utags = { key, meta }
          matchedNodesSet.add(element)
        }
      }
    },
    getStyle: () => reddit_com_default,
    postProcess() {
      setTimeout(() => {
        for (const element of $$(
          '[data-utags_list_node*=",hide,"],\n    [data-utags_list_node*=",\u9690\u85CF,"],\n    [data-utags_list_node*=",\u5C4F\u853D,"],\n    [data-utags_list_node*=",\u4E0D\u518D\u663E\u793A,"],\n    [data-utags_list_node*=",block,"]'
        )) {
          element.setAttribute("collapsed", "")
        }
      }, 1e3)
    },
  }
  var reddit_com_default2 = site7
  var twitter_com_default =
    ":not(#a):not(#b):not(#c) a+.utags_ul_0{object-position:200% 50%;--utags-notag-ul-disply: var(--utags-notag-ul-disply-5);--utags-notag-ul-height: var(--utags-notag-ul-height-5);--utags-notag-ul-position: var(--utags-notag-ul-position-5);--utags-notag-ul-top: var(--utags-notag-ul-top-5);--utags-notag-captain-tag-top: var(--utags-notag-captain-tag-top-5);--utags-notag-captain-tag-left: var(--utags-notag-captain-tag-left-5);--utags-captain-tag-background-color: var( --utags-captain-tag-background-color-overlap )}:not(#a):not(#b):not(#c) .css-175oi2r.r-xoduu5:hover{z-index:2 !important}:not(#a):not(#b):not(#c) [data-testid=User-Name]:hover .utags_ul .utags_captain_tag,:not(#a):not(#b):not(#c) [data-testid=HoverCard]:hover .utags_ul .utags_captain_tag,:not(#a):not(#b):not(#c) [data-testid=UserCell]:hover .utags_ul .utags_captain_tag{opacity:100%;width:calc(var(--utags-captain-tag-size) + 8px) !important;height:calc(var(--utags-captain-tag-size) + 8px) !important;padding:5px 4px 4px 5px !important;transition:all 0s .1s !important;z-index:0}"
  var prefix4 = "https://x.com/"
  var prefix22 = "https://twitter.com/"
  var site8 = {
    matches: /x\.com|twitter\.com/,
    listNodesSelectors: ['[data-testid="cellInnerDiv"]'],
    conditionNodesSelectors: [
      '[data-testid="cellInnerDiv"] [data-testid="User-Name"] a',
    ],
    getMatchedNodes() {
      return $$("a[href]:not(.utags_text_tag)").filter((element) => {
        const href = element.href
        if (href.startsWith(prefix4) || href.startsWith(prefix22)) {
          const href2 = href.startsWith(prefix22)
            ? href.slice(20)
            : href.slice(14)
          if (/^\w+$/.test(href2)) {
            if (
              /^(home|explore|notifications|messages|tos|privacy)$/.test(href2)
            ) {
              return false
            }
            const textContent = element.textContent || ""
            if (!textContent.startsWith("@")) {
              return false
            }
            const parent = element.parentElement
            setStyle(parent, { zIndex: "1" })
            const meta = { type: "user" }
            element.utags = { meta }
            return true
          }
        }
        return false
      })
    },
    excludeSelectors: [...default_default.excludeSelectors],
    addExtraMatchedNodes(matchedNodesSet) {
      const elements = $$('[data-testid="UserName"] span')
      for (const element of elements) {
        const title = element.textContent.trim()
        if (!title || !title.startsWith("@")) {
          continue
        }
        const key = prefix4 + title.slice(1)
        const meta = { title, type: "user" }
        element.utags = { key, meta }
        matchedNodesSet.add(element)
      }
    },
    getStyle: () => twitter_com_default,
  }
  var twitter_com_default2 = site8
  function getCanonicalUrl4(url) {
    if (url.startsWith("http://mp.weixin.qq.com")) {
      url = url.replace(/^http:/, "https:")
    }
    if (url.startsWith("https://mp.weixin.qq.com/s/")) {
      url = url.replace(/(\/s\/[\w-]+).*/, "$1")
    }
    if (url.startsWith("https://mp.weixin.qq.com/") && url.includes("#")) {
      url = url.replace(/#.*/, "")
    }
    return url
  }
  var site9 = {
    matches: /mp\.weixin\.qq\.com/,
    matchedNodesSelectors: ["a[href]:not(.utags_text_tag)"],
    excludeSelectors: [...default_default.excludeSelectors],
    addExtraMatchedNodes(matchedNodesSet) {
      const element = $("h1.rich_media_title")
      if (element) {
        const title = element.textContent.trim()
        if (title) {
          const key = getCanonicalUrl4(location.href)
          const meta = { title }
          element.utags = { key, meta }
          matchedNodesSet.add(element)
        }
      }
    },
    getCanonicalUrl: getCanonicalUrl4,
  }
  var mp_weixin_qq_com_default = site9
  var instagram_com_default =
    ":not(#a):not(#b):not(#c) [data-utags_node_type=notag_relative]+.utags_ul_0 .utags_captain_tag{position:relative !important;width:14px !important;height:14px !important;padding:1px 0 0 1px !important}"
  var site10 = {
    matches: /instagram\.com/,
    getMatchedNodes() {
      return $$("a[href]:not(.utags_text_tag)").filter((element) => {
        const href = element.href
        if (href.startsWith("https://www.instagram.com/")) {
          const href2 = href.slice(26)
          if (/^[\w.]+\/$/.test(href2)) {
            if (/^(explore|reels)\/$/.test(href2)) {
              return false
            }
            if ($("div span", element)) {
              element.dataset.utags_node_type = "notag_relative"
            }
            const meta = { type: "user" }
            element.utags = { meta }
            return true
          }
        }
        return false
      })
    },
    excludeSelectors: [...default_default.excludeSelectors],
    getStyle: () => instagram_com_default,
  }
  var instagram_com_default2 = site10
  var threads_net_default =
    ':not(#a):not(#b):not(#c) a[href^="/@"][data-utags]+.utags_ul_0{--utags-notag-ul-disply: var(--utags-notag-ul-disply-4);--utags-notag-ul-height: var(--utags-notag-ul-height-4);--utags-notag-ul-position: var(--utags-notag-ul-position-4);--utags-notag-ul-top: var(--utags-notag-ul-top-4);--utags-notag-captain-tag-top: -22px;--utags-notag-captain-tag-left: var(--utags-notag-captain-tag-left-4)}'
  function getUserProfileUrl3(url) {
    if (url.startsWith("https://www.threads.net/")) {
      const href2 = url.slice(24)
      if (/^@[\w.]+/.test(href2)) {
        return (
          "https://www.threads.net/" +
          href2.replace(/(^@[\w.]+).*/, "$1").toLowerCase()
        )
      }
    }
    return void 0
  }
  var site11 = {
    matches: /threads\.net/,
    getMatchedNodes() {
      return $$("a[href]:not(.utags_text_tag)").filter((element) => {
        const href = element.href
        if (href.startsWith("https://www.threads.net/")) {
          const href2 = href.slice(24)
          if (/^@[\w.]+$/.test(href2)) {
            const meta = { type: "user" }
            element.utags = { meta }
            return true
          }
        }
        return false
      })
    },
    excludeSelectors: [...default_default.excludeSelectors, '[role="tablist"]'],
    addExtraMatchedNodes(matchedNodesSet) {
      const element = $("h1+div>div>span,h2+div>div>span")
      if (element) {
        const title = element.textContent.trim()
        const key = getUserProfileUrl3(location.href)
        if (title && key && key === "https://www.threads.net/@" + title) {
          const meta = { title, type: "user" }
          element.utags = { key, meta }
          matchedNodesSet.add(element)
        }
      }
    },
    getStyle: () => threads_net_default,
  }
  var threads_net_default2 = site11
  var facebook_com_default =
    ":not(#a):not(#b):not(#c) a[data-utags_position]+.utags_ul_0{--utags-notag-ul-disply: var(--utags-notag-ul-disply-5);--utags-notag-ul-height: var(--utags-notag-ul-height-5);--utags-notag-ul-position: var(--utags-notag-ul-position-5);--utags-notag-ul-top: var(--utags-notag-ul-top-5);--utags-notag-captain-tag-top: 2px;--utags-notag-captain-tag-left: 22px;--utags-captain-tag-background-color: var( --utags-captain-tag-background-color-overlap )}:not(#a):not(#b):not(#c) h1+ul.utags_ul{margin-bottom:16px !important;display:inline-flex !important}"
  var prefix5 = location.origin + "/"
  function getUserProfileUrl4(href, exact = false) {
    if (href.startsWith(prefix5)) {
      const href2 = href.slice(prefix5.length).toLowerCase()
      if (href2.startsWith("profile.php")) {
        const parameters = getUrlParameters(href, ["id", "sk"])
        if (parameters.id && !parameters.sk) {
          return "https://www.facebook.com/profile.php?id=" + parameters.id
        }
      } else if (/^\d+\/?([?#].*)?$/.test(href2)) {
        return (
          "https://www.facebook.com/profile.php?id=" +
          href2.replace(/^(\d+).*/, "$1")
        )
      } else if (/^messages\/t\/\d+\/?([?#].*)?$/.test(href2)) {
        return (
          "https://www.facebook.com/profile.php?id=" +
          href2.replace(/^messages\/t\/(\d+).*/, "$1")
        )
      } else if (
        href2.startsWith("friends/requests/?profile_id=") ||
        href2.startsWith("friends/suggestions/?profile_id=")
      ) {
        const parameters = getUrlParameters(href, ["profile_id"])
        if (parameters.profile_id) {
          return (
            "https://www.facebook.com/profile.php?id=" + parameters.profile_id
          )
        }
      } else if (
        ((exact && /^[\w.]+([?#].*)?$/.test(href2)) ||
          (!exact && /^[\w.]+/.test(href2))) &&
        !/^(policies|events|ads|business|privacy|help|friends|messages|profile\.php|permalink\.php|photo\.php|\w+\.php)\b/.test(
          href2
        )
      ) {
        return "https://www.facebook.com/" + href2.replace(/(^[\w.]+).*/, "$1")
      }
    }
    return void 0
  }
  var site12 = {
    matches: /^(www|m)\.facebook\.com$/,
    getMatchedNodes() {
      return $$("a[href]:not(.utags_text_tag)").filter((element) => {
        const href = element.href
        if (
          !href.startsWith("https://www.facebook.com/") &&
          !href.startsWith("https://m.facebook.com/") &&
          !href.startsWith("https://l.facebook.com/")
        ) {
          return true
        }
        const key = getUserProfileUrl4(href, true)
        if (key) {
          const title = element.textContent.trim()
          if (!title) {
            return false
          }
          if ($("svg,img", element)) {
            element.dataset.utags_position = "LB"
          }
          const meta = { type: "user", title }
          element.utags = { key, meta }
          element.dataset.utags = element.dataset.utags || ""
          return true
        }
        return false
      })
    },
    excludeSelectors: [
      ...default_default.excludeSelectors,
      'div[data-pagelet="ProfileTabs"]',
    ],
    addExtraMatchedNodes(matchedNodesSet) {
      const element = getFirstHeadElement('div[role="main"] h1')
      if (element) {
        const title = element.textContent.trim()
        const key = getUserProfileUrl4(location.href)
        if (title && key) {
          const meta = { title, type: "user" }
          element.utags = { key, meta }
          matchedNodesSet.add(element)
        }
      }
    },
    getStyle: () => facebook_com_default,
  }
  var facebook_com_default2 = site12
  var youtube_com_default =
    ":not(#a):not(#b):not(#c) ytd-rich-item-renderer h3.ytd-rich-grid-media .utags_ul_0{--utags-notag-ul-disply: var(--utags-notag-ul-disply-2);--utags-notag-ul-height: var(--utags-notag-ul-height-2);--utags-notag-ul-position: var(--utags-notag-ul-position-2);--utags-notag-captain-tag-top: var(--utags-notag-captain-tag-top-2);--utags-notag-captain-tag-left: var(--utags-notag-captain-tag-left-2);--utags-captain-tag-background-color: var( --utags-captain-tag-background-color-overlap )}:not(#a):not(#b):not(#c) ytd-rich-item-renderer yt-formatted-string[ellipsis-truncate-styling] .utags_ul_0 .utags_captain_tag{left:-20px}:not(#a):not(#b):not(#c) ytd-video-renderer.ytd-item-section-renderer h3 .utags_ul_0,:not(#a):not(#b):not(#c) ytd-video-renderer.ytd-vertical-list-renderer h3 .utags_ul_0{--utags-notag-ul-disply: var(--utags-notag-ul-disply-2);--utags-notag-ul-height: var(--utags-notag-ul-height-2);--utags-notag-ul-position: var(--utags-notag-ul-position-2);--utags-notag-captain-tag-top: var(--utags-notag-captain-tag-top-2);--utags-notag-captain-tag-left: var(--utags-notag-captain-tag-left-2);--utags-captain-tag-background-color: var( --utags-captain-tag-background-color-overlap )}:not(#a):not(#b):not(#c) ytd-video-renderer.ytd-item-section-renderer yt-formatted-string.ytd-channel-name .utags_ul_0 .utags_captain_tag,:not(#a):not(#b):not(#c) ytd-video-renderer.ytd-vertical-list-renderer yt-formatted-string.ytd-channel-name .utags_ul_0 .utags_captain_tag{left:-20px}:not(#a):not(#b):not(#c) .watch-active-metadata ytd-channel-name yt-formatted-string .utags_ul_0,:not(#a):not(#b):not(#c) ytd-comment-thread-renderer h3.ytd-comment-renderer .utags_ul_0{--utags-notag-ul-disply: var(--utags-notag-ul-disply-2);--utags-notag-ul-height: var(--utags-notag-ul-height-2);--utags-notag-ul-position: var(--utags-notag-ul-position-2);--utags-notag-captain-tag-top: var(--utags-notag-captain-tag-top-2);--utags-notag-captain-tag-left: var(--utags-notag-captain-tag-left-2);--utags-captain-tag-background-color: var( --utags-captain-tag-background-color-overlap )}:not(#a):not(#b):not(#c) .ytd-shorts ytd-reel-video-renderer ytd-channel-name yt-formatted-string .utags_ul_0 .utags_captain_tag{left:-24px}:not(#a):not(#b):not(#c) [hidden]+.utags_ul{display:none !important}"
  var prefix6 = "https://www.youtube.com/"
  var prefix23 = "https://m.youtube.com/"
  function getUserProfileUrl5(href) {
    if (href.startsWith(prefix6) || href.startsWith(prefix23)) {
      const href2 = href.startsWith(prefix23) ? href.slice(22) : href.slice(24)
      if (/^@[\w-]+/.test(href2)) {
        return prefix6 + href2.replace(/(^@[\w-]+).*/, "$1")
      }
      if (/^channel\/[\w-]+/.test(href2)) {
        return prefix6 + href2.replace(/(^channel\/[\w-]+).*/, "$1")
      }
    }
    return void 0
  }
  function getVideoUrl(href) {
    if (href.startsWith(prefix6) || href.startsWith(prefix23)) {
      const href2 = href.startsWith(prefix23) ? href.slice(22) : href.slice(24)
      if (href2.includes("&lc=")) {
        return void 0
      }
      if (/^watch\?v=[\w-]+/.test(href2)) {
        return prefix6 + href2.replace(/(watch\?v=[\w-]+).*/, "$1")
      }
      if (/^shorts\/[\w-]+/.test(href2)) {
        return prefix6 + href2.replace(/(^shorts\/[\w-]+).*/, "$1")
      }
    }
    return void 0
  }
  var site13 = {
    matches: /youtube\.com/,
    getMatchedNodes() {
      return $$("a[href]:not(.utags_text_tag)").filter((element) => {
        const hrefAttr = getAttribute(element, "href")
        if (!hrefAttr || hrefAttr === "null" || hrefAttr === "#") {
          return false
        }
        const href = element.href
        if (href.startsWith(prefix6) || href.startsWith(prefix23)) {
          const pathname = element.pathname
          if (/^\/@[\w-]+$/.test(pathname)) {
            const key2 = prefix6 + pathname.slice(1)
            const meta = { type: "user" }
            element.utags = { key: key2, meta }
            return true
          }
          if (/^\/channel\/[\w-]+$/.test(pathname)) {
            const key2 = prefix6 + pathname.slice(1)
            const meta = { type: "channel" }
            element.utags = { key: key2, meta }
            return true
          }
          const key = getVideoUrl(href)
          if (key) {
            let title
            const titleElement = $("#video-title", element)
            if (titleElement) {
              title = titleElement.textContent
            }
            const meta = title ? { title, type: "video" } : { type: "video" }
            element.utags = { key, meta }
            return true
          }
        }
        return false
      })
    },
    excludeSelectors: [...default_default.excludeSelectors],
    addExtraMatchedNodes(matchedNodesSet) {
      let key = getUserProfileUrl5(location.href)
      if (key) {
        const element = $(
          "#inner-header-container #container.ytd-channel-name #text"
        )
        if (element) {
          const title = element.textContent.trim()
          if (title) {
            const meta = { title }
            element.utags = { key, meta }
            matchedNodesSet.add(element)
          }
        }
      }
      key = getVideoUrl(location.href)
      if (key) {
        const element = $(
          "#title h1.ytd-watch-metadata,ytd-reel-video-renderer[is-active] h2.title"
        )
        if (element) {
          const title = element.textContent.trim()
          if (title) {
            const meta = { title, type: "video" }
            element.utags = { key, meta }
            matchedNodesSet.add(element)
          }
        }
      }
    },
    getStyle: () => youtube_com_default,
  }
  var youtube_com_default2 = site13
  var bilibili_com_default =
    ':not(#a):not(#b):not(#c) .bili-video-card__info--right a[href*="/video/"]+.utags_ul_0,:not(#a):not(#b):not(#c) .bili-video-card__info--right h3.bili-video-card__info--tit+.utags_ul_0,:not(#a):not(#b):not(#c) .video-page-card-small a[href*="/video/"]+.utags_ul_0,:not(#a):not(#b):not(#c) .video-page-card-small h3.bili-video-card__info--tit+.utags_ul_0,:not(#a):not(#b):not(#c) .video-page-operator-card-small a[href*="/video/"]+.utags_ul_0,:not(#a):not(#b):not(#c) .video-page-operator-card-small h3.bili-video-card__info--tit+.utags_ul_0{display:block !important;height:0}:not(#a):not(#b):not(#c) .bili-video-card__info--right a[href*="/video/"]+.utags_ul_0 .utags_captain_tag,:not(#a):not(#b):not(#c) .bili-video-card__info--right h3.bili-video-card__info--tit+.utags_ul_0 .utags_captain_tag,:not(#a):not(#b):not(#c) .video-page-card-small a[href*="/video/"]+.utags_ul_0 .utags_captain_tag,:not(#a):not(#b):not(#c) .video-page-card-small h3.bili-video-card__info--tit+.utags_ul_0 .utags_captain_tag,:not(#a):not(#b):not(#c) .video-page-operator-card-small a[href*="/video/"]+.utags_ul_0 .utags_captain_tag,:not(#a):not(#b):not(#c) .video-page-operator-card-small h3.bili-video-card__info--tit+.utags_ul_0 .utags_captain_tag{top:-22px;background-color:rgba(255,255,255,.8666666667) !important}'
  var prefix7 = "https://www.bilibili.com/"
  var prefix24 = "https://space.bilibili.com/"
  var prefix32 = "https://m.bilibili.com/"
  function getUserProfileUrl6(href) {
    if (href.startsWith(prefix24)) {
      const href2 = href.slice(27)
      if (/^\d+/.test(href2)) {
        return prefix24 + href2.replace(/(^\d+).*/, "$1")
      }
    }
    if (href.startsWith(prefix32 + "space/")) {
      const href2 = href.slice(29)
      if (/^\d+/.test(href2)) {
        return prefix24 + href2.replace(/(^\d+).*/, "$1")
      }
    }
    return void 0
  }
  function getVideoUrl2(href) {
    if (
      href.startsWith(prefix7 + "video/") ||
      href.startsWith(prefix32 + "video/")
    ) {
      const href2 = href.startsWith(prefix32) ? href.slice(23) : href.slice(25)
      if (/^video\/\w+/.test(href2)) {
        return prefix7 + href2.replace(/^(video\/\w+).*/, "$1")
      }
    }
    return void 0
  }
  var site14 = {
    matches: /bilibili\.com|biligame\.com/,
    addExtraMatchedNodes(matchedNodesSet) {
      if (location.href.startsWith(prefix7 + "video/")) {
        if ($(".bpx-state-loading")) {
          return
        }
        const img = $(".bpx-player-follow-face")
        const img2 = $("img.video-capture-img")
        if (
          !(img == null ? void 0 : img.src) ||
          !(img2 == null ? void 0 : img2.src)
        ) {
          return
        }
      }
      const elements = $$(
        ".user-name[data-user-id],.sub-user-name[data-user-id],.jump-link.user[data-user-id]"
      )
      for (const element2 of elements) {
        const userId = element2.dataset.userId
        if (!userId) {
          return false
        }
        const title = element2.textContent.trim()
        const key = prefix24 + userId
        const meta = { title, type: "user" }
        element2.utags = { key, meta }
        element2.dataset.utags_node_type = "link"
        matchedNodesSet.add(element2)
      }
      const elements2 = $$(".upname a,a.bili-video-card__info--owner")
      for (const element2 of elements2) {
        const href = element2.href
        if (href.startsWith(prefix24)) {
          const key = getUserProfileUrl6(href)
          if (key) {
            const nameElement = $(
              ".name,.bili-video-card__info--author",
              element2
            )
            if (nameElement) {
              const title = nameElement.textContent
              const meta = { title, type: "user" }
              nameElement.utags = { key, meta }
              nameElement.dataset.utags_node_type = "link"
              matchedNodesSet.add(nameElement)
            }
          }
        }
      }
      const elements3 = $$(
        [
          "a.up-name",
          "a.card-user-name",
          ".usercard-wrap .user .name",
          ".comment-list .user .name",
          ".user-card .user .name",
          "a[data-usercard-mid]",
          "a.user-name",
          ".user-name a",
          'a[href^="https://space.bilibili.com/"]',
          "a.staff-name",
        ].join(",")
      )
      for (const element2 of elements3) {
        const href = element2.href
        if (href.startsWith(prefix24)) {
          const key = getUserProfileUrl6(href)
          if (key) {
            let title = element2.textContent.trim()
            if (title) {
              title = title.replace(/^@/, "")
              const meta = { title, type: "user" }
              element2.utags = { key, meta }
              matchedNodesSet.add(element2)
            }
          }
        }
      }
      if (
        location.href.startsWith(prefix24) ||
        location.href.startsWith(prefix32 + "space/")
      ) {
        const element2 = $("#h-name,.m-space-info .name")
        if (element2) {
          const title = element2.textContent.trim()
          const key = getUserProfileUrl6(location.href)
          if (title && key) {
            const meta = { title, type: "user" }
            element2.utags = { key, meta }
            matchedNodesSet.add(element2)
          }
        }
      }
      const element = $("h1.video-title,h1.title-text")
      if (element) {
        const title = element.textContent.trim()
        const key = getVideoUrl2(location.href)
        if (title && key) {
          const meta = { title, type: "video" }
          element.utags = { key, meta }
          matchedNodesSet.add(element)
        }
      }
      const elements4 = $$(
        ".bili-video-card__info--right a,.video-page-card-small .info a,.video-page-operator-card-small .info a"
      )
      for (const element2 of elements4) {
        const key = getVideoUrl2(element2.href)
        if (key) {
          const title = element2.textContent.trim()
          const target =
            element2.parentElement.tagName === "H3"
              ? element2.parentElement
              : element2
          if (title) {
            const meta = { title, type: "video" }
            target.utags = { key, meta }
            target.dataset.utags_node_type = "link"
            matchedNodesSet.add(target)
          }
        }
      }
    },
    getStyle: () => bilibili_com_default,
  }
  var bilibili_com_default2 = site14
  var tiktok_com_default =
    ':not(#a):not(#b):not(#c) a+.utags_ul_0{object-position:200% 50%;--utags-notag-ul-disply: var(--utags-notag-ul-disply-5);--utags-notag-ul-height: var(--utags-notag-ul-height-5);--utags-notag-ul-position: var(--utags-notag-ul-position-5);--utags-notag-ul-top: var(--utags-notag-ul-top-5);--utags-notag-captain-tag-top: var(--utags-notag-captain-tag-top-5);--utags-notag-captain-tag-left: var(--utags-notag-captain-tag-left-5);--utags-captain-tag-background-color: var( --utags-captain-tag-background-color-overlap )}:not(#a):not(#b):not(#c) a+.utags_ul_1{object-position:0% 200%}:not(#a):not(#b):not(#c) .css-e2j6y6-StyledLink+.utags_ul_0{object-position:0% 200%;--utags-notag-captain-tag-top: -4px;--utags-notag-captain-tag-left: -4px}:not(#a):not(#b):not(#c) .css-e2j6y6-StyledLink+.utags_ul_1{position:absolute;top:-9999px;margin-top:0px !important;margin-left:0px !important}:not(#a):not(#b):not(#c) .css-1gstnae-DivCommentItemWrapper{--utags-list-node-display: flex}:not(#a):not(#b):not(#c) .css-1gstnae-DivCommentItemWrapper a[href^="/@"] p{display:inline}:not(#a):not(#b):not(#c) .css-ulyotp-DivCommentContentContainer{--utags-list-node-display: flex}:not(#a):not(#b):not(#c) .css-1asahzr-DivBroadcastTitleWrapper a[data-utags_fit_content="1"]{display:inline-block !important;width:fit-content !important}:not(#a):not(#b):not(#c) .css-1asahzr-DivBroadcastTitleWrapper a[data-utags_fit_content="1"] *:not(svg){width:fit-content !important}:not(#a):not(#b):not(#c) .css-1asahzr-DivBroadcastTitleWrapper a+.utags_ul_1{object-position:200% 50%;position:absolute;top:-9999px;margin-top:0px !important;margin-left:0px !important}:not(#a):not(#b):not(#c) .css-c5ejjw-DivProfileContainer[data-e2e=user-profile-card] a[data-utags_fit_content="1"]{display:inline-block !important;width:fit-content !important}:not(#a):not(#b):not(#c) .css-c5ejjw-DivProfileContainer[data-e2e=user-profile-card] a[data-utags_fit_content="1"] *:not(svg){width:fit-content !important}:not(#a):not(#b):not(#c) .css-8c0sl4-AName[data-utags_fit_content="1"]{display:inline-block !important;width:fit-content !important;height:fit-content !important}:not(#a):not(#b):not(#c) .css-8c0sl4-AName[data-utags_fit_content="1"] *:not(svg){width:fit-content !important;height:fit-content !important}:not(#a):not(#b):not(#c) .css-8c0sl4-AName+.utags_ul_0{object-position:0% 200%;--utags-notag-captain-tag-top: -4px;--utags-notag-captain-tag-left: -4px}:not(#a):not(#b):not(#c) .css-8c0sl4-AName+.utags_ul_1{position:absolute;top:-9999px;margin-top:0px !important;margin-left:0px !important}:not(#a):not(#b):not(#c) [data-e2e=recommend-card] a+.utags_ul_0{object-position:0% 200%;--utags-notag-captain-tag-top: -2px;--utags-notag-captain-tag-left: -4px}:not(#a):not(#b):not(#c) [data-e2e=recommend-card] a+.utags_ul_1{position:absolute;top:-9999px;margin-top:2px !important;margin-left:0px !important}'
  var prefix8 = "https://www.tiktok.com/"
  function getUserProfileUrl7(url, exact = false) {
    if (url.startsWith(prefix8)) {
      const href2 = url.slice(23)
      if (exact) {
        if (/^@[\w.-]+([?#].*)?$/.test(href2)) {
          return prefix8 + href2.replace(/(^@[\w.-]+).*/, "$1")
        }
      } else if (/^@[\w.-]+/.test(href2)) {
        return prefix8 + href2.replace(/(^@[\w.-]+).*/, "$1")
      }
    }
    return void 0
  }
  var site15 = {
    matches: /tiktok\.com/,
    listNodesSelectors: [
      ".css-ulyotp-DivCommentContentContainer",
      ".css-1gstnae-DivCommentItemWrapper",
      ".css-x6y88p-DivItemContainerV2",
    ],
    conditionNodesSelectors: [
      '.css-ulyotp-DivCommentContentContainer a[href^="/@"]',
      '.css-1gstnae-DivCommentItemWrapper a[href^="/@"]',
      '.css-x6y88p-DivItemContainerV2 a[href^="/@"]',
    ],
    getMatchedNodes() {
      return $$("a[href]:not(.utags_text_tag)").filter((element) => {
        const href = element.href
        if (!href.startsWith(prefix8)) {
          return true
        }
        const key = getUserProfileUrl7(href, true)
        if (key) {
          const titleElement = $('h3,[data-e2e="browse-username"]', element)
          const title = titleElement
            ? titleElement.textContent.trim()
            : element.textContent.trim()
          if (!title) {
            return false
          }
          const meta = { type: "user", title }
          element.utags = { key, meta }
          return true
        }
        return false
      })
    },
    excludeSelectors: [
      ...default_default.excludeSelectors,
      ".avatar-anchor",
      '[data-e2e*="avatar"]',
      '[data-e2e="user-card-nickname"]',
    ],
    validMediaSelectors: [
      '[data-e2e="browse-bluev"]',
      '[data-e2e="recommend-card"]',
    ],
    addExtraMatchedNodes(matchedNodesSet) {
      const element = $('h1[data-e2e="user-title"]')
      if (element) {
        const title = element.textContent.trim()
        const key = getUserProfileUrl7(location.href)
        if (title && key) {
          const meta = { title, type: "user" }
          element.utags = { key, meta }
          matchedNodesSet.add(element)
        }
      }
    },
    getStyle: () => tiktok_com_default,
  }
  var tiktok_com_default2 = site15
  var pojie_cn_default =
    ".fl cite,.tl cite{white-space:break-spaces}.favatar .pi .authi a{line-height:16px}.favatar .pi{height:auto}"
  var site16 = {
    matches: /52pojie\.cn/,
    matchedNodesSelectors: [
      'a[href*="home.php?mod=space&uid="]',
      'a[href*="home.php?mod=space&username="]',
    ],
    excludeSelectors: [
      ...default_default.excludeSelectors,
      "#hd",
      "#pt",
      "#pgt",
      "#jz52top",
    ],
    getStyle: () => pojie_cn_default,
  }
  var pojie_cn_default2 = site16
  var prefix9 = "https://juejin.cn/"
  function getUserProfileUrl8(url) {
    if (url.startsWith(prefix9)) {
      const href2 = url.slice(18)
      if (/^user\/\d+/.test(href2)) {
        return prefix9 + href2.replace(/^(user\/\d+).*/, "$1")
      }
    }
    return void 0
  }
  var site17 = {
    matches: /juejin\.cn/,
    getMatchedNodes() {
      return $$("a[href]:not(.utags_text_tag)").filter((element) => {
        if ($(".avatar", element)) {
          return false
        }
        const href = element.href
        if (href.startsWith(prefix9)) {
          const key = getUserProfileUrl8(href)
          if (key) {
            const titleElement = $(".name", element)
            let title
            if (titleElement) {
              title = titleElement.textContent
            }
            const meta = { type: "user" }
            if (title) {
              meta.title = title
            }
            element.utags = { key, meta }
            element.dataset.utags = element.dataset.utags || ""
            return true
          }
        }
        return false
      })
    },
    excludeSelectors: [
      ...default_default.excludeSelectors,
      ".list-header",
      ".sub-header",
      ".next-page",
      ".follow-item",
      ".more-item",
    ],
    addExtraMatchedNodes(matchedNodesSet) {
      const key = getUserProfileUrl8(location.href)
      if (key) {
        const element2 = $("h1.username")
        if (element2) {
          const title = element2.textContent.trim()
          if (title) {
            const meta = { title, type: "user" }
            element2.utags = { key, meta }
            matchedNodesSet.add(element2)
          }
        }
      }
      const element = $(".sidebar-block.author-block a .username")
      if (element) {
        const anchor = element.closest("a")
        if (anchor) {
          const key2 = getUserProfileUrl8(anchor.href)
          if (key2) {
            const titleElement = $(".name", element)
            const title = titleElement
              ? titleElement.textContent
              : element.textContent
            if (title) {
              const meta = { title, type: "user" }
              element.utags = { key: key2, meta }
              matchedNodesSet.add(element)
            }
          }
        }
      }
    },
  }
  var juejin_cn_default = site17
  var prefix10 = "https://www.zhihu.com/"
  function getUserProfileUrl9(url, exact = false) {
    if (url.startsWith(prefix10)) {
      const href2 = url.slice(22)
      if (exact) {
        if (/^people\/[\w-]+(\?.*)?$/.test(href2)) {
          return prefix10 + href2.replace(/^(people\/[\w-]+).*/, "$1")
        }
      } else if (/^people\/[\w-]+/.test(href2)) {
        return prefix10 + href2.replace(/^(people\/[\w-]+).*/, "$1")
      }
    }
    return void 0
  }
  var site18 = {
    matches: /zhihu\.com/,
    getMatchedNodes() {
      return $$("a[href]:not(.utags_text_tag)").filter((element) => {
        if ($(".avatar", element)) {
          return false
        }
        const href = element.href
        if (!href.includes("zhihu.com")) {
          return true
        }
        if (href.startsWith(prefix10 + "people/")) {
          const key = getUserProfileUrl9(href, true)
          if (key) {
            const titleElement = $(".name", element)
            let title
            if (titleElement) {
              title = titleElement.textContent
            }
            const meta = { type: "user" }
            if (title) {
              meta.title = title
            }
            element.utags = { key, meta }
            return true
          }
        }
        return false
      })
    },
    excludeSelectors: [
      ...default_default.excludeSelectors,
      ".NumberBoard",
      ".ProfileMain-tabs",
      ".Profile-lightList",
    ],
    addExtraMatchedNodes(matchedNodesSet) {
      const key = getUserProfileUrl9(location.href)
      if (key) {
        const element = $("h1.ProfileHeader-title .ProfileHeader-name")
        if (element) {
          const title = element.textContent.trim()
          if (title) {
            const meta = { title, type: "user" }
            element.utags = { key, meta }
            matchedNodesSet.add(element)
          }
        }
      }
    },
  }
  var zhihu_com_default = site18
  var xiaohongshu_com_default =
    ":not(#a):not(#b):not(#c) a+.utags_ul_0{--utags-notag-ul-disply: var(--utags-notag-ul-disply-5);--utags-notag-ul-height: var(--utags-notag-ul-height-5);--utags-notag-ul-position: var(--utags-notag-ul-position-5);--utags-notag-ul-top: var(--utags-notag-ul-top-5);--utags-notag-captain-tag-top: var(--utags-notag-captain-tag-top-5);--utags-notag-captain-tag-left: var(--utags-notag-captain-tag-left-5);--utags-captain-tag-background-color: var( --utags-captain-tag-background-color-overlap )}:not(#a):not(#b):not(#c) a+.utags_ul_1{background-color:var(--utags-captain-tag-background-color) !important;border-radius:3px !important}:not(#a):not(#b):not(#c) .author-container .author-wrapper .name+.utags_ul_0{--utags-notag-captain-tag-top: 6px;--utags-notag-captain-tag-left: 8px}:not(#a):not(#b):not(#c) .author-container .author-wrapper .name+.utags_ul_1{position:absolute;top:-9999px;margin-top:4px !important;margin-left:8px !important}:not(#a):not(#b):not(#c) .note-text{position:relative}:not(#a):not(#b):not(#c) .note-text .utags_ul_0{--utags-notag-ul-disply: var(--utags-notag-ul-disply-1);--utags-notag-ul-height: var(--utags-notag-ul-height-1);--utags-notag-ul-position: var(--utags-notag-ul-position-1);--utags-notag-ul-top: var(--utags-notag-ul-top-1);--utags-notag-captain-tag-top: var(--utags-notag-captain-tag-top-1);--utags-notag-captain-tag-left: var(--utags-notag-captain-tag-left-1);--utags-captain-tag-background-color: var( --utags-captain-tag-background-color-overlap )}:not(#a):not(#b):not(#c) .comments-container .author-wrapper .name+.utags_ul_0{--utags-notag-captain-tag-top: 2px;--utags-notag-captain-tag-left: 16px}:not(#a):not(#b):not(#c) .comments-container .author-wrapper .name+.utags_ul_1{position:absolute;top:-9999px;margin-top:-18px !important;margin-left:0px !important}:not(#a):not(#b):not(#c) .note-content-user+.utags_ul_0{--utags-notag-captain-tag-top: 0px;--utags-notag-captain-tag-left: 20px}:not(#a):not(#b):not(#c) .tooltip-content .user-content .avatar-info+.utags_ul_0{--utags-notag-captain-tag-top: 6px;--utags-notag-captain-tag-left: 46px}:not(#a):not(#b):not(#c) .tooltip-content .user-content .avatar-info+.utags_ul_1{position:absolute;top:-9999px;margin-top:6px !important;margin-left:46px !important}:not(#a):not(#b):not(#c) .note-item .cover+.utags_ul_0{--utags-notag-captain-tag-top: 18px;--utags-notag-captain-tag-left: -8px}:not(#a):not(#b):not(#c) .note-item .cover+.utags_ul_1{position:absolute;top:-9999px;margin-top:14px !important;margin-left:-4px !important}:not(#a):not(#b):not(#c) .note-item .author-wrapper .author+.utags_ul_0{--utags-notag-captain-tag-top: 16px;--utags-notag-captain-tag-left: 20px}:not(#a):not(#b):not(#c) .note-item .author-wrapper .author+.utags_ul_1{position:absolute;top:-9999px;margin-top:12px !important;margin-left:22px !important}:not(#a):not(#b):not(#c) #userPageContainer .user-info .user-name+.utags_ul_0{--utags-notag-ul-disply: var(--utags-notag-ul-disply-5);--utags-notag-ul-height: var(--utags-notag-ul-height-5);--utags-notag-ul-position: var(--utags-notag-ul-position-5);--utags-notag-ul-top: var(--utags-notag-ul-top-5);--utags-notag-captain-tag-top: -16px;--utags-notag-captain-tag-left: -6px}:not(#a):not(#b):not(#c) #userPageContainer .user-info .user-name+.utags_ul_1{position:absolute;top:-9999px;margin-top:-15px !important;margin-left:-4px !important}"
  var prefix11 = "https://www.xiaohongshu.com/"
  function getCanonicalUrl5(url) {
    if (url.startsWith(prefix11)) {
      const href2 = url.slice(prefix11.length)
      if (href2.startsWith("search_result") && href2.includes("keyword")) {
        return (
          prefix11 +
          "search_result/?" +
          href2.replace(/.*?(keyword=[^&]*).*/, "$1") +
          "&type=54"
        )
      }
    }
    return url
  }
  function getUserProfileUrl10(url, exact = false) {
    if (url.startsWith(prefix11)) {
      const href2 = url.slice(28)
      if (exact) {
        if (/^user\/profile\/\w+(\?.*)?$/.test(href2)) {
          return prefix11 + href2.replace(/^(user\/profile\/\w+).*/, "$1")
        }
      } else if (/^user\/profile\/\w+/.test(href2)) {
        return prefix11 + href2.replace(/^(user\/profile\/\w+).*/, "$1")
      }
    }
    return void 0
  }
  function getPostUrl(url) {
    if (url.startsWith(prefix11)) {
      const href2 = url.slice(28)
      if (/^explore\/\w+/.test(href2)) {
        return prefix11 + href2.replace(/^(explore\/\w+).*/, "$1")
      }
      if (/^user\/profile\/\w+\/\w+/.test(href2)) {
        return (
          prefix11 +
          "explore/" +
          href2.replace(/^user\/profile\/\w+\/(\w+).*/, "$1")
        )
      }
      if (/^search_result\/\w+/.test(href2)) {
        return (
          prefix11 + "explore/" + href2.replace(/^search_result\/(\w+).*/, "$1")
        )
      }
    }
    return void 0
  }
  var site19 = {
    matches: /www\.xiaohongshu\.com/,
    listNodesSelectors: [".feeds-container section", ".comment-item"],
    conditionNodesSelectors: [
      ".feeds-container section .author-wrapper .author",
      ".feeds-container section .cover",
      ".comment-item .author-wrapper .author a",
    ],
    getMatchedNodes() {
      return $$("a[href]:not(.utags_text_tag)").filter((element) => {
        const href = element.href
        element.dataset.utags_position = "LB"
        if (!href.startsWith(prefix11)) {
          return true
        }
        let key = getUserProfileUrl10(href, true)
        if (key) {
          const titleElement =
            (hasClass(element, "name") ? element : $(".name", element)) ||
            element
          let title
          if (titleElement) {
            title = titleElement.textContent.trim()
          }
          if (!title) {
            return false
          }
          if (element.closest(".comments-container .author-wrapper .name")) {
            element.dataset.utags_position = "RB"
            element.dataset.utags_position2 = "LB"
          }
          const meta = { type: "user", title }
          element.utags = { key, meta }
          element.dataset.utags = element.dataset.utags || ""
          return true
        }
        key = getPostUrl(href)
        if (key) {
          const meta = { type: "post" }
          if (hasClass(element, "cover")) {
            const sibling = element.nextElementSibling
            if (sibling && hasClass(sibling, "footer")) {
              const titleElement = $(".title span", sibling)
              if (titleElement) {
                const title = titleElement.textContent.trim()
                if (title) {
                  meta.title = title
                }
              }
              element.dataset.utags = element.dataset.utags || ""
            }
          }
          element.utags = { key, meta }
          return true
        }
        return true
      })
    },
    excludeSelectors: [
      ...default_default.excludeSelectors,
      ".side-bar",
      ".dropdown-nav",
      ".dropdown-container",
      ".interaction-info",
    ],
    addExtraMatchedNodes(matchedNodesSet) {
      let key = getUserProfileUrl10(location.href)
      if (key) {
        const element = $(".user-info .user-name")
        if (element) {
          const title = element.textContent.trim()
          if (title) {
            const meta = { title, type: "user" }
            element.utags = { key, meta }
            matchedNodesSet.add(element)
            element.dataset.utags_position = "LT"
          }
        }
      }
      key = getPostUrl(location.href)
      if (key) {
        const element = $(".note-content .title")
        if (element) {
          const title = element.textContent.trim()
          if (title) {
            const meta = { title, type: "post" }
            element.utags = { key, meta }
            matchedNodesSet.add(element)
          }
        }
      }
    },
    getCanonicalUrl: getCanonicalUrl5,
    getStyle: () => xiaohongshu_com_default,
  }
  var xiaohongshu_com_default2 = site19
  var prefix12 = "https://weibo.com/"
  var prefix25 = "https://m.weibo.cn/"
  function getUserProfileUrl11(url, exact = false) {
    if (url.startsWith(prefix12) || url.startsWith(prefix25)) {
      const href2 = url.startsWith(prefix25) ? url.slice(19) : url.slice(18)
      if (exact) {
        if (/^u\/\d+(\?.*)?$/.test(href2)) {
          return prefix12 + href2.replace(/^(u\/\d+).*/, "$1")
        }
        if (/^profile\/\d+(\?.*)?$/.test(href2)) {
          return prefix12 + "u/" + href2.replace(/^profile\/(\d+).*/, "$1")
        }
        if (/^\d+(\?.*)?$/.test(href2)) {
          return prefix12 + "u/" + href2.replace(/^(\d+).*/, "$1")
        }
      } else {
        if (/^u\/\d+/.test(href2)) {
          return prefix12 + href2.replace(/^(u\/\d+).*/, "$1")
        }
        if (/^profile\/\d+/.test(href2)) {
          return prefix12 + "u/" + href2.replace(/^profile\/(\d+).*/, "$1")
        }
        if (/^\d+/.test(href2)) {
          return prefix12 + "u/" + href2.replace(/^(\d+).*/, "$1")
        }
      }
    }
    return void 0
  }
  var site20 = {
    matches: /weibo\.com|weibo\.cn/,
    getMatchedNodes() {
      return $$("a[href]:not(.utags_text_tag)").filter((element) => {
        const href = element.href
        if (!href.includes("weibo.com") && !href.includes("weibo.cn")) {
          return true
        }
        const key = getUserProfileUrl11(href, true)
        if (key) {
          const meta = { type: "user" }
          element.utags = { key, meta }
          if ($(".m-icon.vipicon", element)) {
            element.dataset.utags = element.dataset.utags || ""
          }
          return true
        }
        return true
      })
    },
    excludeSelectors: [
      ...default_default.excludeSelectors,
      '[class^="Frame_side_"]',
      'a[href*="promote.biz.weibo.cn"]',
    ],
    addExtraMatchedNodes(matchedNodesSet) {
      const key = getUserProfileUrl11(location.href)
      if (key) {
        const element = $(
          '[class^="ProfileHeader_name_"],.profile-cover .mod-fil-name .txt-shadow'
        )
        if (element) {
          const title = element.textContent.trim()
          if (title) {
            const meta = { title, type: "user" }
            element.utags = { key, meta }
            matchedNodesSet.add(element)
          }
        }
      }
    },
  }
  var weibo_com_default = site20
  var sspai_com_default =
    ":not(#a):not(#b):not(#c) #article-title+.utags_ul{display:block !important;margin-top:-30px !important;margin-bottom:20px !important}:not(#a):not(#b):not(#c) .user__info__card__center .utags_ul{display:block !important;margin-bottom:5px !important}:not(#a):not(#b):not(#c) .pai_title .utags_ul{float:left}"
  var prefix13 = "https://sspai.com/"
  var excludeLinks = [
    "https://sspai.com/prime",
    "https://sspai.com/matrix",
    "https://sspai.com/page/about-us",
    "https://sspai.com/page/agreement",
    "https://sspai.com/page/bussiness",
    "https://sspai.com/post/37793",
    "https://sspai.com/page/client",
    "https://sspai.com/s/J71e",
    "https://sspai.com/mall",
  ]
  function getCanonicalUrl6(url) {
    if (url.startsWith(prefix13)) {
      const href = url.slice(18)
      if (href.startsWith("u/")) {
        return prefix13 + href.replace(/^(u\/\w+).*/, "$1")
      }
    }
    return url
  }
  function getUserProfileUrl12(url) {
    if (url.startsWith(prefix13)) {
      const href2 = url.slice(18)
      if (/^u\/\w+/.test(href2)) {
        return prefix13 + href2.replace(/^(u\/\w+).*/, "$1")
      }
    }
    return void 0
  }
  function getPostUrl2(url) {
    if (url.startsWith(prefix13)) {
      const href2 = url.slice(18)
      if (/^post\/\d+/.test(href2)) {
        return prefix13 + href2.replace(/^(post\/\d+).*/, "$1")
      }
    }
    return void 0
  }
  var site21 = {
    matches: /sspai\.com/,
    getMatchedNodes() {
      return $$("a[href]:not(.utags_text_tag)").filter((element) => {
        const href = element.href
        for (const link of excludeLinks) {
          if (href.includes(link)) {
            return false
          }
        }
        if (
          hasClass(element, "ss__user__nickname__wrapper") ||
          element.closest('.card_bottom > a[href^="/u/"]')
        ) {
          element.dataset.utags = element.dataset.utags || ""
          return true
        }
        return true
      })
    },
    excludeSelectors: [
      ...default_default.excludeSelectors,
      "header",
      "footer",
      ".pai_abstract",
      ".pai_title .link",
    ],
    addExtraMatchedNodes(matchedNodesSet) {
      let key = getPostUrl2(location.href)
      if (key) {
        const element = $(".article-header .title")
        if (element && !element.closest(".pai_title")) {
          const title = element.textContent.trim()
          if (title) {
            const meta = { title, type: "post" }
            element.utags = { key, meta }
            matchedNodesSet.add(element)
          }
        }
      }
      key = getUserProfileUrl12(location.href)
      if (key) {
        const element = $(
          ".user_content .user__info__card .ss__user__card__nickname"
        )
        if (element) {
          const title = element.textContent.trim()
          if (title) {
            const meta = { title, type: "user" }
            element.utags = { key, meta }
            matchedNodesSet.add(element)
          }
        }
      }
    },
    getCanonicalUrl: getCanonicalUrl6,
    getStyle: () => sspai_com_default,
  }
  var sspai_com_default2 = site21
  var douyin_com_default =
    ':not(#a):not(#b):not(#c) [data-e2e=comment-item] .utags_ul_0 .utags_captain_tag{left:-26px}:not(#a):not(#b):not(#c) [data-e2e=detail-video-info] .utags_ul[data-utags_key*="/video/"]{display:block !important;margin-top:0px !important;margin-bottom:2px !important}:not(#a):not(#b):not(#c) [data-e2e=detail-video-info] .utags_ul[data-utags_key*="/video/"].utags_ul_0{height:0}:not(#a):not(#b):not(#c) [data-e2e=detail-video-info] .utags_ul[data-utags_key*="/video/"].utags_ul_0 .utags_captain_tag{top:-26px;background-color:rgba(255,255,255,.8666666667) !important}:not(#a):not(#b):not(#c) [data-e2e=related-video] .utags_ul_0[data-utags_key*="/video/"]{display:block !important;height:0}:not(#a):not(#b):not(#c) [data-e2e=related-video] .utags_ul_0[data-utags_key*="/video/"] .utags_captain_tag{top:-26px;background-color:rgba(255,255,255,.8666666667) !important}:not(#a):not(#b):not(#c) [data-e2e=related-video] .utags_ul_0[data-utags_key*="/user/"]{display:block !important;height:0px;width:0px}:not(#a):not(#b):not(#c) [data-e2e=related-video] .utags_ul_0[data-utags_key*="/user/"] .utags_captain_tag{top:-22px;background-color:rgba(255,255,255,.8666666667) !important}:not(#a):not(#b):not(#c) [data-e2e=user-info] a+.utags_ul_0[data-utags_key*="/user/"]{display:block !important;height:0px;width:0px}:not(#a):not(#b):not(#c) [data-e2e=user-info] a+.utags_ul_0[data-utags_key*="/user/"] .utags_captain_tag{top:-22px;background-color:rgba(255,255,255,.8666666667) !important}'
  var prefix14 = "https://www.douyin.com/"
  function getUserProfileUrl13(url, exact = false) {
    if (url.startsWith(prefix14)) {
      const href2 = url.slice(23)
      if (exact) {
        if (/^user\/[\w-]+(\?.*)?$/.test(href2)) {
          return prefix14 + href2.replace(/^(user\/[\w-]+).*/, "$1")
        }
      } else if (/^user\/[\w-]+/.test(href2)) {
        return prefix14 + href2.replace(/^(user\/[\w-]+).*/, "$1")
      }
    }
    return void 0
  }
  function getVideoUrl3(url) {
    if (url.startsWith(prefix14)) {
      const href2 = url.slice(23)
      if (/^video\/\w+/.test(href2)) {
        return prefix14 + href2.replace(/^(video\/\w+).*/, "$1")
      }
    }
    return void 0
  }
  function getNoteUrl(url) {
    if (url.startsWith(prefix14)) {
      const href2 = url.slice(23)
      if (/^note\/\w+/.test(href2)) {
        return prefix14 + href2.replace(/^(note\/\w+).*/, "$1")
      }
    }
    return void 0
  }
  var site22 = {
    matches: /www\.douyin\.com/,
    getMatchedNodes() {
      return $$("a[href]:not(.utags_text_tag)").filter((element) => {
        const href = element.href
        if (!href.includes("www.douyin.com")) {
          return true
        }
        let key = getUserProfileUrl13(href, true)
        if (key) {
          const meta = { type: "user" }
          element.utags = { key, meta }
          return true
        }
        key = getVideoUrl3(href)
        if (key) {
          const meta = { type: "video" }
          element.utags = { key, meta }
          return true
        }
        key = getNoteUrl(href)
        if (key) {
          const meta = { type: "post" }
          element.utags = { key, meta }
          return true
        }
        return true
      })
    },
    excludeSelectors: [
      ...default_default.excludeSelectors,
      '[data-e2e="douyin-navigation"]',
    ],
    validMediaSelectors: ['img[src*="twemoji"]'],
    addExtraMatchedNodes(matchedNodesSet) {
      let key = getUserProfileUrl13(location.href)
      if (key) {
        const element = getFirstHeadElement("h1")
        if (element) {
          const title = element.textContent.trim()
          if (title) {
            const meta = { title, type: "user" }
            element.utags = { key, meta }
            matchedNodesSet.add(element)
          }
        }
      }
      key = getVideoUrl3(location.href)
      if (key) {
        const element = getFirstHeadElement("h1")
        if (element) {
          const title = element.textContent.trim()
          const target = element.parentElement.parentElement
          if (title) {
            const meta = { title, type: "video" }
            target.utags = { key, meta }
            target.dataset.utags_node_type = "link"
            matchedNodesSet.add(target)
          }
        }
      }
      key = getNoteUrl(location.href)
      if (key) {
        const element = getFirstHeadElement("h1")
        if (element) {
          const title = element.textContent.trim()
          if (title) {
            const meta = { title, type: "post" }
            element.utags = { key, meta }
            matchedNodesSet.add(element)
          }
        }
      }
    },
    getStyle: () => douyin_com_default,
  }
  var douyin_com_default2 = site22
  var podcasts_google_com_default = ""
  var prefix15 = "https://podcasts.google.com/"
  function getEpisodeUrl(url, exact = false) {
    if (url.startsWith(prefix15)) {
      const href2 = url.slice(28)
      if (exact) {
        if (/^feed\/\w+\/episode\/\w+(\?.*)?$/.test(href2)) {
          return prefix15 + href2.replace(/^(feed\/\w+\/episode\/\w+).*/, "$1")
        }
      } else if (/^feed\/\w+\/episode\/\w+/.test(href2)) {
        return prefix15 + href2.replace(/^(feed\/\w+\/episode\/\w+).*/, "$1")
      }
    }
    return void 0
  }
  function getFeedUrl(url) {
    if (url.startsWith(prefix15)) {
      const href2 = url.slice(28)
      if (/^feed\/\w+(\?.*)?$/.test(href2)) {
        return prefix15 + href2.replace(/^(feed\/\w+).*/, "$1")
      }
    }
    return void 0
  }
  function getCanonicalUrl7(url) {
    if (url.startsWith(prefix15)) {
      let url2 = getFeedUrl(url)
      if (url2) {
        return url2
      }
      url2 = getEpisodeUrl(url)
      if (url2) {
        return url2
      }
    }
    return url
  }
  var site23 = {
    matches: /podcasts\.google\.com/,
    matchedNodesSelectors: ["a[href]:not(.utags_text_tag)"],
    excludeSelectors: [
      ...default_default.excludeSelectors,
      "header",
      "gm-coplanar-drawer",
    ],
    addExtraMatchedNodes(matchedNodesSet) {
      let key = getEpisodeUrl(location.href)
      if (key) {
        const element = $("h5")
        if (element) {
          const title = element.textContent.trim()
          if (title) {
            const meta = { title, type: "episode" }
            element.utags = { key, meta }
            matchedNodesSet.add(element)
          }
        }
      }
      key = getFeedUrl(location.href)
      if (key) {
        for (const container of $$("[data-encoded-feed]")) {
          if (isVisible(container)) {
            const element = $(
              "div:first-child > div:first-child > div:first-child > div:first-child",
              container
            )
            if (element) {
              const title = element.textContent.trim()
              if (title) {
                const meta = { title, type: "feed" }
                element.utags = { key, meta }
                matchedNodesSet.add(element)
              }
            }
          }
        }
      }
      for (const element of $$('a[role="listitem"]')) {
        const key2 = getEpisodeUrl(element.href)
        const titleElement = $(
          'div[role="navigation"] div div[role="presentation"]',
          element
        )
        if (key2 && titleElement) {
          const title = titleElement.textContent
          const meta = { title, type: "episode" }
          titleElement.utags = { key: key2, meta }
          titleElement.dataset.utags_node_type = "link"
          matchedNodesSet.add(titleElement)
        }
      }
      for (const element of $$(
        'a[href^="./feed/"]:not(a[href*="/episode/"])'
      )) {
        if (!isVisible(element)) {
          continue
        }
        const key2 = getFeedUrl(element.href)
        const titleElement = $("div > div", element)
        if (titleElement) {
          const title = titleElement.textContent
          const meta = { title, type: "feed" }
          titleElement.utags = { key: key2, meta }
          titleElement.dataset.utags_node_type = "link"
          matchedNodesSet.add(titleElement)
        }
      }
    },
    getCanonicalUrl: getCanonicalUrl7,
    getStyle: () => podcasts_google_com_default,
  }
  var podcasts_google_com_default2 = site23
  var rebang_today_default =
    ":not(#a):not(#b):not(#c) .w-screen ul{--utags-list-node-display: flex}:not(#a):not(#b):not(#c) .w-screen ul .flex-1:not(.relative)>.utags_ul_0,:not(#a):not(#b):not(#c) .w-screen ul .flex.flex-col.relative .flex-1 .utags_ul_0,:not(#a):not(#b):not(#c) .w-screen ul .relative>.utags_ul_0{--utags-notag-ul-disply: var(--utags-notag-ul-disply-3);--utags-notag-ul-height: var(--utags-notag-ul-height-3);--utags-notag-ul-position: var(--utags-notag-ul-position-3);--utags-notag-ul-top: var(--utags-notag-ul-top-3);--utags-notag-captain-tag-top: var(--utags-notag-captain-tag-top-3);--utags-notag-captain-tag-left: var(--utags-notag-captain-tag-left-3);--utags-captain-tag-background-color: var( --utags-captain-tag-background-color-overlap )}:not(#a):not(#b):not(#c) .w-screen ul .flex.flex-col.relative .flex-1 .utags_ul_0,:not(#a):not(#b):not(#c) .w-screen ul .flex-1:not(.relative)>.utags_ul_0{--utags-notag-captain-tag-top: 18px}:not(#a):not(#b):not(#c) .w-screen ul .text-base .block+.utags_ul_0,:not(#a):not(#b):not(#c) .w-screen ul h1 .utags_ul_0,:not(#a):not(#b):not(#c) .w-screen ul li>div.overflow-hidden:nth-of-type(2):not(.relative)>a+.utags_ul_0,:not(#a):not(#b):not(#c) .w-screen ul li>a+.utags_ul_0{--utags-notag-ul-disply: var(--utags-notag-ul-disply-2);--utags-notag-ul-height: var(--utags-notag-ul-height-2);--utags-notag-ul-position: var(--utags-notag-ul-position-2);--utags-notag-captain-tag-top: var(--utags-notag-captain-tag-top-2);--utags-notag-captain-tag-left: var(--utags-notag-captain-tag-left-2);--utags-captain-tag-background-color: var( --utags-captain-tag-background-color-overlap )}:not(#a):not(#b):not(#c) .w-screen ul .text-base .block+.utags_ul_0{--utags-notag-captain-tag-top: -24px}:not(#a):not(#b):not(#c) .w-screen ul h1 .utags_ul_0{--utags-notag-captain-tag-top: -28px}:not(#a):not(#b):not(#c) .w-screen ul li>a+.utags_ul_0{--utags-notag-captain-tag-left: 26px}:not(#a):not(#b):not(#c) .w-screen ul .flex.flex-col .text-base+.utags_ul_0,:not(#a):not(#b):not(#c) .w-screen ul li>a.text-base+.utags_ul_0{--utags-notag-ul-disply: var(--utags-notag-ul-disply-4);--utags-notag-ul-height: var(--utags-notag-ul-height-4);--utags-notag-ul-position: var(--utags-notag-ul-position-4);--utags-notag-ul-top: var(--utags-notag-ul-top-4);--utags-notag-captain-tag-top: var(--utags-notag-captain-tag-top-4);--utags-notag-captain-tag-left: var(--utags-notag-captain-tag-left-4);--utags-captain-tag-background-color: var( --utags-captain-tag-background-color-overlap )}:not(#a):not(#b):not(#c) .w-screen ul li>a.text-base+.utags_ul_0{--utags-notag-captain-tag-top: -10px;--utags-notag-captain-tag-left: 14px}:not(#a):not(#b):not(#c) .w-screen ul .truncate .utags_ul_0{--utags-notag-captain-tag-left: -22px}:not(#a):not(#b):not(#c) aside{--utags-list-node-display: flex}:not(#a):not(#b):not(#c) aside .select-none .utags_ul_0{--utags-notag-captain-tag-left: -22px}:not(#a):not(#b):not(#c) aside .select-none .arco-tag .utags_ul_0{--utags-notag-captain-tag-left: -6px}:not(#a):not(#b):not(#c) #markdown-body.markdown-body a+.utags_ul_0{--utags-notag-ul-disply: var(--utags-notag-ul-disply-1);--utags-notag-ul-height: var(--utags-notag-ul-height-1);--utags-notag-ul-width: var(--utags-notag-ul-width-1);--utags-notag-ul-position: var(--utags-notag-ul-position-1);--utags-notag-ul-top: var(--utags-notag-ul-top-1);--utags-notag-captain-tag-top: var(--utags-notag-captain-tag-top-1);--utags-notag-captain-tag-left: var(--utags-notag-captain-tag-left-1)}"
  var nodeNameMap = {
    知乎: "zhihu",
    微博: "weibo",
    IT之家: "ithome",
    虎扑: "hupu",
    豆瓣社区: "douban-community",
    虎嗅: "huxiu",
    少数派: "sspai",
    网易新闻: "ne-news",
    澎湃新闻: "thepaper",
    小红书: "xiaohongshu",
    "36\u6C2A": "36kr",
    今日头条: "toutiao",
    爱范儿: "ifanr",
    豆瓣书影音: "douban-media",
    什么值得买: "smzdm",
    百度: "baidu",
    百度贴吧: "baidu-tieba",
    吾爱破解: "52pojie",
    观风闻: "guancha-user",
    雪球: "xueqiu",
    东方财富: "eastmoney",
    新浪财经: "sina-fin",
    蓝点网: "landian",
    小众软件: "appinn",
    反斗限免: "apprcn",
    NGA社区: "nga",
    游民星空: "gamersky",
    喷嚏网: "penti",
    沙雕新闻: "shadiao-news",
    抖音: "douyin",
    哔哩哔哩: "bilibili",
    直播吧: "zhibo8",
    掘金: "juejin",
    技术期刊: "journal-tech",
    开发者头条: "toutiaoio",
    GitHub: "github",
    AcFun: "acfun",
    宽带山: "kds",
    V2EX: "v2ex",
    格隆汇: "gelonghui",
    第一财经: "diyicaijing",
    InfoQ: "infoq",
    CSDN: "csdn",
  }
  var site24 = {
    matches: /rebang\.today/,
    preProcess() {
      const nodes = $$(":not(a) > .arco-tag-content")
      for (const node of nodes) {
        const name = node.textContent
        if (name && !node.closest("a")) {
          const nodeId = nodeNameMap[name]
          if (nodeId) {
            const a = createElement("a", {
              href: "https://rebang.today/home?tab=" + nodeId,
            })
            node.after(a)
            a.append(node)
          }
        }
      }
    },
    listNodesSelectors: [
      ".w-screen ul:not(.utags_ul) > li",
      "aside .w-full .select-none",
    ],
    conditionNodesSelectors: [
      '[data-utags_list_node] [data-utags]:not([href^="https://www.v2ex.com/member/"])',
      '[data-utags_list_node] a[href^="https://www.v2ex.com/member/"][data-utags].hidden',
    ],
    matchedNodesSelectors: ["a[href]:not(.utags_text_tag)"],
    excludeSelectors: [
      ...default_default.excludeSelectors,
      "header",
      ".absolute.rounded-xl",
      "ul li h1 + p a",
    ],
    validMediaSelectors: [
      ".text-text-100",
      ".items-center .rounded-full",
      'a[href^="https://github.com/"] svg',
      'a[href^="https://space.bilibili.com/"] img',
      'a[href^="https://toutiao.io/subjects/"] img',
      "svg.arco-icon",
    ],
    getStyle: () => rebang_today_default,
  }
  var rebang_today_default2 = site24
  var myanimelist_net_default =
    ":not(#a):not(#b):not(#c) tbody.list-item td.title{--utags-notag-captain-tag-top: -6px;--utags-notag-captain-tag-left: -24px}"
  var site25 = {
    matches: /myanimelist\.net/,
    listNodesSelectors: [],
    conditionNodesSelectors: [],
    matchedNodesSelectors: ["a[href]:not(.utags_text_tag)"],
    excludeSelectors: [
      ...default_default.excludeSelectors,
      "#headerSmall",
      "#menu",
      "#nav",
      ".header",
      "#status-menu",
      'a[href^="/sns/register/"]',
      'a[href^="/logout"]',
      'a[href*="/membership?"]',
      'a[href*="/login.php"]',
      'a[href*="/register.php"]',
      'a[href*="/dbchanges.php"]',
      'a[href*="/editprofile.php"]',
      'a[href*="go=write"]',
      'a[href^="/ownlist/anime/add?"]',
      '[class*="btn-"]',
      '[class*="icon-"]',
      '[rel*="sponsored"]',
    ],
    getStyle: () => myanimelist_net_default,
  }
  var myanimelist_net_default2 = site25
  function getCanonicalUrl8(url) {
    if (url.includes("douban.com")) {
      return deleteUrlParameters(url, [
        "ref",
        "dcs",
        "dcm",
        "from",
        "from_",
        "dt_time_source",
        "target_user_id",
        "_dtcc",
        "_i",
      ])
    }
    return url
  }
  var site26 = {
    matches: /douban\.com/,
    listNodesSelectors: [],
    conditionNodesSelectors: [],
    matchedNodesSelectors: ["a[href]:not(.utags_text_tag)"],
    excludeSelectors: [
      ...default_default.excludeSelectors,
      ".tabs",
      'a[href*="/accounts/login?"]',
      'a[href*="/passport/login?"]',
      'a[href*="/register?"]',
    ],
    getCanonicalUrl: getCanonicalUrl8,
  }
  var douban_com_default = site26
  var pixiv_net_default = ""
  var prefix16 = "https://www.pixiv.net/"
  function getUserProfileUrl14(url, exact = false) {
    if (url.startsWith(prefix16)) {
      let href2 = url.slice(22)
      if (href2.startsWith("en/")) {
        href2 = href2.slice(3)
      }
      if (exact) {
        if (/^users\/\d+([?#].*)?$/.test(href2)) {
          return prefix16 + href2.replace(/^(users\/\d+).*/, "$1")
        }
      } else if (/^users\/\d+/.test(href2)) {
        return prefix16 + href2.replace(/^(users\/\d+).*/, "$1")
      }
    }
    return void 0
  }
  var site27 = {
    matches: /pixiv\.net/,
    getMatchedNodes() {
      return $$("a[href]:not(.utags_text_tag)").filter((element) => {
        const href = element.href
        if (!href.includes("www.pixiv.net")) {
          return true
        }
        const key = getUserProfileUrl14(href, true)
        if (key) {
          const title = element.textContent
          if (
            !title ||
            /プロフィールを見る|View Profile|프로필 보기|查看个人资料|查看個人資料|ホーム|Home|홈|主页|首頁/.test(
              title
            )
          ) {
            return false
          }
          const meta = { type: "user", title }
          element.utags = { key, meta }
          element.dataset.utags = element.dataset.utags || ""
          return true
        }
        return false
      })
    },
    excludeSelectors: [...default_default.excludeSelectors, "#xxxxxxx"],
    addExtraMatchedNodes(matchedNodesSet) {
      const key = getUserProfileUrl14(location.href)
      if (key) {
        const element = $("h1")
        if (element) {
          const title = element.textContent.trim()
          if (title) {
            const meta = { title, type: "user" }
            element.utags = { key, meta }
            matchedNodesSet.add(element)
          }
        }
      }
    },
    getStyle: () => pixiv_net_default,
  }
  var pixiv_net_default2 = site27
  var discourse_default =
    ':not(#a):not(#b):not(#c) a+.utags_ul_0{object-position:100% 0%;--utags-notag-ul-disply: var(--utags-notag-ul-disply-5);--utags-notag-ul-height: var(--utags-notag-ul-height-5);--utags-notag-ul-position: var(--utags-notag-ul-position-5);--utags-notag-ul-top: var(--utags-notag-ul-top-5);--utags-notag-captain-tag-top: -2px;--utags-notag-captain-tag-left: 18px;--utags-captain-tag-background-color: var( --utags-captain-tag-background-color-overlap )}:not(#a):not(#b):not(#c) a+.utags_ul_1{object-position:0% 100%}:not(#a):not(#b):not(#c) .topic-list{--utags-list-node-display: table-row}:not(#a):not(#b):not(#c) .topic-list .main-link a.title+.utags_ul_0{--utags-notag-captain-tag-top: 12px;--utags-notag-captain-tag-left: 0px}:not(#a):not(#b):not(#c) .topic-list .main-link a.title+.utags_ul_1{margin-bottom:2px !important}:not(#a):not(#b):not(#c) .topic-list .discourse-tag+.utags_ul_0{--utags-notag-captain-tag-top: 1px}:not(#a):not(#b):not(#c) .topic-list .discourse-tag+.utags_ul_1{margin-top:3px !important}:not(#a):not(#b):not(#c) .topic-list .posters a:first-of-type+.utags_ul_0{--utags-notag-captain-tag-top: 22px;--utags-notag-captain-tag-left: 0px}:not(#a):not(#b):not(#c) .topic-list .posters a:first-of-type+.utags_ul_1{position:absolute;top:-9999px;z-index:100;margin-top:16px !important;margin-left:3px !important}:not(#a):not(#b):not(#c) header .header-title a.topic-link+.utags_ul_0{--utags-notag-captain-tag-top: -4px}:not(#a):not(#b):not(#c) header .header-title a.topic-link+.utags_ul_1{object-position:100% 200%;position:absolute;top:-9999px;z-index:100;margin-bottom:4px !important}:not(#a):not(#b):not(#c) header .header-title a.topic-link[data-utags_flag=inline]+.utags_ul_1{position:unset;margin-bottom:4px !important}:not(#a):not(#b):not(#c) header .badge-category__wrapper+.utags_ul_1{margin-top:2px !important}:not(#a):not(#b):not(#c) #topic-title a.fancy-title+.utags_ul_0{--utags-notag-captain-tag-top: -8px;--utags-notag-captain-tag-left: -18px}:not(#a):not(#b):not(#c) #topic-title a.fancy-title+.utags_ul_1{margin-bottom:6px !important}:not(#a):not(#b):not(#c) #topic-title .discourse-tag+.utags_ul_1{margin-top:5px !important}:not(#a):not(#b):not(#c) .topic-body .names a+.utags_ul_1{position:absolute;top:-9999px;z-index:100;margin-top:12px !important}:not(#a):not(#b):not(#c) .user-card .user-profile-link[data-utags_fit_content="1"]{display:inline-block !important;width:fit-content !important}:not(#a):not(#b):not(#c) .user-card .user-profile-link[data-utags_fit_content="1"] *:not(svg){width:fit-content !important}:not(#a):not(#b):not(#c) .column .category-list .category-title-link[data-utags_fit_content="1"]{display:inline-block !important;width:fit-content !important}:not(#a):not(#b):not(#c) .column .category-list .category-title-link[data-utags_fit_content="1"] *:not(svg,img){width:fit-content !important}:not(#a):not(#b):not(#c) .column .category-list .category-title-link+.utags_ul_1{object-position:200% 0%;position:absolute;top:-9999px;z-index:100;margin-top:14px !important}:not(#a):not(#b):not(#c) .column .latest-topic-list .main-link .title+.utags_ul_0{--utags-notag-captain-tag-top: 12px}:not(#a):not(#b):not(#c) .column .latest-topic-list .main-link .title+.utags_ul_1{margin-bottom:2px !important}:not(#a):not(#b):not(#c) .column .latest-topic-list .main-link .badge-category__wrapper+.utags_ul_1{padding-top:3px !important}:not(#a):not(#b):not(#c) .column .latest-topic-list .main-link .discourse-tag+.utags_ul_1{margin-top:4px !important}:not(#a):not(#b):not(#c) .column .latest-topic-list .topic-poster a+.utags_ul_0{object-position:0% 200%;--utags-notag-captain-tag-top: 13px;--utags-notag-captain-tag-left: -4px}:not(#a):not(#b):not(#c) .column .latest-topic-list .topic-poster a+.utags_ul_1{object-position:0% 200%;position:absolute;top:-9999px;margin-top:17px !important;margin-left:0px !important}:not(#a):not(#b):not(#c) .search-container{--utags-list-node-display: flex}:not(#a):not(#b):not(#c) .search-container .search-link[data-utags_fit_content="1"]{display:inline-block !important;width:fit-content !important}:not(#a):not(#b):not(#c) .search-container .search-link[data-utags_fit_content="1"] *:not(svg){width:fit-content !important}:not(#a):not(#b):not(#c) .search-container .search-link+.utags_ul_1{object-position:0% 0%;position:absolute;top:-9999px;margin-top:-14px !important}:not(#a):not(#b):not(#c) .search-container .search-results .author a+.utags_ul_0{object-position:0% 200%;--utags-notag-captain-tag-top: 13px;--utags-notag-captain-tag-left: -4px}:not(#a):not(#b):not(#c) .search-container .search-results .author a+.utags_ul_1{object-position:0% 200%;position:absolute;top:-9999px;margin-top:17px !important;margin-left:0px !important}:not(#a):not(#b):not(#c) .user-info .user-detail .name-line a[data-utags_fit_content="1"]{display:inline-block !important;width:fit-content !important}:not(#a):not(#b):not(#c) .user-info .user-detail .name-line a[data-utags_fit_content="1"] *:not(svg){width:fit-content !important}:not(#a):not(#b):not(#c) .bookmark-list.topic-list tr .main-link .title+.utags_ul_0{--utags-notag-captain-tag-top: 0px;--utags-notag-captain-tag-left: 0px}:not(#a):not(#b):not(#c) .bookmark-list.topic-list tr a.avatar+.utags_ul_0{--utags-notag-captain-tag-top: 26px;--utags-notag-captain-tag-left: 0px}:not(#a):not(#b):not(#c) .bookmark-list.topic-list tr a.avatar+.utags_ul_1{position:absolute;top:-9999px;margin-top:24px !important;margin-left:4px !important}:not(#a):not(#b):not(#c) .user-content .user-stream-item__header a.avatar-link+.utags_ul_0{object-position:0% 200%;--utags-notag-captain-tag-top: -4px;--utags-notag-captain-tag-left: -4px}:not(#a):not(#b):not(#c) .user-content .user-stream-item__header a.avatar-link+.utags_ul_1{object-position:0% 200%;position:absolute;top:-9999px;margin-top:2px !important;margin-left:0px !important}:not(#a):not(#b):not(#c) .user-content .user-stream-item__header a.badge-category__wrapper[data-utags_fit_content="1"]{display:inline-block !important;width:fit-content !important}:not(#a):not(#b):not(#c) .user-content .user-stream-item__header a.badge-category__wrapper[data-utags_fit_content="1"] *:not(svg){width:fit-content !important}:not(#a):not(#b):not(#c) .user-content .user-stream-item__header a.badge-category__wrapper+.utags_ul_1{object-position:200% 0%;position:absolute;top:-9999px;margin-top:4px !important;margin-left:0px !important}:not(#a):not(#b):not(#c) .search-menu .results{position:relative}:not(#a):not(#b):not(#c) .search-menu .results .search-link+.utags_ul_0{object-position:0% 200%;--utags-notag-captain-tag-top: -14px;--utags-notag-captain-tag-left: -4px}:not(#a):not(#b):not(#c) [data-utags_list_node]:last-of-type{display:var(--utags-list-node-display) !important}'
  var prefix17 = location.origin + "/"
  var hostname = location.hostname
  function getUserProfileUrl15(url, exact = false) {
    if (url.startsWith(prefix17)) {
      const href2 = url.slice(prefix17.length).toLowerCase()
      if (exact) {
        if (/^u\/[\w.-]+([?#].*)?$/.test(href2)) {
          return prefix17 + href2.replace(/^(u\/[\w.-]+).*/, "$1")
        }
      } else if (/^u\/[\w.-]+/.test(href2)) {
        return prefix17 + href2.replace(/^(u\/[\w.-]+).*/, "$1")
      }
    }
    return void 0
  }
  function getPostUrl3(url, exact = false) {
    if (url.startsWith(prefix17)) {
      const href2 = url.slice(prefix17.length).toLowerCase()
      if (exact) {
        if (/^t\/.+\/\d+(\/\d+)?([?#].*)?$/.test(href2)) {
          return prefix17 + href2.replace(/^(t\/.+\/\d+).*/, "$1")
        }
      } else if (/^t\/.+\/\d+?/.test(href2)) {
        return prefix17 + href2.replace(/^(t\/.+\/\d+).*/, "$1")
      }
    }
    return void 0
  }
  function getCategoryUrl(url, exact = false) {
    if (url.startsWith(prefix17)) {
      const href2 = url.slice(prefix17.length).toLowerCase()
      if (exact) {
        if (/^c\/[\w-]+(\/[\w-]+)?\/\d+([?#].*)?$/.test(href2)) {
          return (
            prefix17 + href2.replace(/^(c\/[\w-]+(\/[\w-]+)?\/\d+).*/, "$1")
          )
        }
      } else if (/^c\/[\w-]+(\/[\w-]+)?\/\d+?/.test(href2)) {
        return prefix17 + href2.replace(/^(c\/[\w-]+(\/[\w-]+)?\/\d+).*/, "$1")
      }
    }
    return void 0
  }
  function getTagUrl(url, exact = false) {
    if (url.startsWith(prefix17)) {
      const href2 = url.slice(prefix17.length).toLowerCase()
      if (exact) {
        if (/^tag\/[^/?#]+([?#].*)?$/.test(href2)) {
          return prefix17 + href2.replace(/^(tag\/[^/?#]+).*/, "$1")
        }
      } else if (/^tag\/[^/?#]+?/.test(href2)) {
        return prefix17 + href2.replace(/^(tag\/[^/?#]+).*/, "$1")
      }
    }
    return void 0
  }
  var site28 = {
    matches:
      /meta\.discourse\.org|linux\.do|meta\.appinn\.net|community\.openai\.com|community\.cloudflare\.com|community\.wanikani\.com/,
    listNodesSelectors: [
      ".topic-list .topic-list-body tr",
      ".topic-area .topic-post",
      ".search-results .fps-result",
    ],
    conditionNodesSelectors: [
      ".topic-list .topic-list-body tr .title",
      ".topic-list .topic-list-body tr .badge-category__wrapper",
      ".topic-list .topic-list-body tr .discourse-tag",
      ".topic-list .topic-list-body tr .posters a:first-of-type",
      ".topic-area .topic-post:nth-of-type(n+2) .names a",
      ".search-results .fps-result .author a",
      ".search-results .fps-result .search-link",
      ".search-results .fps-result .badge-category__wrapper",
      ".search-results .fps-result .discourse-tag",
    ],
    getMatchedNodes() {
      return $$("a[href]:not(.utags_text_tag)").filter((element) => {
        const href = element.href
        if (!href.startsWith(prefix17)) {
          return true
        }
        let key = getUserProfileUrl15(href, true)
        if (key) {
          const title = element.textContent.trim()
          if (
            !title &&
            !element.closest(".topic-list tr .posters a:first-of-type") &&
            !element.closest(".bookmark-list tr a.avatar") &&
            !element.closest(
              ".user-content .user-stream-item__header a.avatar-link"
            ) &&
            !element.closest(".column .latest-topic-list .topic-poster a") &&
            !element.closest(".search-results .author a")
          ) {
            return false
          }
          const meta = { type: "user", title }
          element.utags = { key, meta }
          element.dataset.utags = element.dataset.utags || ""
          return true
        }
        key = getPostUrl3(href)
        if (key) {
          const title = element.textContent.trim()
          if (!title) {
            return false
          }
          if (
            element.closest("header .topic-link") &&
            getComputedStyle(element).display === "inline"
          ) {
            element.dataset.utags_flag = "inline"
          }
          const meta = { type: "post", title }
          element.utags = { key, meta }
          return true
        }
        key = getCategoryUrl(href)
        if (key) {
          const title = element.textContent.trim()
          if (!title) {
            return false
          }
          const meta = { type: "category", title }
          element.utags = { key, meta }
          return true
        }
        key = getTagUrl(href)
        if (key) {
          const title = element.textContent.trim()
          if (!title) {
            return false
          }
          const meta = { type: "tag", title }
          element.utags = { key, meta }
          return true
        }
        return false
      })
    },
    excludeSelectors: [
      ...default_default.excludeSelectors,
      ".topic-map",
      ".names .second",
      ".post-activity",
      ".topic-last-activity",
      ".topic-item-stats .activity",
      ".topic-post-badges",
      ".topic-excerpt",
      ".topic-list-category-expert-tags",
      ".list-vote-count",
      ".post-date",
      ".category__badges",
      ".badge-posts",
      ".topic-timeline",
      ".with-timeline",
      ".sidebar-wrapper",
      "#skip-link",
      "#navigation-bar",
    ],
    validMediaSelectors: [
      "a img.emoji",
      "a svg.svg-string",
      ".category-title-link",
      ".topic-list tr .posters a:first-of-type",
      ".search-results .author a .avatar",
    ],
    addExtraMatchedNodes(matchedNodesSet) {
      const key = getUserProfileUrl15(location.href)
      if (key) {
        const element =
          $(".user-profile-names .username") ||
          $(
            ".user-profile-names .user-profile-names__primary,.user-profile-names .user-profile-names__secondary"
          )
        if (element) {
          const title = element.textContent.trim().trim()
          if (title) {
            const meta = { title, type: "user" }
            element.utags = { key, meta }
            matchedNodesSet.add(element)
          }
        }
      }
    },
    getStyle: () => discourse_default,
  }
  var discourse_default2 = site28
  var nga_cn_default = ""
  var prefix18 = location.origin + "/"
  function getUserProfileUrl16(url) {
    if (url.startsWith(prefix18)) {
      const href2 = url.slice(prefix18.length).toLowerCase()
      if (/^nuke\.php\?func=ucp&uid=\d+/.test(href2)) {
        return (
          prefix18 + href2.replace(/^(nuke\.php\?func=ucp&uid=\d+).*/, "$1")
        )
      }
    }
    return void 0
  }
  var site29 = {
    matches: /bbs\.nga\.cn|nga\.178\.com|ngabbs\.com/,
    getMatchedNodes() {
      return $$("a[href]:not(.utags_text_tag)").filter((element) => {
        const href = element.href
        if (!href.startsWith(prefix18)) {
          return true
        }
        const key = getUserProfileUrl16(href)
        if (key) {
          const title = element.textContent
          if (!title) {
            return false
          }
          const meta = { type: "user", title }
          element.utags = { key, meta }
          element.dataset.utags = element.dataset.utags || ""
          return true
        }
        return false
      })
    },
    excludeSelectors: [
      ...default_default.excludeSelectors,
      ".xxxxxxxxxx",
      ".xxxxxxxxxx",
    ],
    addExtraMatchedNodes(matchedNodesSet) {
      const key = getUserProfileUrl16(location.href)
      if (key) {
        const label = $(
          "#ucpuser_info_blockContent > div > span > div:nth-child(2) > div:nth-child(3) > label"
        )
        if (label) {
          const title = label.textContent.trim()
          if (title === "\u7528\u2002\u6237\u2002\u540D") {
            const element = label.nextElementSibling
            if (element) {
              const title2 = element.textContent.trim()
              if (title2) {
                const meta = { title: title2, type: "user" }
                element.utags = { key, meta }
                matchedNodesSet.add(element)
              }
            }
          }
        }
      }
    },
    getStyle: () => nga_cn_default,
  }
  var nga_cn_default2 = site29
  var dlsite_com_default =
    ":not(#a):not(#b):not(#c) a+.utags_ul_0{--utags-notag-ul-disply: var(--utags-notag-ul-disply-5);--utags-notag-ul-height: var(--utags-notag-ul-height-5);--utags-notag-ul-position: var(--utags-notag-ul-position-5);--utags-notag-ul-top: var(--utags-notag-ul-top-5);--utags-notag-captain-tag-top: var(--utags-notag-captain-tag-top-5);--utags-notag-captain-tag-left: var(--utags-notag-captain-tag-left-5);--utags-captain-tag-background-color: var( --utags-captain-tag-background-color-overlap )}:not(#a):not(#b):not(#c) a+.utags_ul_1{background-color:var(--utags-captain-tag-background-color) !important;border-radius:3px !important;--utags-emoji-tag-background-color: #fff0}:not(#a):not(#b):not(#c) .n_worklist a.work_name+.utags_ul_0,:not(#a):not(#b):not(#c) .n_worklist .work_name a+.utags_ul_0,:not(#a):not(#b):not(#c) .recommend_list a.work_name+.utags_ul_0,:not(#a):not(#b):not(#c) .recommend_list .work_name a+.utags_ul_0{--utags-notag-captain-tag-top: -16px}:not(#a):not(#b):not(#c) .n_worklist a.work_name+.utags_ul_1,:not(#a):not(#b):not(#c) .n_worklist .work_name a+.utags_ul_1,:not(#a):not(#b):not(#c) .recommend_list a.work_name+.utags_ul_1,:not(#a):not(#b):not(#c) .recommend_list .work_name a+.utags_ul_1{position:absolute;top:-9999px;z-index:100;margin-top:-12px !important;margin-left:3px !important}:not(#a):not(#b):not(#c) .n_worklist .maker_name a+.utags_ul_0,:not(#a):not(#b):not(#c) .recommend_list .maker_name a+.utags_ul_0{--utags-notag-captain-tag-top: 16px}:not(#a):not(#b):not(#c) .n_worklist .maker_name a+.utags_ul_1,:not(#a):not(#b):not(#c) .recommend_list .maker_name a+.utags_ul_1{position:absolute;top:-9999px;z-index:100;margin-top:13px !important;margin-left:-2px !important}:not(#a):not(#b):not(#c) .genre_ranking .work_name{margin-top:18px}:not(#a):not(#b):not(#c) .genre_ranking .work_name a+.utags_ul_0{--utags-notag-captain-tag-top: -12px}:not(#a):not(#b):not(#c) .genre_ranking .work_name a+.utags_ul_1{position:absolute;top:-9999px;z-index:100;margin-top:-14px !important;margin-left:3px !important}:not(#a):not(#b):not(#c) .genre_ranking .maker_name{margin-bottom:18px}:not(#a):not(#b):not(#c) .genre_ranking .maker_name a+.utags_ul_1{position:absolute;top:-9999px;z-index:100;margin-top:12px !important;margin-left:-2px !important}"
  var prefix19 = "https://www.dlsite.com/"
  function getProductUrl(url) {
    if (url.startsWith(prefix19)) {
      const href2 = url.slice(prefix19.length)
      if (href2.includes("=/product_id/")) {
        return prefix19 + href2.replace(/^(.+\.html).*/, "$1")
      }
    }
    return void 0
  }
  function getMakerUrl(url) {
    if (url.startsWith(prefix19)) {
      const href2 = url.slice(prefix19.length)
      if (href2.includes("/profile/=/maker_id/")) {
        return prefix19 + href2.replace(/^(.+\.html).*/, "$1")
      }
    }
    return void 0
  }
  var site30 = {
    matches: /dlsite\.com/,
    getMatchedNodes() {
      return $$("a[href]:not(.utags_text_tag)").filter((element) => {
        const href = element.href
        element.dataset.utags_position = "LB"
        if (!href.startsWith(prefix19)) {
          return true
        }
        if (href.includes("/=/")) {
          if (href.includes("=/product_id/")) {
            element.dataset.utags_position = "LT"
          }
          return true
        }
        return false
      })
    },
    excludeSelectors: [
      ...default_default.excludeSelectors,
      "header",
      "#top_header",
      "#header",
      ".topicpath",
      ".link_dl_ch",
      ".floating_cart_box",
      "#work_buy_box_wrapper",
      ".pagetop_block",
      ".matome_btn",
      ".review_all",
      ".review_report",
      ".work_cart",
      ".work_favorite",
      ".title_01",
      ".search_more",
      ".btn_category_sample",
      ".btn_cart",
      ".btn_favorite",
      ".btn_follow",
      ".btn_default",
      ".btn_sample",
      ".left_module",
      ".more_work_btn",
      ".heading_link",
      ".work_edition",
      ".work_btn_list",
      ".trans_work_btn",
      ".work_feature",
      ".work_review",
      ".work_rating",
      ".work_category",
      ".work_btn_link",
      ".sort_box",
      ".search_condition_box",
      ".global_pagination",
      ".page_bottom_link",
      ".trial_download",
      ".btn_trial",
      ".work_win_only",
      ".cp_overview_btn",
      ".cp_overview_list",
      ".option_tab_item",
      ".dc_work_group_footer",
      ".new_worklist_more",
      "#work_win_only",
      "#index2_header",
      ".floor_link",
      ".floor_link_creator",
      ".floor_guide",
      ".l-header",
      ".hd_drawer",
      ".index_header",
      ".index_footer",
      ".left_module_comipo",
      "div#left",
      ".footer_floor_nav",
      ".prof_label_list",
      ".type_btn",
    ],
    addExtraMatchedNodes(matchedNodesSet) {
      let key = getProductUrl(location.href)
      if (key) {
        const element = $("h1#work_name")
        if (element) {
          const title = element.textContent.trim()
          if (title) {
            const meta = { title }
            element.utags = { key, meta }
            matchedNodesSet.add(element)
          }
        }
      }
      key = getMakerUrl(location.href)
      if (key) {
        const element = $(".prof_maker_name")
        if (element) {
          const title = element.textContent.trim()
          if (title) {
            const meta = { title }
            element.utags = { key, meta }
            matchedNodesSet.add(element)
          }
        }
      }
    },
    getStyle: () => dlsite_com_default,
  }
  var dlsite_com_default2 = site30
  var keylol_com_default =
    ":not(#a):not(#b):not(#c) a+.utags_ul_0{--utags-notag-ul-disply: var(--utags-notag-ul-disply-5);--utags-notag-ul-height: var(--utags-notag-ul-height-5);--utags-notag-ul-position: var(--utags-notag-ul-position-5);--utags-notag-ul-top: var(--utags-notag-ul-top-5);--utags-notag-captain-tag-top: 0;--utags-notag-captain-tag-left: 20px;--utags-captain-tag-background-color: var( --utags-captain-tag-background-color-overlap )}:not(#a):not(#b):not(#c) a+.utags_ul_1{position:absolute;top:-9999px;z-index:100;margin-top:14px !important}"
  var prefix20 = location.origin + "/"
  function getUserProfileUrl17(url, exact = false) {
    if (url.startsWith(prefix20)) {
      const href2 = url.slice(prefix20.length).toLowerCase()
      if (exact) {
        if (/^\?\d+(#.*)?$/.test(href2)) {
          return (
            prefix20 + href2.replace(/^\?(\d+).*/, "home.php?mod=space&uid=$1")
          )
        }
        if (/^suid-\d+(#.*)?$/.test(href2)) {
          return (
            prefix20 +
            href2.replace(/^suid-(\d+).*/, "home.php?mod=space&uid=$1")
          )
        }
        if (/^home\.php\?mod=space&uid=\d+(#.*)?$/.test(href2)) {
          return (
            prefix20 +
            href2.replace(
              /^home\.php\?mod=space&uid=(\d+).*/,
              "home.php?mod=space&uid=$1"
            )
          )
        }
      } else if (/^u\/[\w.-]+/.test(href2)) {
        return prefix20 + href2.replace(/^(u\/[\w.-]+).*/, "$1")
      }
    }
    return void 0
  }
  var site31 = {
    matches: /keylol\.com/,
    getMatchedNodes() {
      return $$("a[href]:not(.utags_text_tag)").filter((element) => {
        const href = element.href
        element.dataset.utags_position = "LB"
        if (!href.startsWith(prefix20)) {
          return true
        }
        const key = getUserProfileUrl17(href, true)
        if (key) {
          const title = element.textContent
          if (!title) {
            return false
          }
          const meta = { type: "user", title }
          element.dataset.utags_position = "LB"
          element.utags = { key, meta }
          element.dataset.utags = element.dataset.utags || ""
          return true
        }
        return false
      })
    },
    excludeSelectors: [
      ...default_default.excludeSelectors,
      "nav",
      "header",
      "#pgt",
      "#fd_page_bottom",
      "#visitedforums",
      "#pt",
    ],
    getStyle: () => keylol_com_default,
  }
  var keylol_com_default2 = site31
  var pornhub_com_default =
    ':not(#a):not(#b):not(#c) .usernameWrap .utags_ul_0 .utags_captain_tag{left:-20px}:not(#a):not(#b):not(#c) .usernameWrap .utags_ul_1::before{content:"";display:block}:not(#a):not(#b):not(#c) .vidTitleWrapper .title .utags_ul_0{display:block !important;height:0;position:absolute;top:0}:not(#a):not(#b):not(#c) .vidTitleWrapper .title .utags_ul_0 .utags_captain_tag{background-color:rgba(255,255,255,.8666666667) !important}:not(#a):not(#b):not(#c) .vidTitleWrapper .title .utags_ul_1{display:block !important;height:0;position:absolute;bottom:0}:not(#a):not(#b):not(#c) ul.videos .thumbnail-info-wrapper{position:relative}:not(#a):not(#b):not(#c) ul.videos .thumbnail-info-wrapper .title .utags_ul_0{display:block !important;height:0;position:absolute;top:0}:not(#a):not(#b):not(#c) ul.videos .thumbnail-info-wrapper .title .utags_ul_0 .utags_captain_tag{background-color:rgba(255,255,255,.8666666667) !important}:not(#a):not(#b):not(#c) ul.videos .thumbnail-info-wrapper .title .utags_ul_1{display:block !important;height:0;position:absolute;bottom:0}'
  var prefix21 = "https://www.pornhub.com/"
  function getUserProfileUrl18(href, exact = false) {
    if (href.includes("pornhub.com")) {
      const index = href.indexOf("pornhub.com") + 12
      const href2 = href.slice(index)
      if (exact) {
        if (/^(model|users)\/[\w-]+(\?.*)?$/.test(href2)) {
          return prefix21 + href2.replace(/(^(model|users)\/[\w-]+).*/, "$1")
        }
      } else if (/^(model|users)\/[\w-]+/.test(href2)) {
        return prefix21 + href2.replace(/(^(model|users)\/[\w-]+).*/, "$1")
      }
    }
    return void 0
  }
  function getChannelUrl(href, exact = false) {
    if (href.includes("pornhub.com")) {
      const index = href.indexOf("pornhub.com") + 12
      const href2 = href.slice(index)
      if (exact) {
        if (/^channels\/[\w-]+(\?.*)?$/.test(href2)) {
          return prefix21 + href2.replace(/(^channels\/[\w-]+).*/, "$1")
        }
      } else if (/^channels\/[\w-]+/.test(href2)) {
        return prefix21 + href2.replace(/(^channels\/[\w-]+).*/, "$1")
      }
    }
    return void 0
  }
  function getVideoUrl4(href) {
    if (href.includes("pornhub.com")) {
      const index = href.indexOf("pornhub.com") + 12
      const href2 = href.slice(index)
      if (/^view_video.php\?viewkey=\w+/.test(href2)) {
        return prefix21 + href2.replace(/(view_video.php\?viewkey=\w+).*/, "$1")
      }
    }
    return void 0
  }
  var site32 = {
    matches: /pornhub\.com/,
    getMatchedNodes() {
      return $$("a[href]:not(.utags_text_tag)").filter((element) => {
        const hrefAttr = getAttribute(element, "href")
        if (!hrefAttr || hrefAttr === "null" || hrefAttr === "#") {
          return false
        }
        const href = element.href
        let key = getChannelUrl(href, true)
        if (key) {
          const meta = { type: "channel" }
          element.utags = { key, meta }
          return true
        }
        key = getUserProfileUrl18(href, true)
        if (key) {
          const meta = { type: "user" }
          element.utags = { key, meta }
          return true
        }
        key = getVideoUrl4(href)
        if (key) {
          let title
          const titleElement = $("#video-title", element)
          if (titleElement) {
            title = titleElement.textContent
          }
          const meta = title ? { title, type: "video" } : { type: "video" }
          element.utags = { key, meta }
          return true
        }
        return true
      })
    },
    excludeSelectors: [
      ...default_default.excludeSelectors,
      ".networkBarWrapper",
      "#headerWrapper",
      "#headerMenuContainer",
      "#mainMenuProfile",
      "#mainMenuAmateurModelProfile",
      "#countryRedirectMessage",
      "aside#leftMenu",
      ".profileSubNav",
      ".subFilterList",
      ".greyButton",
      ".orangeButton",
    ],
    addExtraMatchedNodes(matchedNodesSet) {
      let key = getUserProfileUrl18(location.href)
      if (key) {
        const element = $(".name h1")
        if (element) {
          const title = element.textContent.trim()
          if (title) {
            const meta = { title, type: "user" }
            element.utags = { key, meta }
            matchedNodesSet.add(element)
          }
        }
      }
      key = getChannelUrl(location.href)
      if (key) {
        const element = $(".title h1")
        if (element && !$("a", element)) {
          const title = element.textContent.trim()
          if (title) {
            const meta = { title, type: "channel" }
            element.utags = { key, meta }
            matchedNodesSet.add(element)
          }
        }
      }
      key = getVideoUrl4(location.href)
      if (key) {
        const element = $("h1.title")
        if (element) {
          const title = element.textContent.trim()
          if (title) {
            const meta = { title, type: "video" }
            element.utags = { key, meta }
            matchedNodesSet.add(element)
          }
        }
      }
    },
    getStyle: () => pornhub_com_default,
  }
  var pornhub_com_default2 = site32
  var e_hentai_org_default =
    ":not(#a):not(#b):not(#c) div.gt a+.utags_ul_0,:not(#a):not(#b):not(#c) div.gtl a+.utags_ul_0,:not(#a):not(#b):not(#c) div.gtw a+.utags_ul_0,:not(#a):not(#b):not(#c) div.gl4e.glname .glink+.utags_ul_0,:not(#a):not(#b):not(#c) .gltm .glname a+.utags_ul_0,:not(#a):not(#b):not(#c) .gltc .glname a+.utags_ul_0{--utags-notag-ul-disply: var(--utags-notag-ul-disply-3);--utags-notag-ul-height: var(--utags-notag-ul-height-3);--utags-notag-ul-position: var(--utags-notag-ul-position-3);--utags-notag-ul-top: var(--utags-notag-ul-top-3);--utags-notag-captain-tag-top: var(--utags-notag-captain-tag-top-3);--utags-notag-captain-tag-left: 24px;--utags-captain-tag-background-color: var( --utags-captain-tag-background-color-overlap );z-index:200}:not(#a):not(#b):not(#c) div.gl1t a+.utags_ul_0{--utags-notag-ul-disply: var(--utags-notag-ul-disply-4);--utags-notag-ul-height: var(--utags-notag-ul-height-4);--utags-notag-ul-position: var(--utags-notag-ul-position-4);--utags-notag-ul-top: var(--utags-notag-ul-top-4);--utags-notag-captain-tag-top: var(--utags-notag-captain-tag-top-4);--utags-notag-captain-tag-left: 24px;--utags-captain-tag-background-color: var( --utags-captain-tag-background-color-overlap )}"
  var prefix26 = "https://e-hentai.org/"
  var prefix27 = "https://exhentai.org/"
  function getPostUrl4(url) {
    if (url.startsWith(prefix26)) {
      const href2 = url.slice(21)
      if (/^g\/\w+/.test(href2)) {
        return prefix26 + href2.replace(/^(g\/\w+\/\w+\/).*/, "$1")
      }
    }
    if (url.startsWith(prefix27)) {
      const href2 = url.slice(21)
      if (/^g\/\w+/.test(href2)) {
        return prefix27 + href2.replace(/^(g\/\w+\/\w+\/).*/, "$1")
      }
    }
    return void 0
  }
  function isImageViewUrl(url) {
    if (url.startsWith(prefix26)) {
      const href2 = url.slice(21)
      return /^s\/\w+/.test(href2)
    }
    if (url.startsWith(prefix27)) {
      const href2 = url.slice(21)
      return /^s\/\w+/.test(href2)
    }
    return false
  }
  var site33 = {
    matches: /e-hentai\.org|exhentai\.org/,
    getMatchedNodes() {
      return $$("a[href]:not(.utags_text_tag)")
        .filter((element) => {
          const href = element.href
          if (href.startsWith(prefix26) || href.startsWith(prefix27)) {
            const key = getPostUrl4(href)
            if (key) {
              const titleElement = $(".glink", element)
              let title
              if (titleElement) {
                title = titleElement.textContent
              }
              const meta = { type: "post" }
              if (title) {
                meta.title = title
              }
              element.utags = { key, meta }
              return true
            }
            if (isImageViewUrl(href)) {
              return false
            }
          }
          return true
        })
        .map((element) => {
          const titleElement = $(".gl4e.glname .glink", element)
          if (titleElement) {
            titleElement.utags = element.utags
            titleElement.dataset.utags = titleElement.dataset.utags || ""
            titleElement.dataset.utags_node_type = "link"
            console.log(titleElement.utags)
            return titleElement
          }
          return element
        })
    },
    excludeSelectors: [
      ...default_default.excludeSelectors,
      "#nb",
      ".searchnav",
      ".gtb",
      'a[href*="report=select"]',
      'a[href*="act=expunge"]',
    ],
    addExtraMatchedNodes(matchedNodesSet) {
      const key = getPostUrl4(location.href)
      if (key) {
        const element = getFirstHeadElement()
        if (element) {
          const title = element.textContent.trim()
          if (title) {
            const meta = { title, type: "post" }
            element.utags = { key, meta }
            matchedNodesSet.add(element)
          }
        }
      }
    },
    getStyle: () => e_hentai_org_default,
  }
  var e_hentai_org_default2 = site33
  var panda_chaika_moe_default =
    ":not(#a):not(#b):not(#c) h5+.utags_ul{display:block !important;margin-top:-4px !important;margin-bottom:6px !important}"
  var prefix28 = "https://panda.chaika.moe/"
  function getPostUrl5(url, exact = false) {
    if (url.startsWith(prefix28)) {
      const href2 = url.slice(25)
      if (exact) {
        if (/^archive\/\d+\/(\?.*)?$/.test(href2)) {
          return prefix28 + href2.replace(/^(archive\/\d+\/).*/, "$1")
        }
      } else if (/^archive\/\d+\//.test(href2)) {
        return prefix28 + href2.replace(/^(archive\/\d+\/).*/, "$1")
      }
    }
    return void 0
  }
  var site34 = {
    matches: /panda\.chaika\.moe/,
    matchedNodesSelectors: ["a[href]:not(.utags_text_tag)"],
    excludeSelectors: [
      ...default_default.excludeSelectors,
      ".navbar",
      "th",
      ".pagination",
      ".btn",
      ".caption",
    ],
    addExtraMatchedNodes(matchedNodesSet) {
      const key = getPostUrl5(location.href)
      if (key) {
        const element = $("h5")
        if (element) {
          const title = element.textContent.trim()
          if (title) {
            const meta = { title, type: "post" }
            element.utags = { key, meta }
            matchedNodesSet.add(element)
          }
        }
      }
      for (const element of $$(".gallery a.cover")) {
        const key2 = element.href
        const titleElement = $(".cover-title", element)
        if (titleElement) {
          const title = titleElement.textContent
          const meta = { title, type: "post" }
          titleElement.utags = { key: key2, meta }
          titleElement.dataset.utags_node_type = "link"
          matchedNodesSet.add(titleElement)
        }
      }
      for (const element of $$('.td-extended > a[href^="/archive/"]')) {
        const key2 = element.href
        const titleElement = $("h5", element.parentElement.parentElement)
        if (titleElement) {
          const title = titleElement.textContent
          const meta = { title, type: "post" }
          titleElement.utags = { key: key2, meta }
          titleElement.dataset.utags_node_type = "link"
          matchedNodesSet.add(titleElement)
        }
      }
    },
    getStyle: () => panda_chaika_moe_default,
  }
  var panda_chaika_moe_default2 = site34
  var dmm_co_jp_default =
    ":not(#a):not(#b):not(#c) a+.utags_ul_0{--utags-notag-ul-disply: var(--utags-notag-ul-disply-5);--utags-notag-ul-height: var(--utags-notag-ul-height-5);--utags-notag-ul-position: var(--utags-notag-ul-position-5);--utags-notag-ul-top: var(--utags-notag-ul-top-5);--utags-notag-captain-tag-top: var(--utags-notag-captain-tag-top-5);--utags-notag-captain-tag-left: var(--utags-notag-captain-tag-left-5);--utags-captain-tag-background-color: var( --utags-captain-tag-background-color-overlap )}:not(#a):not(#b):not(#c) a+.utags_ul_1{background-color:var(--utags-captain-tag-background-color) !important;border-radius:3px !important;--utags-emoji-tag-background-color: #fff0}:not(#a):not(#b):not(#c) .productList .tileListTtl__txt{margin-bottom:16px}:not(#a):not(#b):not(#c) .productList .tileListTtl__txt a+.utags_ul_0{--utags-notag-captain-tag-top: 16px}:not(#a):not(#b):not(#c) .productList .tileListTtl__txt a+.utags_ul_1{position:absolute;top:-9999px;z-index:100;margin-top:15px !important;margin-left:0px !important}:not(#a):not(#b):not(#c) .productList .tileListTtl__txt--author a+.utags_ul_0{--utags-notag-captain-tag-top: 16px}:not(#a):not(#b):not(#c) .productList .tileListTtl__txt--author a+.utags_ul_1{position:absolute;top:-9999px;z-index:100;margin-top:15px !important;margin-left:0px !important}:not(#a):not(#b):not(#c) .mainList__item a+.utags_ul_0{--utags-notag-captain-tag-top: -90px;--utags-notag-captain-tag-left: 4px}:not(#a):not(#b):not(#c) .mainList__item a+.utags_ul_1{position:absolute;top:-9999px;z-index:100;margin-top:-90px !important;margin-left:10px !important}:not(#a):not(#b):not(#c) .pickup .fn-responsiveImg a+.utags_ul_0{--utags-notag-captain-tag-top: -70px;--utags-notag-captain-tag-left: 4px}:not(#a):not(#b):not(#c) .pickup .fn-responsiveImg a+.utags_ul_1{position:absolute;top:-9999px;z-index:100;margin-top:-70px !important;margin-left:10px !important}:not(#a):not(#b):not(#c) #l-areaRecommendProduct a+.utags_ul_0{--utags-notag-captain-tag-top: -80px;--utags-notag-captain-tag-left: 4px}:not(#a):not(#b):not(#c) #l-areaRecommendProduct a+.utags_ul_1{position:absolute;top:-9999px;z-index:100;margin-top:-80px !important;margin-left:8px !important}"
  var prefix29 = "https://www.dmm.co.jp/"
  function getCanonicalUrl9(url) {
    if (url.startsWith(prefix29)) {
      const href2 = url.slice(prefix29.length)
      if (href2.includes("/=/")) {
        return prefix29 + href2.replace(/\?.*/, "")
      }
    }
    return url
  }
  function getProductUrl2(url) {
    if (url.startsWith(prefix29)) {
      const href2 = url.slice(prefix29.length)
      if (href2.includes("/detail/=/cid=")) {
        return prefix29 + href2.replace(/\?.*/, "")
      }
    }
    return void 0
  }
  function getMakerUrl2(url) {
    if (url.startsWith(prefix29)) {
      const href2 = url.slice(prefix29.length)
      if (href2.includes("/list/=/article=maker/id=")) {
        return prefix29 + href2.replace(/\?.*/, "")
      }
    }
    return void 0
  }
  var site35 = {
    matches: /dmm\.co\.jp/,
    getMatchedNodes() {
      return $$("a[href]:not(.utags_text_tag)").filter((element) => {
        const href = element.href
        element.dataset.utags_position = "LB"
        if (!href.startsWith(prefix29)) {
          return true
        }
        if (href.includes("/=/")) {
          return true
        }
        return false
      })
    },
    excludeSelectors: [
      ...default_default.excludeSelectors,
      "header",
      ".localNav-list",
      ".m-leftNavigation",
      ".l-areaSideNavColumn",
      ".top-leftcolumn",
      ".top-rightcolumn",
      ".d-btn-xhi-st",
      ".headingTitle__txt--more",
      ".recommendCapt__txt",
      ".circleFanButton__content",
      ".displayFormat",
      ".pageNationList",
      ".nav-text-container",
      ".sub-nav-link",
      ".m-listHeader",
      ".dcd-review__rating_map",
      ".dcd-review_boxpagenation",
    ],
    validMediaSelectors: [
      ".mainList",
      ".pickup .fn-responsiveImg",
      "#l-areaRecommendProduct",
    ],
    addExtraMatchedNodes(matchedNodesSet) {
      let key = getProductUrl2(location.href)
      if (key) {
        const element = $("h1.productTitle__txt")
        if (element) {
          const title = element.textContent.trim()
          if (title) {
            const meta = { title }
            element.utags = { key, meta }
            matchedNodesSet.add(element)
          }
        }
      }
      key = getMakerUrl2(location.href)
      if (key) {
        const element = $(".circleProfile__name span")
        if (element) {
          const title = element.textContent.trim()
          if (title) {
            const meta = { title }
            element.utags = { key, meta }
            matchedNodesSet.add(element)
          }
        }
      }
    },
    getCanonicalUrl: getCanonicalUrl9,
    getStyle: () => dmm_co_jp_default,
  }
  var dmm_co_jp_default2 = site35
  var kemono_su_default =
    ":not(#a):not(#b):not(#c) a.user-header__avatar+.utags_ul_0,:not(#a):not(#b):not(#c) a.user-card+.utags_ul_0,:not(#a):not(#b):not(#c) .post-card a+.utags_ul_0{--utags-notag-ul-disply: var(--utags-notag-ul-disply-5);--utags-notag-ul-height: var(--utags-notag-ul-height-5);--utags-notag-ul-position: var(--utags-notag-ul-position-5);--utags-notag-ul-top: var(--utags-notag-ul-top-5);--utags-notag-captain-tag-top: -4px;--utags-notag-captain-tag-left: 2px;--utags-captain-tag-background-color: var( --utags-captain-tag-background-color-overlap );transition:top ease .1s,left ease .1s}:not(#a):not(#b):not(#c) a.user-header__avatar+.utags_ul_1,:not(#a):not(#b):not(#c) a.user-card+.utags_ul_1,:not(#a):not(#b):not(#c) .post-card a+.utags_ul_1{position:absolute;top:-9999px;z-index:100;margin-top:-6px !important;margin-left:4px !important;transition:top ease .1s,left ease .1s}:not(#a):not(#b):not(#c) a.user-header__avatar+.utags_ul_1 .utags_text_tag,:not(#a):not(#b):not(#c) a.user-card+.utags_ul_1 .utags_text_tag,:not(#a):not(#b):not(#c) .post-card a+.utags_ul_1 .utags_text_tag{--utags-text-tag-background-color: yellow}"
  var prefix30 = location.origin + "/"
  function getPostUrl6(url) {
    if (url.startsWith(prefix30)) {
      const href2 = url.slice(prefix30.length)
      if (/^\w+\/user\/\w+\/post\/\w+/.test(href2)) {
        return prefix30 + href2.replace(/^(\w+\/user\/\w+\/post\/\w+).*/, "$1")
      }
    }
    return void 0
  }
  var site36 = {
    matches: /kemono\.su|coomer\.su|nekohouse\.su/,
    getMatchedNodes() {
      return $$("a[href]:not(.utags_text_tag)").filter((element) => {
        const href = element.href
        const hrefAttr = getAttribute(element, "href")
        if (hrefAttr.startsWith("#")) {
          return false
        }
        if (!href.startsWith(prefix30)) {
          return true
        }
        if (
          hasClass(element, "user-card") ||
          hasClass(element, "user-header__avatar") ||
          element.closest(".post-card")
        ) {
          element.dataset.utags_position = "LB"
          element.dataset.utags = element.dataset.utags || ""
        }
        return true
      })
    },
    validMediaSelectors: [
      ".user-header .user-header__avatar",
      ".user-header .user-header__profile",
      ".user-card",
      ".post-card__image",
      ".post-card",
    ],
    excludeSelectors: [
      ...default_default.excludeSelectors,
      ".global-sidebar",
      ".paginator",
      ".post__nav-links",
      ".scrape__nav-links",
      ".tabs",
      ".user-header__actions",
      ".posts-board__sidebar",
      "#add-new-link",
      'a[href^="/authentication/"]',
    ],
    addExtraMatchedNodes(matchedNodesSet) {
      const key = getPostUrl6(location.href)
      if (key) {
        const element = $("h1.post__title,h1.scrape__title")
        if (element) {
          const title = element.textContent.trim()
          if (title) {
            const meta = { title, type: "post" }
            element.utags = { key, meta }
            matchedNodesSet.add(element)
          }
        }
      }
    },
    getStyle: () => kemono_su_default,
  }
  var kemono_su_default2 = site36
  var rule34video_com_default =
    ":not(#a):not(#b):not(#c) a+.utags_ul_0{object-position:200% 50%;--utags-notag-ul-disply: var(--utags-notag-ul-disply-5);--utags-notag-ul-height: var(--utags-notag-ul-height-5);--utags-notag-ul-position: var(--utags-notag-ul-position-5);--utags-notag-ul-top: var(--utags-notag-ul-top-5);--utags-notag-captain-tag-top: var(--utags-notag-captain-tag-top-5);--utags-notag-captain-tag-left: var(--utags-notag-captain-tag-left-5);--utags-captain-tag-background-color: var( --utags-captain-tag-background-color-overlap )}:not(#a):not(#b):not(#c) a+.utags_ul_1{object-position:0% 200%}:not(#a):not(#b):not(#c) .thumbs .thumb a+.utags_ul_0{object-position:0% 200%;--utags-notag-captain-tag-top: -2px;--utags-notag-captain-tag-left: -4px}:not(#a):not(#b):not(#c) .list_items .item a.wrap_item+.utags_ul_0,:not(#a):not(#b):not(#c) .aside_wrap a.item+.utags_ul_0{object-position:100% 50%}"
  var prefix31 = location.origin + "/"
  function getModelUrl(url) {
    if (url.startsWith(prefix31)) {
      const href2 = url.slice(prefix31.length)
      if (/^models\/[\w-]+/.test(href2)) {
        return prefix31 + href2.replace(/^(models\/[\w-]+).*/, "$1") + "/"
      }
    }
    return void 0
  }
  function getMemberUrl(url) {
    if (url.startsWith(prefix31)) {
      const href2 = url.slice(prefix31.length)
      if (/^members\/\d+/.test(href2)) {
        return prefix31 + href2.replace(/^(members\/\d+).*/, "$1") + "/"
      }
    }
    return void 0
  }
  function getCategoryUrl2(url) {
    if (url.startsWith(prefix31)) {
      const href2 = url.slice(prefix31.length)
      if (/^categories\/[\w-]+/.test(href2)) {
        return prefix31 + href2.replace(/^(categories\/[\w-]+).*/, "$1") + "/"
      }
    }
    return void 0
  }
  function getVideoUrl5(url) {
    if (url.startsWith(prefix31)) {
      const href2 = url.slice(prefix31.length)
      if (/^video\/\d+(\/[\w-]+)?/.test(href2)) {
        return (
          prefix31 + href2.replace(/^(video\/\d+(\/[\w-]+)?).*/, "$1") + "/"
        )
      }
    }
    return void 0
  }
  var site37 = {
    matches: /rule34video\.com|rule34gen\.com/,
    listNodesSelectors: [
      //
      ".list-comments .item",
      ".thumbs .item",
    ],
    conditionNodesSelectors: [
      //
      ".list-comments .item .comment-info .inner a",
      ".thumbs .item a.th",
    ],
    getMatchedNodes() {
      return $$("a[href]:not(.utags_text_tag)").filter((element) => {
        const href = element.href
        if (!href.startsWith(prefix31)) {
          if ($("header", element.parentElement)) {
            const key2 = href.replace(/(https?:\/\/[^/]+\/).*/, "$1")
            const meta = { type: "AD", title: "AD" }
            element.utags = { key: key2, meta }
            element.dataset.utags = element.dataset.utags || ""
          }
          return true
        }
        const key = getVideoUrl5(href)
        if (key) {
          const titleElement = $(".thumb_title", element)
          const title = titleElement
            ? titleElement.textContent.trim()
            : element.textContent.trim()
          if (!title) {
            return false
          }
          const meta = { type: "video", title }
          element.utags = { key, meta }
          element.dataset.utags = element.dataset.utags || ""
          return true
        }
        element.dataset.utags = element.dataset.utags || ""
        return true
      })
    },
    excludeSelectors: [
      ...default_default.excludeSelectors,
      ".header",
      ".btn_more",
      ".tabs-menu",
      ".pagination",
      ".headline",
      ".prev",
      ".next",
      ".btn",
      ".all",
      ".tag_item_suggest",
      'a[href*="download"]',
      ".list-comments .wrap_image",
    ],
    addExtraMatchedNodes(matchedNodesSet) {
      let key = getModelUrl(location.href)
      if (key) {
        const element = $(".brand_inform .title")
        if (element) {
          const title = element.textContent.trim()
          if (title) {
            const meta = { title, type: "model" }
            element.utags = { key, meta }
            matchedNodesSet.add(element)
          }
        }
      }
      key = getMemberUrl(location.href)
      if (key) {
        const element = $(".channel_logo .title")
        if (element) {
          const title = element.textContent.trim()
          if (title) {
            const meta = { title, type: "user" }
            element.utags = { key, meta }
            matchedNodesSet.add(element)
          }
        }
      }
      key = getCategoryUrl2(location.href)
      if (key) {
        const element = $(".brand_inform .title")
        if (element) {
          const title = element.textContent.trim()
          if (title) {
            const meta = { title, type: "category" }
            element.utags = { key, meta }
            matchedNodesSet.add(element)
          }
        }
      }
      key = getVideoUrl5(location.href)
      if (key) {
        const element = $("h1.title_video")
        if (element) {
          const title = element.textContent.trim()
          if (title) {
            const meta = { title, type: "video" }
            element.utags = { key, meta }
            matchedNodesSet.add(element)
          }
        }
      }
    },
    getStyle: () => rule34video_com_default,
  }
  var rule34video_com_default2 = site37
  var sites = [
    github_com_default2,
    v2ex_default,
    twitter_com_default2,
    reddit_com_default2,
    greasyfork_org_default2,
    news_ycombinator_com_default,
    lobste_rs_default,
    mp_weixin_qq_com_default,
    instagram_com_default2,
    threads_net_default2,
    facebook_com_default2,
    youtube_com_default2,
    bilibili_com_default2,
    tiktok_com_default2,
    pojie_cn_default2,
    juejin_cn_default,
    zhihu_com_default,
    xiaohongshu_com_default2,
    weibo_com_default,
    sspai_com_default2,
    douyin_com_default2,
    podcasts_google_com_default2,
    rebang_today_default2,
    myanimelist_net_default2,
    douban_com_default,
    pixiv_net_default2,
    discourse_default2,
    nga_cn_default2,
    keylol_com_default2,
    pornhub_com_default2,
    e_hentai_org_default2,
    panda_chaika_moe_default2,
    dlsite_com_default2,
    dmm_co_jp_default2,
    kemono_su_default2,
    rule34video_com_default2,
  ]
  var getCanonicalUrlFunctionList = [default_default, ...sites]
    .map((site38) => site38.getCanonicalUrl)
    .filter((v) => typeof v === "function")
  function matchedSite(hostname3) {
    for (const s of sites) {
      if (s.matches.test(hostname3)) {
        return s
      }
    }
    if (false) {
      return siteForExtensions(hostname3)
    }
    return default_default
  }
  var hostname2 = location.hostname
  var currentSite = matchedSite(hostname2)
  function getListNodes() {
    if (typeof currentSite.preProcess === "function") {
      currentSite.preProcess()
    }
    if (typeof currentSite.getStyle === "function" && !$("#utags_site_style")) {
      const styleText = currentSite.getStyle()
      if (styleText) {
        addElement2("style", {
          textContent: styleText,
          id: "utags_site_style",
        })
      }
    }
    if (typeof currentSite.getListNodes === "function") {
      return currentSite.getListNodes()
    }
    if (currentSite.listNodesSelectors) {
      return $$(currentSite.listNodesSelectors.join(",") || "none")
    }
    return []
  }
  function getConditionNodes() {
    if (typeof currentSite.getConditionNodes === "function") {
      return currentSite.getConditionNodes()
    }
    if (currentSite.conditionNodesSelectors) {
      return $$(currentSite.conditionNodesSelectors.join(",") || "none")
    }
    return []
  }
  function getCanonicalUrl10(url) {
    for (const getCanonicalUrlFunc of getCanonicalUrlFunctionList) {
      if (getCanonicalUrlFunc) {
        url = getCanonicalUrlFunc(url)
      }
    }
    return url
  }
  var isValidUtagsElement = (element, validMediaSelector) => {
    if (element.dataset.utags !== void 0) {
      return true
    }
    if (!element.textContent) {
      return false
    }
    const media = $(
      'img,svg,audio,video,button,.icon,[style*="background-image"]',
      element
    )
    if (media) {
      if (!validMediaSelector) {
        return false
      }
      if (!media.closest(validMediaSelector)) {
        return false
      }
    }
    let href = getAttribute(element, "href")
    if (!href) {
      return false
    }
    href = href.trim()
    if (href.length === 0 || href === "#") {
      return false
    }
    const protocol = element.protocol
    if (protocol !== "http:" && protocol !== "https:") {
      return false
    }
    return true
  }
  var isExcluedUtagsElement = (element, excludeSelector) => {
    return excludeSelector ? Boolean(element.closest(excludeSelector)) : false
  }
  var addMatchedNodes = (matchedNodesSet) => {
    let elements
    if (typeof currentSite.getMatchedNodes === "function") {
      elements = currentSite.getMatchedNodes()
    } else {
      const matchedNodesSelectors = currentSite.matchedNodesSelectors
      if (!matchedNodesSelectors || matchedNodesSelectors.length === 0) {
        return
      }
      elements = $$(matchedNodesSelectors.join(",") || "none")
    }
    if (elements.length === 0) {
      return
    }
    const excludeSelectors = currentSite.excludeSelectors || []
    const excludeSelector = excludeSelectors.join(",")
    const validMediaSelectors = currentSite.validMediaSelectors || []
    const validMediaSelector = validMediaSelectors.join(",")
    for (const element of elements) {
      if (
        !isValidUtagsElement(element, validMediaSelector) ||
        isExcluedUtagsElement(element, excludeSelector)
      ) {
        element.utags = {}
        continue
      }
      const utags = element.utags || {}
      const key = utags.key || getCanonicalUrl10(element.href)
      const title = element.textContent.trim()
      const meta = {}
      if (title && !isUrl(title)) {
        meta.title = title
      }
      element.utags = {
        key,
        meta: utags.meta ? Object.assign(meta, utags.meta) : meta,
      }
      matchedNodesSet.add(element)
    }
  }
  function matchedNodes() {
    const matchedNodesSet = /* @__PURE__ */ new Set()
    addMatchedNodes(matchedNodesSet)
    if (typeof currentSite.addExtraMatchedNodes === "function") {
      currentSite.addExtraMatchedNodes(matchedNodesSet)
    }
    if (typeof currentSite.postProcess === "function") {
      currentSite.postProcess()
    }
    return [...matchedNodesSet]
  }
  var config = {
    run_at: "document_start",
  }
  var emojiTags2
  var host = location.host
  var isEnabledByDefault = () => {
    if (host.includes("www.bilibili.com")) {
      return false
    }
    return true
  }
  var isTagManager = location.href.includes("utags.pipecraft.net/tags/")
  var settingsTable2 = {
    ["enableCurrentSite_".concat(host)]: {
      title: i2("settings.enableCurrentSite"),
      defaultValue: isEnabledByDefault(),
    },
    showHidedItems: {
      title: i2("settings.showHidedItems"),
      defaultValue: false,
      group: 2,
    },
    noOpacityEffect: {
      title: i2("settings.noOpacityEffect"),
      defaultValue: false,
      group: 2,
    },
    pinnedTagsTitle: {
      title: i2("settings.pinnedTags"),
      type: "action",
      async onclick() {
        const input = $('textarea[data-key="pinnedTags"]')
        if (input) {
          input.focus()
        }
      },
      group: 3,
    },
    pinnedTags: {
      title: i2("settings.pinnedTags"),
      defaultValue: i2("settings.pinnedTagsDefaultValue"),
      placeholder: i2("settings.pinnedTagsPlaceholder"),
      type: "textarea",
      group: 3,
    },
    emojiTagsTitle: {
      title: i2("settings.emojiTags"),
      type: "action",
      async onclick() {
        const input = $('textarea[data-key="emojiTags"]')
        if (input) {
          input.focus()
        }
      },
      group: 3,
    },
    emojiTags: {
      title: i2("settings.emojiTags"),
      defaultValue:
        "\u{1F44D}, \u{1F44E}, \u2764\uFE0F, \u2B50, \u{1F31F}, \u{1F525}, \u{1F4A9}, \u26A0\uFE0F, \u{1F4AF}, \u{1F44F}, \u{1F437}, \u{1F4CC}, \u{1F4CD}, \u{1F3C6}, \u{1F48E}, \u{1F4A1}, \u{1F916}, \u{1F4D4}, \u{1F4D6}, \u{1F4DA}, \u{1F4DC}, \u{1F4D5}, \u{1F4D7}, \u{1F9F0}, \u26D4, \u{1F6AB}, \u{1F534}, \u{1F7E0}, \u{1F7E1}, \u{1F7E2}, \u{1F535}, \u{1F7E3}, \u2757, \u2753, \u2705, \u274C",
      placeholder: "\u{1F44D}, \u{1F44E}",
      type: "textarea",
      group: 3,
    },
    useSimplePrompt: {
      title: i2("settings.useSimplePrompt"),
      defaultValue: false,
      group: 4,
    },
    openTagsPage: {
      title: i2("settings.openTagsPage"),
      type: "externalLink",
      url: "https://utags.pipecraft.net/tags/",
      group: 5,
    },
    openDataPage: {
      title: i2("settings.openDataPage"),
      type: "externalLink",
      url: "https://utags.pipecraft.net/data/",
      group: 5,
    },
  }
  var addUtagsStyle = () => {
    const style = addStyle(content_default)
    style.id = "utags_style"
  }
  function onSettingsChange() {
    if (getSettingsValue("showHidedItems")) {
      addClass(doc.documentElement, "utags_no_hide")
    } else {
      removeClass(doc.documentElement, "utags_no_hide")
    }
    if (getSettingsValue("noOpacityEffect")) {
      addClass(doc.documentElement, "utags_no_opacity_effect")
    } else {
      removeClass(doc.documentElement, "utags_no_opacity_effect")
    }
    if (!getSettingsValue("enableCurrentSite_".concat(host))) {
      for (const element of $$(".utags_ul")) {
        element.remove()
      }
      const style = $("#utags_style")
      if (style) {
        style.remove()
      }
    }
  }
  var start = 0
  if (start) {
    start = Date.now()
  }
  function appendTagsToPage(element, key, tags, meta) {
    const utagsUl = element.nextSibling
    if (hasClass(utagsUl, "utags_ul")) {
      if (
        element.dataset.utags === tags.join(",") &&
        key === getAttribute(utagsUl, "data-utags_key")
      ) {
        return
      }
      utagsUl.remove()
    } else if (key === getAttribute(utagsUl, "data-utags_key")) {
      utagsUl.remove()
    }
    const ul = createElement("ul", {
      class: tags.length === 0 ? "utags_ul utags_ul_0" : "utags_ul utags_ul_1",
      "data-utags_key": key,
    })
    let li = createElement("li")
    const a = createElement("button", {
      title: "Add tags",
      "data-utags_tag": "\u{1F3F7}\uFE0F",
      "data-utags_key": key,
      "data-utags_tags": tags.join(", "),
      "data-utags_meta": meta ? JSON.stringify(meta) : "",
      class:
        tags.length === 0
          ? "utags_text_tag utags_captain_tag"
          : "utags_text_tag utags_captain_tag2",
    })
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" fill="currentColor" class="bi bi-tags-fill" viewBox="0 0 16 16">\n<path d="M2 2a1 1 0 0 1 1-1h4.586a1 1 0 0 1 .707.293l7 7a1 1 0 0 1 0 1.414l-4.586 4.586a1 1 0 0 1-1.414 0l-7-7A1 1 0 0 1 2 6.586V2zm3.5 4a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"/>\n<path d="M1.293 7.793A1 1 0 0 1 1 7.086V2a1 1 0 0 0-1 1v4.586a1 1 0 0 0 .293.707l7 7a1 1 0 0 0 1.414 0l.043-.043-7.457-7.457z"/>\n</svg>\n'
    a.innerHTML = createHTML(svg)
    li.append(a)
    ul.append(li)
    for (const tag of tags) {
      li = createElement("li")
      const a2 = createTag(tag, {
        isEmoji: emojiTags2.includes(tag),
        noLink: isTagManager,
        enableSelect: isTagManager,
      })
      li.append(a2)
      ul.append(li)
    }
    element.after(ul)
    element.dataset.utags = tags.join(",")
    setTimeout(() => {
      const style = getComputedStyle(element)
      const zIndex = style.zIndex
      if (zIndex && zIndex !== "auto") {
        setStyle(ul, { zIndex })
      }
    }, 200)
  }
  function cleanUnusedUtags() {
    const utagsUlList = $$(".utags_ul")
    for (const utagsUl of utagsUlList) {
      const element = utagsUl.previousSibling
      if (element && getAttribute(element, "data-utags") !== null) {
        continue
      }
      utagsUl.remove()
    }
  }
  async function displayTags() {
    if (start) {
      console.error("start of displayTags", Date.now() - start)
    }
    emojiTags2 = await getEmojiTags()
    const listNodes = getListNodes()
    for (const node of listNodes) {
      node.dataset.utags_list_node = ""
    }
    if (start) {
      console.error("before matchedNodes", Date.now() - start)
    }
    const nodes = matchedNodes()
    if (start) {
      console.error("after matchedNodes", Date.now() - start, nodes.length)
    }
    await getCachedUrlMap()
    for (const node of nodes) {
      const utags = node.utags
      if (!utags) {
        continue
      }
      const key = utags.key
      if (!key) {
        continue
      }
      const object = getTags(key)
      const tags = object.tags || []
      appendTagsToPage(node, key, tags, utags.meta)
      setTimeout(() => {
        updateTagPosition(node)
      })
    }
    if (start) {
      console.error("after appendTagsToPage", Date.now() - start)
    }
    const conditionNodes = getConditionNodes()
    for (const node of conditionNodes) {
      if (getAttribute(node, "data-utags") !== null) {
        node.dataset.utags_condition_node = ""
      }
    }
    for (const node of listNodes) {
      const conditionNodes2 = $$("[data-utags_condition_node]", node)
      const tagsArray = []
      for (const node2 of conditionNodes2) {
        if (!node2.dataset.utags) {
          continue
        }
        if (node2.closest("[data-utags_list_node]") !== node) {
          continue
        }
        tagsArray.push(node2.dataset.utags)
      }
      if (tagsArray.length === 1) {
        node.dataset.utags_list_node = "," + tagsArray[0] + ","
      } else if (tagsArray.length > 1) {
        node.dataset.utags_list_node =
          "," + uniq(tagsArray.join(",").split(",")).join(",") + ","
      }
    }
    cleanUnusedUtags()
    if (start) {
      console.error("end of displayTags", Date.now() - start)
    }
  }
  var displayTagsThrottled = throttle(displayTags, 1e3)
  async function initStorage() {
    await migration()
    addTagsValueChangeListener(() => {
      if (!doc.hidden) {
        setTimeout(displayTags)
      }
    })
  }
  var nodeNameCheckPattern = /^(A|H\d|DIV|SPAN|P|UL|LI|SECTION)$/
  function shouldUpdateUtagsWhenNodeUpdated(nodeList) {
    for (const node of nodeList) {
      if (nodeNameCheckPattern.test(node.nodeName)) {
        return true
      }
    }
    return false
  }
  function updateTagPosition(element) {
    const utags = element.nextElementSibling
    if (!utags || utags.tagName !== "UL" || !hasClass(utags, "utags_ul")) {
      return
    }
    if (
      !utags.offsetParent &&
      utags.offsetHeight === 0 &&
      utags.offsetWidth === 0
    ) {
      return
    }
    const style = getComputedStyle(utags)
    if (style.position !== "absolute") {
      return
    }
    element.dataset.utags_fit_content = "1"
    const utagsSizeFix = hasClass(utags, "utags_ul_0") ? 22 : 0
    const offset = getOffsetPosition(element, utags.offsetParent || doc.body)
    const position = utagsSizeFix
      ? element.dataset.utags_position
      : element.dataset.utags_position2 || element.dataset.utags_position
    let objectPosition = style.objectPosition
    if (objectPosition === "50% 50%" && position) {
      switch (position) {
        case "LT": {
          objectPosition = "0% 0%"
          break
        }
        case "LB": {
          objectPosition = "0% 100%"
          break
        }
        case "RT": {
          objectPosition = "100% 0%"
          break
        }
        case "RB": {
          objectPosition = "100% 100%"
          break
        }
        default: {
          break
        }
      }
    }
    switch (objectPosition) {
      case "0% 0%": {
        utags.style.left = offset.left + "px"
        utags.style.top = offset.top + "px"
        break
      }
      case "0% 100%": {
        utags.style.left = offset.left + "px"
        utags.style.top =
          offset.top +
          (element.clientHeight || element.offsetHeight) -
          utags.clientHeight -
          utagsSizeFix +
          "px"
        break
      }
      case "0% 200%": {
        utags.style.left = offset.left + "px"
        utags.style.top =
          offset.top + (element.clientHeight || element.offsetHeight) + "px"
        break
      }
      case "100% 0%": {
        utags.style.left =
          offset.left +
          (element.clientWidth || element.offsetWidth) -
          utags.clientWidth -
          utagsSizeFix +
          "px"
        utags.style.top = offset.top + "px"
        break
      }
      case "100% 50%": {
        utags.style.left =
          offset.left +
          (element.clientWidth || element.offsetWidth) -
          utags.clientWidth -
          utagsSizeFix +
          "px"
        utags.style.top =
          offset.top +
          ((element.clientHeight || element.offsetHeight) -
            utags.clientHeight -
            utagsSizeFix) /
            2 +
          "px"
        break
      }
      case "100% 100%": {
        utags.style.left =
          offset.left +
          (element.clientWidth || element.offsetWidth) -
          utags.clientWidth -
          utagsSizeFix +
          "px"
        utags.style.top =
          offset.top +
          (element.clientHeight || element.offsetHeight) -
          utags.clientHeight -
          utagsSizeFix +
          "px"
        break
      }
      case "100% 200%": {
        utags.style.left =
          offset.left +
          (element.clientWidth || element.offsetWidth) -
          utags.clientWidth -
          utagsSizeFix +
          "px"
        utags.style.top =
          offset.top + (element.clientHeight || element.offsetHeight) + "px"
        break
      }
      case "200% 0%": {
        utags.style.left =
          offset.left + (element.clientWidth || element.offsetWidth) + "px"
        utags.style.top = offset.top + "px"
        break
      }
      case "200% 50%": {
        utags.style.left =
          offset.left + (element.clientWidth || element.offsetWidth) + "px"
        utags.style.top =
          offset.top +
          ((element.clientHeight || element.offsetHeight) -
            utags.clientHeight -
            utagsSizeFix) /
            2 +
          "px"
        break
      }
      case "200% 100%": {
        utags.style.left =
          offset.left + (element.clientWidth || element.offsetWidth) + "px"
        utags.style.top =
          offset.top +
          (element.clientHeight || element.offsetHeight) -
          utags.clientHeight -
          utagsSizeFix +
          "px"
        break
      }
      default: {
        break
      }
    }
    element.dataset.utags_fit_content = "0"
  }
  async function main() {
    addUtagsStyle()
    await initSettings({
      id: "utags",
      title: i2("settings.title"),
      footer: "\n    <p>"
        .concat(
          i2("settings.information"),
          '</p>\n    <p>\n    <a href="https://github.com/utags/utags/issues" target="_blank">\n    '
        )
        .concat(
          i2("settings.report"),
          '\n    </a></p>\n    <p>Made with \u2764\uFE0F by\n    <a href="https://www.pipecraft.net/" target="_blank">\n      Pipecraft\n    </a></p>'
        ),
      settingsTable: settingsTable2,
      async onValueChange() {
        onSettingsChange()
      },
    })
    if (!getSettingsValue("enableCurrentSite_".concat(host))) {
      return
    }
    await initStorage()
    setTimeout(outputData, 1)
    onSettingsChange()
    await displayTags()
    addEventListener(doc, "visibilitychange", async () => {
      if (!doc.hidden) {
        await displayTags()
      }
    })
    bindDocumentEvents()
    bindWindowEvents()
    const observer = new MutationObserver(async (mutationsList) => {
      let shouldUpdate = false
      for (const mutationRecord of mutationsList) {
        if (shouldUpdateUtagsWhenNodeUpdated(mutationRecord.addedNodes)) {
          shouldUpdate = true
          break
        }
        if (shouldUpdateUtagsWhenNodeUpdated(mutationRecord.removedNodes)) {
          shouldUpdate = true
          break
        }
      }
      if (shouldUpdate) {
        cleanUnusedUtags()
        displayTagsThrottled()
      }
      if ($("#vimiumHintMarkerContainer")) {
        addClass(doc.body, "utags_show_all")
        addClass(doc.documentElement, "utags_vimium_hint")
      } else if (hasClass(doc.documentElement, "utags_vimium_hint")) {
        removeClass(doc.documentElement, "utags_vimium_hint")
        hideAllUtagsInArea()
      }
    })
    observer.observe(doc, {
      childList: true,
      subtree: true,
    })
    addEventListener(doc, "mouseover", (event) => {
      const target = event.target
      if (target && target.tagName === "A") {
        displayTagsThrottled()
      }
    })
  }
  runWhenHeadExists(async () => {
    if (doc.documentElement.dataset.utags === void 0) {
      doc.documentElement.dataset.utags = ""
      await main()
    }
  })
})()
