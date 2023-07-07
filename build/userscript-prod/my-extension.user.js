// ==UserScript==
// @name                 My-Extension
// @name:zh-CN           我的扩展
// @namespace            https://github.com/utags/browser-extension-starter
// @homepageURL          https://github.com/utags/browser-extension-starter#readme
// @supportURL           https://github.com/utags/browser-extension-starter/issues
// @version              0.1.0
// @description          try to take over the world!
// @description:zh-CN    让世界更美好！
// @icon                 https://www.tampermonkey.net/favicon.ico
// @author               You
// @license              MIT
// @match                https://*/*
// @match                http://*/*
// @grant                GM.getValue
// @grant                GM.setValue
// @grant                GM_addValueChangeListener
// @grant                GM_removeValueChangeListener
// @grant                GM_addElement
// @grant                GM_addStyle
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
  var doc = document
  var $ = (selectors, element) => (element || doc).querySelector(selectors)
  var $$ = (selectors, element) => [
    ...(element || doc).querySelectorAll(selectors),
  ]
  var createElement = (tagName, attributes) =>
    setAttributes(doc.createElement(tagName), attributes)
  var addElement = (parentNode, tagName, attributes) => {
    if (!parentNode) {
      return
    }
    if (typeof parentNode === "string") {
      attributes = tagName
      tagName = parentNode
      parentNode = doc.head
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
  var addStyle = (styleText) => {
    const element = createElement("style", { textContent: styleText })
    doc.head.append(element)
    return element
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
  if (typeof Object.hasOwn !== "function") {
    Object.hasOwn = (instance, prop) =>
      Object.prototype.hasOwnProperty.call(instance, prop)
  }
  var addElement2 =
    typeof GM_addElement === "function"
      ? (parentNode, tagName, attributes) => {
          if (!parentNode) {
            return
          }
          if (typeof parentNode === "string") {
            attributes = tagName
            tagName = parentNode
            parentNode = doc.head
          }
          if (typeof tagName === "string") {
            const element = GM_addElement(tagName)
            setAttributes(element, attributes)
            parentNode.append(element)
            return element
          }
          setAttributes(tagName, attributes)
          parentNode.append(tagName)
          return tagName
        }
      : addElement
  var addStyle2 =
    typeof GM_addStyle === "function"
      ? (styleText) => GM_addStyle(styleText)
      : addStyle
  var content_default =
    '#myprefix_div{color:#000;box-sizing:border-box;padding:10px 15px;background-color:#fff;border-radius:5px;-webkit-box-shadow:0px 10px 39px 10px rgba(62,66,66,.22);-moz-box-shadow:0px 10px 39px 10px rgba(62,66,66,.22);box-shadow:0px 10px 39px 10px rgba(62,66,66,.22) !important}#myprefix_div div{color:green}#myprefix_test_link{--border-color: linear-gradient(-45deg, #ffae00, #7e03aa, #00fffb);--border-width: 0.125em;--curve-size: 0.5em;--blur: 30px;--bg: #080312;--color: #afffff;color:var(--color);position:relative;isolation:isolate;display:inline-grid;place-content:center;padding:.5em 1.5em;font-size:17px;border:0;text-transform:uppercase;box-shadow:10px 10px 20px rgba(0,0,0,.6);clip-path:polygon(0% var(--curve-size), var(--curve-size) 0, 100% 0, 100% calc(100% - var(--curve-size)), calc(100% - var(--curve-size)) 100%, 0 100%);transition:color 250ms}#myprefix_test_link::after,#myprefix_test_link::before{content:"";position:absolute;inset:0}#myprefix_test_link::before{background:var(--border-color);background-size:300% 300%;animation:move-bg7234 5s ease infinite;z-index:-2}@keyframes move-bg7234{0%{background-position:31% 0%}50%{background-position:70% 100%}100%{background-position:31% 0%}}#myprefix_test_link::after{background:var(--bg);z-index:-1;clip-path:polygon(var(--border-width) calc(var(--curve-size) + var(--border-width) * 0.5), calc(var(--curve-size) + var(--border-width) * 0.5) var(--border-width), calc(100% - var(--border-width)) var(--border-width), calc(100% - var(--border-width)) calc(100% - (var(--curve-size) + var(--border-width) * 0.5)), calc(100% - (var(--curve-size) + var(--border-width) * 0.5)) calc(100% - var(--border-width)), var(--border-width) calc(100% - var(--border-width)));transition:clip-path 500ms}#myprefix_test_link:where(:hover,:focus)::after{clip-path:polygon(calc(100% - var(--border-width)) calc(100% - (var(--curve-size) + var(--border-width) * 0.5)), calc(100% - var(--border-width)) var(--border-width), calc(100% - var(--border-width)) var(--border-width), calc(100% - var(--border-width)) calc(100% - (var(--curve-size) + var(--border-width) * 0.5)), calc(100% - (var(--curve-size) + var(--border-width) * 0.5)) calc(100% - var(--border-width)), calc(100% - (var(--curve-size) + var(--border-width) * 0.5)) calc(100% - var(--border-width)));transition:200ms}#myprefix_test_link:where(:hover,:focus){color:#fff}'
  function showVisitCount(visitCount) {
    const div =
      $("#myprefix_div") ||
      addElement2(document.body, "div", {
        id: "myprefix_div",
        style:
          "display: block; position: fixed; top: 50px; right: 50px; z-index: 100000;",
      })
    const div2 =
      $$("div", div)[0] ||
      addElement2(div, "div", {
        style:
          "display: block; background-color: yellow; margin-bottom: 10px; padding: 4px 12px; box-sizing: border-box;",
      })
    div2.innerHTML = visitCount
  }
  async function main() {
    if (!document.body || $("#myprefix_div")) {
      return
    }
    const visitCount = (await getValue("visitCount")) || "0"
    let visitCountInt = Number.parseInt(visitCount, 10)
    showVisitCount(String(++visitCountInt))
    await setValue("visitCount", visitCountInt)
    addValueChangeListener("visitCount", async () => {
      const visitCount2 = (await getValue("visitCount")) || "0"
      showVisitCount(visitCount2)
    })
    addElement2($("#myprefix_div"), "a", {
      id: "myprefix_test_link",
      href: "https://utags.pipecraft.net/",
      target: "_blank",
      textContent: "Get UTags",
    })
    addElement2(document.head, "style", {
      textContent: content_default,
    })
    addStyle2("#myprefix_div { padding: 6px; };")
  }
  main()
})()
