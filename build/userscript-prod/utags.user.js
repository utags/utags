// ==UserScript==
// @name                 🏷️ UTags - Add usertags to links
// @name:zh-CN           🏷️ 小鱼标签 (UTags) - 为链接添加用户标签
// @namespace            https://utags.pipecraft.net/
// @homepageURL          https://github.com/utags/utags#readme
// @supportURL           https://github.com/utags/utags/issues
// @version              0.8.0
// @description          Allow users to add custom tags to links.
// @description:zh-CN    此插件允许用户为网站的链接添加自定义标签。比如，可以给论坛的用户或帖子添加标签。
// @icon                 data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%23ff6361' class='bi bi-tags-fill' viewBox='0 0 16 16'%3E %3Cpath d='M2 2a1 1 0 0 1 1-1h4.586a1 1 0 0 1 .707.293l7 7a1 1 0 0 1 0 1.414l-4.586 4.586a1 1 0 0 1-1.414 0l-7-7A1 1 0 0 1 2 6.586V2zm3.5 4a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z'/%3E %3Cpath d='M1.293 7.793A1 1 0 0 1 1 7.086V2a1 1 0 0 0-1 1v4.586a1 1 0 0 0 .293.707l7 7a1 1 0 0 0 1.414 0l.043-.043-7.457-7.457z'/%3E %3C/svg%3E
// @author               Pipecraft
// @license              MIT
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
// @match                https://www.52pojie.cn/*
// @match                https://juejin.cn/*
// @match                https://mp.weixin.qq.com/*
// @match                https://sleazyfork.org/*
// @match                https://tilde.news/*
// @match                https://www.journalduhacker.net/*
// @match                https://v2hot.pipecraft.net/*
// @match                https://utags.pipecraft.net/*
// @match                https://*.pipecraft.net/*
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
    element ? element.getAttribute(name) : null
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
  if (typeof Object.hasOwn !== "function") {
    Object.hasOwn = (instance, prop) =>
      Object.prototype.hasOwnProperty.call(instance, prop)
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
    '#browser_extension_settings_container{--browser-extension-settings-background-color: #f2f2f7;--browser-extension-settings-text-color: #444444;--browser-extension-settings-link-color: #217dfc;--sb-track-color: #00000000;--sb-thumb-color: #33334480;--sb-size: 2px;position:fixed;top:10px;right:30px;max-height:90%;height:600px;overflow:hidden;display:none;z-index:100000;border-radius:5px;-webkit-box-shadow:0px 10px 39px 10px rgba(62,66,66,.22);-moz-box-shadow:0px 10px 39px 10px rgba(62,66,66,.22);box-shadow:0px 10px 39px 10px rgba(62,66,66,.22) !important}#browser_extension_settings_container .browser_extension_settings_wrapper{display:flex;height:100%;overflow:hidden;background-color:var(--browser-extension-settings-background-color)}#browser_extension_settings_container .browser_extension_settings_wrapper h1{font-size:26px;font-weight:800;border:none;color:var(--browser-extension-settings-text-color);margin:18px 0;padding:0}#browser_extension_settings_container .browser_extension_settings_wrapper h2{font-size:18px;font-weight:600;border:none;color:var(--browser-extension-settings-text-color);margin:14px 0;padding:0}#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container{overflow-x:auto;box-sizing:border-box;padding:10px 15px;background-color:var(--browser-extension-settings-background-color);color:var(--browser-extension-settings-text-color)}#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .installed_extension_list div,#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .related_extension_list div{background-color:#fff;font-size:14px;border-top:1px solid #ccc;padding:6px 15px 6px 15px}#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .installed_extension_list div a,#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .installed_extension_list div a:visited,#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .related_extension_list div a,#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .related_extension_list div a:visited{display:flex;justify-content:space-between;align-items:center;cursor:pointer;text-decoration:none;color:var(--browser-extension-settings-text-color)}#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .installed_extension_list div a:hover,#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .installed_extension_list div a:visited:hover,#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .related_extension_list div a:hover,#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .related_extension_list div a:visited:hover{text-decoration:none;color:var(--browser-extension-settings-text-color)}#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .installed_extension_list div a span,#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .installed_extension_list div a:visited span,#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .related_extension_list div a span,#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .related_extension_list div a:visited span{margin-right:10px;line-height:24px}#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .installed_extension_list div.active,#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .installed_extension_list div:hover,#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .related_extension_list div.active,#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .related_extension_list div:hover{background-color:#e4e4e6}#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .installed_extension_list div.active a,#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .related_extension_list div.active a{cursor:default}#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .installed_extension_list div:first-of-type,#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .related_extension_list div:first-of-type{border-top:none;border-top-right-radius:10px;border-top-left-radius:10px}#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .installed_extension_list div:last-of-type,#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .related_extension_list div:last-of-type{border-bottom-right-radius:10px;border-bottom-left-radius:10px}#browser_extension_settings_container .thin_scrollbar{scrollbar-color:var(--sb-thumb-color) var(--sb-track-color);scrollbar-width:thin}#browser_extension_settings_container .thin_scrollbar::-webkit-scrollbar{width:var(--sb-size)}#browser_extension_settings_container .thin_scrollbar::-webkit-scrollbar-track{background:var(--sb-track-color);border-radius:10px}#browser_extension_settings_container .thin_scrollbar::-webkit-scrollbar-thumb{background:var(--sb-thumb-color);border-radius:10px}#browser_extension_settings_main{min-width:250px;overflow-y:auto;overflow-x:hidden;box-sizing:border-box;padding:10px 15px;background-color:var(--browser-extension-settings-background-color);color:var(--browser-extension-settings-text-color)}#browser_extension_settings_main h2{text-align:center;margin:5px 0 0;font-size:18px;font-weight:600;border:none;color:var(--browser-extension-settings-text-color)}#browser_extension_settings_main footer{display:flex;justify-content:center;flex-direction:column;font-size:11px;margin:10px auto 0px;background-color:var(--browser-extension-settings-background-color);color:var(--browser-extension-settings-text-color)}#browser_extension_settings_main footer a{color:var(--browser-extension-settings-link-color) !important;text-decoration:none;padding:0}#browser_extension_settings_main footer p{text-align:center;padding:0;margin:2px;line-height:13px}#browser_extension_settings_main a.navigation_go_previous{color:var(--browser-extension-settings-link-color);cursor:pointer;display:none}#browser_extension_settings_main a.navigation_go_previous::before{content:"< "}#browser_extension_settings_main .option_groups{background-color:#fff;padding:6px 15px 6px 15px;border-radius:10px;display:flex;flex-direction:column;margin:10px 0 0}#browser_extension_settings_main .option_groups .action{font-size:14px;padding:6px 0 6px 0;color:var(--browser-extension-settings-link-color);cursor:pointer}#browser_extension_settings_main .bes_external_link{font-size:14px;padding:6px 0 6px 0}#browser_extension_settings_main .bes_external_link a,#browser_extension_settings_main .bes_external_link a:visited,#browser_extension_settings_main .bes_external_link a:hover{color:var(--browser-extension-settings-link-color);text-decoration:none;cursor:pointer}#browser_extension_settings_main .option_groups textarea{font-size:12px;margin:10px 0 10px 0;height:100px;width:100%;border:1px solid #a9a9a9;border-radius:4px;box-sizing:border-box}#browser_extension_settings_main .switch_option,#browser_extension_settings_main .select_option{display:flex;justify-content:space-between;align-items:center;padding:6px 0 6px 0;font-size:14px}#browser_extension_settings_main .option_groups>*{border-top:1px solid #ccc}#browser_extension_settings_main .option_groups>*:first-child{border-top:none}#browser_extension_settings_main .bes_option>.bes_icon{width:24px;height:24px;margin-right:10px}#browser_extension_settings_main .bes_option>.bes_title{margin-right:10px;flex-grow:1}#browser_extension_settings_main .bes_option>.bes_select{box-sizing:border-box;background-color:#fff;height:24px;padding:0 2px 0 2px;margin:0;border-radius:6px;border:1px solid #ccc}#browser_extension_settings_main .option_groups .bes_tip{position:relative;margin:0;padding:0 15px 0 0;border:none;max-width:none;font-size:14px}#browser_extension_settings_main .option_groups .bes_tip .bes_tip_anchor{cursor:help;text-decoration:underline}#browser_extension_settings_main .option_groups .bes_tip .bes_tip_content{position:absolute;bottom:15px;left:0;background-color:#fff;color:var(--browser-extension-settings-text-color);text-align:left;padding:10px;display:none;border-radius:5px;-webkit-box-shadow:0px 10px 39px 10px rgba(62,66,66,.22);-moz-box-shadow:0px 10px 39px 10px rgba(62,66,66,.22);box-shadow:0px 10px 39px 10px rgba(62,66,66,.22) !important}#browser_extension_settings_main .option_groups .bes_tip .bes_tip_anchor:hover+.bes_tip_content,#browser_extension_settings_main .option_groups .bes_tip .bes_tip_content:hover{display:block}#browser_extension_settings_main .option_groups .bes_tip p,#browser_extension_settings_main .option_groups .bes_tip pre{margin:revert;padding:revert}#browser_extension_settings_main .option_groups .bes_tip pre{font-family:Consolas,panic sans,bitstream vera sans mono,Menlo,microsoft yahei,monospace;font-size:13px;letter-spacing:.015em;line-height:120%;white-space:pre;overflow:auto;background-color:#f5f5f5;word-break:normal;overflow-wrap:normal;padding:.5em;border:none}#browser_extension_settings_main .container{--button-width: 51px;--button-height: 24px;--toggle-diameter: 20px;--color-off: #e9e9eb;--color-on: #34c759;width:var(--button-width);height:var(--button-height);position:relative;padding:0;margin:0;flex:none;user-select:none}#browser_extension_settings_main input[type=checkbox]{opacity:0;width:0;height:0;position:absolute}#browser_extension_settings_main .switch{width:100%;height:100%;display:block;background-color:var(--color-off);border-radius:calc(var(--button-height)/2);border:none;cursor:pointer;transition:all .2s ease-out}#browser_extension_settings_main .switch::before{display:none}#browser_extension_settings_main .slider{width:var(--toggle-diameter);height:var(--toggle-diameter);position:absolute;left:2px;top:calc(50% - var(--toggle-diameter)/2);border-radius:50%;background:#fff;box-shadow:0px 3px 8px rgba(0,0,0,.15),0px 3px 1px rgba(0,0,0,.06);transition:all .2s ease-out;cursor:pointer}#browser_extension_settings_main input[type=checkbox]:checked+.switch{background-color:var(--color-on)}#browser_extension_settings_main input[type=checkbox]:checked+.switch .slider{left:calc(var(--button-width) - var(--toggle-diameter) - 2px)}#browser_extension_side_menu{min-height:80px;width:30px;opacity:0;position:fixed;top:80px;right:0;padding-top:20px;z-index:10000}#browser_extension_side_menu:hover{opacity:1}#browser_extension_side_menu button{cursor:pointer;width:24px;height:24px;padding:0;border:none;background-color:rgba(0,0,0,0);background-image:none}#browser_extension_side_menu button svg{width:24px;height:24px}#browser_extension_side_menu button:hover{opacity:70%}#browser_extension_side_menu button:active{opacity:100%}@media(max-width: 500px){#browser_extension_settings_container{right:10px}#browser_extension_settings_container .extension_list_container{display:none}#browser_extension_settings_container .extension_list_container.bes_active{display:block}#browser_extension_settings_container .extension_list_container.bes_active+div{display:none}#browser_extension_settings_main a.navigation_go_previous{display:block}}'
  function createSwitch(options = {}) {
    const container = createElement("label", { class: "container" })
    const checkbox = createElement(
      "input",
      options.checked ? { type: "checkbox", checked: "" } : { type: "checkbox" }
    )
    addElement2(container, checkbox)
    const switchElm = createElement("span", { class: "switch" })
    addElement2(switchElm, "span", { class: "slider" })
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
  var besVersion = 50
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
    addElement2(div, "h1", { textContent: "Settings" })
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
    addElement2(div, "h2", { textContent: "Other Extensions" })
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
                    await saveSettingsValue(key, checkbox.checked)
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
    '\uFEFF:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) #utags_layer{height:200px;width:200px;background-color:red}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_ul{box-sizing:border-box !important;display:inline !important;list-style-type:none !important;margin:0 !important;padding:0 !important;vertical-align:text-bottom !important;line-height:normal !important;background-color:rgba(0,0,0,0);border:none !important;box-shadow:none !important}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_ul>li{box-sizing:border-box !important;display:inline-flex !important;align-items:center !important;float:none !important;width:unset !important;height:14px !important;border:none !important;padding:0 !important;margin:0 !important}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_ul>li:first-child .utags_text_tag{margin-left:3px !important}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_ul>li:last-child .utags_text_tag{margin-right:3px !important}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_ul .utags_text_tag{box-sizing:border-box !important;display:block !important;border:1px solid red;color:red !important;border-radius:3px !important;padding:1px 3px !important;margin:0 1px !important;font-size:10px !important;letter-spacing:0 !important;line-height:1 !important;height:14px !important;width:unset !important;font-weight:normal !important;text-decoration:none !important;text-align:center !important;text-shadow:none !important;min-width:unset !important;min-height:unset !important;max-width:unset !important;max-height:unset !important;cursor:pointer;background:unset !important;background-color:unset !important;pointer-events:auto}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_ul .utags_text_tag[data-utags_tag]::before{content:attr(data-utags_tag);display:block;font-size:10px;line-height:1;height:10px}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_ul .utags_captain_tag,:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_ul .utags_captain_tag2{width:14px !important;height:14px !important;padding:1px 0 0 1px !important;background:none !important;color:#ff6361 !important;border:none !important}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_ul .utags_captain_tag::before,:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_ul .utags_captain_tag2::before{content:none !important}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_ul .utags_captain_tag svg,:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_ul .utags_captain_tag2 svg{vertical-align:-3px}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_ul .utags_captain_tag{opacity:1%;position:absolute;top:0;left:0;padding:0 !important;margin:0 !important;width:4px !important;height:4px !important;font-size:1px !important;background-color:rgba(255,255,255,.7019607843) !important;transition:all 0s .3s !important}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_ul .utags_captain_tag:hover,:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_ul .utags_captain_tag:focus,:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_ul .utags_captain_tag2:hover,:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_ul .utags_captain_tag2:focus{color:#256cf1 !important}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_ul.notag{margin:0 !important}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_ul.notag>li{position:relative !important}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_captain_tag:focus,:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) *:hover+.utags_ul .utags_captain_tag,:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_ul:hover .utags_captain_tag,:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_show_all .utags_captain_tag,:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) :not(a):not([data-utags_node_type=link])+.utags_ul .utags_captain_tag{opacity:100%;width:22px !important;height:22px !important;padding:5px 4px 4px 5px !important;transition:all 0s .1s !important;z-index:90}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_hide_all .utags_captain_tag,:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) .utags_show_all .utags_captain_tag{transition:unset !important}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) :not(a):not([data-utags_node_type=link])+.utags_ul .utags_captain_tag{position:relative}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) [data-utags_list_node*=",\u6807\u9898\u515A,"],:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) [data-utags_list_node*=",\u63A8\u5E7F,"],:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) [data-utags_list_node*=",\u65E0\u804A,"],:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) [data-utags_list_node*=",\u5FFD\u7565,"],:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) [data-utags_list_node*=",ignore,"],:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) [data-utags_list_node*=",clickbait,"],:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) [data-utags_list_node*=",promotion,"],:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) [data-utags_list_node*=",sb,"]{opacity:10%}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) [data-utags_list_node*=",\u5DF2\u9605,"],:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) [data-utags_list_node*=",\u65B0\u7528\u6237,"]{opacity:50%}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) [data-utags_list_node*=",hide,"],:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) [data-utags_list_node*=",\u9690\u85CF,"],:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) [data-utags_list_node*=",\u4E0D\u518D\u663E\u793A,"],:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) [data-utags_list_node*=",block,"]{opacity:5%;display:none}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) [data-utags_list_node*=",\u70ED\u95E8,"],:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) [data-utags_list_node*=",\u6536\u85CF,"],:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) [data-utags_list_node*=",\u5173\u6CE8,"],:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) [data-utags_list_node*=",\u7A0D\u540E\u9605\u8BFB,"]{background-image:linear-gradient(to right, #ffffff, #fefce8) !important;opacity:100% !important;display:block !important}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) [data-utags_list_node*=",\u70ED\u95E8,"],:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) [data-utags_list_node*=",\u6536\u85CF,"],:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) [data-utags_list_node*=",\u5173\u6CE8,"]{background-image:linear-gradient(to right, #ffffff, #fef2f2) !important}:not(#utags_should_has_higher_specificity):not(#utags_should_has_higher_specificity) [data-utags_list_node]:hover{opacity:100% !important}.utags_no_hide [data-utags_list_node*=","]{display:block !important}.utags_no_opacity_effect [data-utags_list_node*=","]{opacity:100% !important}'
  function createTag(tagName) {
    const a = createElement("a")
    a.dataset.utags_tag = tagName
    a.setAttribute(
      "href",
      "https://utags.pipecraft.net/tags/#" + encodeURIComponent(tagName)
    )
    a.setAttribute("target", "_blank")
    a.setAttribute("class", "utags_text_tag")
    return a
  }
  var messages3 = {
    "settings.enableCurrentSite": "Enable on current site",
    "settings.showHidedItems": "Show hidden items (tags with 'block', 'hide')",
    "settings.noOpacityEffect":
      "No opacity mask effect (tags with 'ignore', 'clickbait', 'promotion')",
    "settings.openTagsPage": "Open the tag list page",
    "settings.openDataPage": "Open the import data/export data page",
    "settings.title": "\u{1F3F7}\uFE0F UTags - Add usertags to links",
    "settings.information":
      "After changing the settings, reload the page to take effect",
    "settings.report": "Report and Issue...",
    "prompt.addTags":
      "[UTags] Please enter tags, multiple tags are separated by commas",
  }
  var en_default2 = messages3
  var messages4 = {
    "settings.enableCurrentSite": "\u5728\u5F53\u524D\u7F51\u7AD9\u542F\u7528",
    "settings.showHidedItems":
      "\u663E\u793A\u88AB\u9690\u85CF\u7684\u5185\u5BB9 (\u6DFB\u52A0\u4E86 'block', 'hide', '\u9690\u85CF'\u7B49\u6807\u7B7E\u7684\u5185\u5BB9)",
    "settings.noOpacityEffect":
      "\u53BB\u9664\u534A\u900F\u660E\u6548\u679C (\u6DFB\u52A0\u4E86 'sb', '\u5FFD\u7565', '\u6807\u9898\u515A'\u7B49\u6807\u7B7E\u7684\u5185\u5BB9)",
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
  }
  var zh_cn_default2 = messages4
  var i2 = initI18n({
    "en,en-US": en_default2,
    "zh,zh-CN": zh_cn_default2,
  })
  var extensionVersion = "0.8.0"
  var databaseVersion = 2
  var storageKey2 = "extension.utags.urlmap"
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
    if (newTags.length === 0) {
      delete urlMap[key]
    } else {
      const now = Date.now()
      const data = urlMap[key] || {}
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
        if (target.closest(".utags_ul")) {
          const captainTag = target.closest(
            ".utags_captain_tag,.utags_captain_tag2"
          )
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
              const newTags = prompt(i2("prompt.addTags"), tags)
              if (newTags !== null) {
                const newTagsArray = newTags.split(/\s*[,，]\s*/)
                await saveTags(key, newTagsArray, meta)
              }
            })
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
  var getCanonicalUrl = (url) => url
  var site = {
    matches: /.*/,
    matchedNodesSelectors: ["a[href]:not(.utags_text_tag)"],
    excludeSelectors: [".browser_extension_settings_container"],
    getCanonicalUrl,
  }
  var default_default = site
  function getCanonicalUrl2(url) {
    if (url.startsWith("https://links.pipecraft")) {
      url = url.replace("https://links.pipecraft.net/", "https://")
    }
    return url.replace(/[?#].*/, "").replace(/(\w+\.)?v2ex.com/, "www.v2ex.com")
  }
  function cloneWithoutCitedReplies(element) {
    const newElement = element.cloneNode(true)
    for (const cell of $$(".cell", newElement)) {
      cell.remove()
    }
    return newElement
  }
  var site2 = {
    matches: /v2ex\.com|v2hot\./,
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
    listNodesSelectors: [".script-list li", ".discussion-list-container"],
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
  }
  var greasyfork_org_default = site3
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
  ])
  var site6 = {
    matches: /github\.com/,
    listNodesSelectors: [],
    conditionNodesSelectors: [],
    getMatchedNodes() {
      return $$("a[href]:not(.utags_text_tag)").filter((element) => {
        const href = element.href
        if (href.startsWith("https://github.com/")) {
          if (/since|until/.test(href)) {
            return false
          }
          if (/^https:\/\/github\.com\/[\w-]+$/.test(href)) {
            const username = /^https:\/\/github\.com\/([\w-]+)$/.exec(href)[1]
            if (!noneUsers.has(username)) {
              const meta = { type: "user" }
              element.utags = { meta }
              return true
            }
            return false
          }
          if (/(author%3A|author=)[\w-]+/.test(href)) {
            const username = /(author%3A|author=)([\w-]+)/.exec(href)[2]
            const key = "https://github.com/".concat(username)
            const title = username
            const meta = { title, type: "user" }
            element.utags = { key, meta }
            return true
          }
        }
        return false
      })
    },
    excludeSelectors: [
      ...default_default.excludeSelectors,
      'section[aria-label~="User"] .Link--secondary',
      ".Popover-message .Link--secondary",
      ".IssueLabel",
    ],
  }
  var github_com_default = site6
  var site7 = {
    matches: /reddit\.com/,
    getMatchedNodes() {
      return $$("a[href]:not(.utags_text_tag)").filter((element) => {
        const href = element.href
        const textContent = element.textContent || ""
        if (/^https:\/\/www\.reddit\.com\/user\/\w+\/$/.test(href)) {
          if (/overview/i.test(textContent)) {
            return false
          }
          return true
        }
        if (/^https:\/\/www\.reddit\.com\/r\/\w+\/$/.test(href)) {
          if (/posts/i.test(textContent)) {
            return false
          }
          return true
        }
        return false
      })
    },
    excludeSelectors: [
      ...default_default.excludeSelectors,
      'a[data-testid="comment_author_icon"]',
    ],
  }
  var reddit_com_default = site7
  var prefix2 = "https://twitter.com/"
  var site8 = {
    matches: /twitter\.com/,
    getMatchedNodes() {
      return $$("a[href]:not(.utags_text_tag)").filter((element) => {
        const href = element.href
        if (href.startsWith(prefix2)) {
          const href2 = href.slice(20)
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
        const key = prefix2 + title.slice(1)
        const meta = { title, type: "user" }
        element.utags = { key, meta }
        matchedNodesSet.add(element)
      }
    },
  }
  var twitter_com_default = site8
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
    ":not(#a):not(#b):not(#c) [data-utags_node_type=notag_relative]+.utags_ul.notag .utags_captain_tag{position:relative !important;width:14px !important;height:14px !important;padding:1px 0 0 1px !important}"
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
  function getUserProfileUrl(url) {
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
            const sibling = element.nextElementSibling
            if (sibling && sibling.href && sibling.href.includes("replies")) {
              return false
            }
            const parant = element.parentElement
            setStyle(parant, { display: "flex" })
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
      const element = $("h2+div>div>span")
      if (element) {
        const title = element.textContent.trim()
        const key = getUserProfileUrl(location.href)
        if (title && key && key === "https://www.threads.net/@" + title) {
          const meta = { title, type: "user" }
          element.utags = { key, meta }
          matchedNodesSet.add(element)
        }
      }
    },
  }
  var threads_net_default = site11
  function getFirstHeadElement(tagName = "h1") {
    for (const element of $$(tagName)) {
      if (element.closest(".browser_extension_settings_container")) {
        continue
      }
      return element
    }
    return void 0
  }
  function getUserProfileUrl2(href) {
    if (
      href.startsWith("https://www.facebook.com/") ||
      href.startsWith("https://m.facebook.com/")
    ) {
      const href2 = href.startsWith("https://m.facebook.com/")
        ? href.slice(23)
        : href.slice(25)
      if (/^[\w.]+/.test(href2)) {
        return "https://www.facebook.com/" + href2.replace(/(^[\w.]+).*/, "$1")
      }
    }
    return void 0
  }
  var site12 = {
    matches: /facebook\.com/,
    getMatchedNodes() {
      return $$("a[href]:not(.utags_text_tag)").filter((element) => {
        const href = element.href
        if (
          href.startsWith("https://www.facebook.com/") ||
          href.startsWith("https://m.facebook.com/")
        ) {
          const pathname = element.pathname
          if (/^\/[\w.]+$/.test(pathname)) {
            if (
              /^\/(policies|events|profile\.php|permalink\.php|photo\.php|\w+\.php)$/.test(
                pathname
              )
            ) {
              return false
            }
            const key = "https://www.facebook.com" + pathname
            const meta = { type: "user" }
            element.utags = { key, meta }
            return true
          }
        }
        return false
      })
    },
    excludeSelectors: [...default_default.excludeSelectors],
    addExtraMatchedNodes(matchedNodesSet) {
      const element = getFirstHeadElement("h1")
      if (element) {
        const title = element.textContent.trim()
        const key = getUserProfileUrl2(location.href)
        if (title && key) {
          const meta = { title, type: "user" }
          element.utags = { key, meta }
          matchedNodesSet.add(element)
        }
      }
    },
  }
  var facebook_com_default = site12
  var prefix3 = "https://www.youtube.com/"
  var prefix22 = "https://m.youtube.com/"
  function getUserProfileUrl3(href) {
    if (href.startsWith(prefix3) || href.startsWith(prefix22)) {
      const href2 = href.startsWith(prefix22) ? href.slice(22) : href.slice(24)
      if (/^@\w+/.test(href2)) {
        return prefix3 + href2.replace(/(^@\w+).*/, "$1")
      }
      if (/^channel\/[\w-]+/.test(href2)) {
        return prefix3 + href2.replace(/(^channel\/[\w-]+).*/, "$1")
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
        if (href.startsWith(prefix3) || href.startsWith(prefix22)) {
          const pathname = element.pathname
          if (/^\/@\w+$/.test(pathname)) {
            const key = prefix3 + pathname.slice(1)
            const meta = { type: "user" }
            element.utags = { key, meta }
            return true
          }
          if (/^\/channel\/[\w-]+$/.test(pathname)) {
            const key = prefix3 + pathname.slice(1)
            const meta = { type: "channel" }
            element.utags = { key, meta }
            return true
          }
        }
        return false
      })
    },
    excludeSelectors: [...default_default.excludeSelectors],
    addExtraMatchedNodes(matchedNodesSet) {
      const element = $(
        "#inner-header-container #container.ytd-channel-name #text"
      )
      if (element) {
        const title = element.textContent.trim()
        const key = getUserProfileUrl3(location.href)
        if (title && key) {
          const meta = { title }
          element.utags = { key, meta }
          matchedNodesSet.add(element)
        }
      }
    },
  }
  var youtube_com_default = site13
  var prefix4 = "https://www.bilibili.com/"
  var prefix23 = "https://space.bilibili.com/"
  var prefix32 = "https://m.bilibili.com/"
  function getUserProfileUrl4(href) {
    if (href.startsWith(prefix23)) {
      const href2 = href.slice(27)
      if (/^\d+/.test(href2)) {
        return prefix23 + href2.replace(/(^\d+).*/, "$1")
      }
    }
    if (href.startsWith(prefix32 + "space/")) {
      const href2 = href.slice(29)
      if (/^\d+/.test(href2)) {
        return prefix23 + href2.replace(/(^\d+).*/, "$1")
      }
    }
    return void 0
  }
  function getVideoUrl(href) {
    if (
      href.startsWith(prefix4 + "video/") ||
      href.startsWith(prefix32 + "video/")
    ) {
      const href2 = href.startsWith(prefix32) ? href.slice(23) : href.slice(25)
      if (/^video\/\w+/.test(href2)) {
        return prefix4 + href2.replace(/^(video\/\w+).*/, "$1")
      }
    }
    return void 0
  }
  var site14 = {
    matches: /bilibili\.com|biligame\.com/,
    addExtraMatchedNodes(matchedNodesSet) {
      if (location.href.startsWith(prefix4 + "video/")) {
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
        const key = prefix23 + userId
        const meta = { title, type: "user" }
        element2.utags = { key, meta }
        element2.dataset.utags_node_type = "link"
        matchedNodesSet.add(element2)
      }
      const elements2 = $$(".upname a,a.bili-video-card__info--owner")
      for (const element2 of elements2) {
        const href = element2.href
        if (href.startsWith(prefix23)) {
          const key = getUserProfileUrl4(href)
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
        ].join(",")
      )
      for (const element2 of elements3) {
        const href = element2.href
        if (href.startsWith(prefix23)) {
          const key = getUserProfileUrl4(href)
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
        location.href.startsWith(prefix23) ||
        location.href.startsWith(prefix32 + "space/")
      ) {
        const element2 = $("#h-name,.m-space-info .name")
        if (element2) {
          const title = element2.textContent.trim()
          const key = getUserProfileUrl4(location.href)
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
        const key = getVideoUrl(location.href)
        if (title && key) {
          const meta = { title, type: "video" }
          element.utags = { key, meta }
          matchedNodesSet.add(element)
        }
      }
    },
  }
  var bilibili_com_default = site14
  var prefix5 = "https://www.tiktok.com/"
  function getUserProfileUrl5(url) {
    if (url.startsWith(prefix5)) {
      const href2 = url.slice(23)
      if (/^@[\w.]+/.test(href2)) {
        return prefix5 + href2.replace(/(^@[\w.]+).*/, "$1")
      }
    }
    return void 0
  }
  var site15 = {
    matches: /tiktok\.com/,
    getMatchedNodes() {
      return $$("a[href]:not(.utags_text_tag)").filter((element) => {
        const href = element.href
        if (href.startsWith(prefix5)) {
          const pathname = element.pathname
          if (/^\/@[\w.]+$/.test(pathname)) {
            const titleElement = $("h3", element)
            let title
            if (titleElement) {
              title = titleElement.textContent
            }
            const key = prefix5 + pathname.slice(1)
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
      ".avatar-anchor",
      '[data-e2e*="avatar"]',
      '[data-e2e="user-card-nickname"]',
    ],
    addExtraMatchedNodes(matchedNodesSet) {
      const element = $('h1[data-e2e="user-title"]')
      if (element) {
        const title = element.textContent.trim()
        const key = getUserProfileUrl5(location.href)
        if (title && key) {
          const meta = { title, type: "user" }
          element.utags = { key, meta }
          matchedNodesSet.add(element)
        }
      }
    },
  }
  var tiktok_com_default = site15
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
  var prefix6 = "https://juejin.cn/"
  function getUserProfileUrl6(url) {
    if (url.startsWith(prefix6)) {
      const href2 = url.slice(18)
      if (/^user\/\d+/.test(href2)) {
        return prefix6 + href2.replace(/^(user\/\d+).*/, "$1")
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
        if (href.startsWith(prefix6)) {
          const key = getUserProfileUrl6(href)
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
      const key = getUserProfileUrl6(location.href)
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
          const key2 = getUserProfileUrl6(anchor.href)
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
  var sites = [
    github_com_default,
    v2ex_default,
    twitter_com_default,
    reddit_com_default,
    greasyfork_org_default,
    news_ycombinator_com_default,
    lobste_rs_default,
    mp_weixin_qq_com_default,
    instagram_com_default2,
    threads_net_default,
    facebook_com_default,
    youtube_com_default,
    bilibili_com_default,
    tiktok_com_default,
    pojie_cn_default2,
    juejin_cn_default,
  ]
  function matchedSite(hostname2) {
    for (const s of sites) {
      if (s.matches.test(hostname2)) {
        return s
      }
    }
    if (false) {
      return siteForExtensions(hostname2)
    }
    return default_default
  }
  var hostname = location.hostname
  var currentSite = matchedSite(hostname)
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
  function getCanonicalUrl5(url) {
    if (typeof currentSite.getCanonicalUrl === "function") {
      return currentSite.getCanonicalUrl(url)
    }
    return url
  }
  var isValidUtagsElement = (element) => {
    if (element.dataset.utags !== void 0) {
      return true
    }
    if (
      $('img,svg,audio,video,button,.icon,[style*="background-image"]', element)
    ) {
      return false
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
    const textContent = element.textContent
    if (!textContent) {
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
    for (const element of elements) {
      if (
        !isValidUtagsElement(element) ||
        isExcluedUtagsElement(element, excludeSelector)
      ) {
        element.utags = {}
        continue
      }
      const utags = element.utags || {}
      const key = utags.key || getCanonicalUrl5(element.href)
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
  var host = location.host
  var isEnabledByDefault = () => {
    if (host.includes("www.bilibili.com")) {
      return false
    }
    return true
  }
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
    openTagsPage: {
      title: i2("settings.openTagsPage"),
      type: "externalLink",
      url: "https://utags.pipecraft.net/tags/",
      group: 3,
    },
    openDataPage: {
      title: i2("settings.openDataPage"),
      type: "externalLink",
      url: "https://utags.pipecraft.net/data/",
      group: 3,
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
      if (element.dataset.utags === tags.join(",")) {
        return
      }
      utagsUl.remove()
    }
    const ul = createElement("ul", {
      class: "utags_ul",
    })
    let li = createElement("li")
    if (tags.length === 0) {
      addClass(ul, "notag")
    }
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
    a.innerHTML = svg
    li.append(a)
    ul.append(li)
    for (const tag of tags) {
      li = createElement("li")
      const a2 = createTag(tag)
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
  async function displayTags() {
    if (start) {
      console.error("start of displayTags", Date.now() - start)
    }
    const listNodes = getListNodes()
    for (const node of listNodes) {
      node.dataset.utags_list_node = ""
    }
    const conditionNodes = getConditionNodes()
    for (const node of conditionNodes) {
      node.dataset.utags_condition_node = ""
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
    }
    if (start) {
      console.error("after appendTagsToPage", Date.now() - start)
    }
    for (const node of listNodes) {
      const conditionNodes2 = $$("[data-utags_condition_node]", node)
      const tagsArray = []
      for (const node2 of conditionNodes2) {
        if (node2.closest("[data-utags_list_node]") !== node) {
          continue
        }
        if (node2.dataset.utags) {
          tagsArray.push(node2.dataset.utags)
        }
      }
      if (tagsArray.length === 1) {
        node.dataset.utags_list_node = "," + tagsArray[0] + ","
      } else if (tagsArray.length > 1) {
        node.dataset.utags_list_node =
          "," + uniq(tagsArray.join(",").split(",")).join(",") + ","
      }
    }
    if (start) {
      console.error("end of displayTags", Date.now() - start)
    }
  }
  async function initStorage() {
    await migration()
    addTagsValueChangeListener(() => {
      if (!doc.hidden) {
        setTimeout(displayTags)
      }
    })
  }
  var countOfLinks = 0
  async function main() {
    if ($("#utags_style")) {
      console.log(
        "[UTags] ["
          .concat("userscript", "-")
          .concat(
            "prod",
            "] Skip this, since another instance is already running."
          ),
        location.href
      )
      return
    }
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
    countOfLinks = $$("a:not(.utags_text_tag)").length
    const observer = new MutationObserver(async (mutationsList) => {
      const count = $$("a:not(.utags_text_tag):not([data-utags]").length
      if (countOfLinks !== count) {
        countOfLinks = count
        await displayTags()
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
  }
  main()
})()
