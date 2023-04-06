// ==UserScript==
// @name                 My-Extension
// @name:zh-CN           我的扩展
// @namespace            https://github.com/utags/browser-extension-starter
// @homepage             https://github.com/utags/browser-extension-starter#readme
// @supportURL           https://github.com/utags/browser-extension-starter/issues
// @version              0.1.0
// @description          try to take over the world!
// @description:zh-CN    让世界更美好！
// @icon                 https://www.tampermonkey.net/favicon.ico
// @author               You
// @license              MIT
// @match                https://*/*
// @match                http://*/*
// @grant                GM_getValue
// @grant                GM_setValue
// @grant                GM_addValueChangeListener
// @grant                GM_removeValueChangeListener
// @grant                GM_addElement
// @grant                GM_addStyle
// ==/UserScript==
//
;(() => {
  "use strict"
  var getValue = (key) => {
    const value = GM_getValue(key)
    return value && value !== "undefined" ? JSON.parse(value) : void 0
  }
  var setValue = (key, value) => {
    if (value !== void 0) GM_setValue(key, JSON.stringify(value))
  }
  var addValueChangeListener = (key, func) => {
    const listenerId = GM_addValueChangeListener(key, func)
    return () => {
      GM_removeValueChangeListener(listenerId)
    }
  }
  var doc = document
  var $ = (element, selectors) =>
    element && typeof element === "object"
      ? element.querySelector(selectors)
      : doc.querySelector(element)
  var $$ = (element, selectors) =>
    element && typeof element === "object"
      ? [...element.querySelectorAll(selectors)]
      : [...doc.querySelectorAll(element)]
  if (typeof Object.hasOwn !== "function") {
    Object.hasOwn = (instance, prop) =>
      Object.prototype.hasOwnProperty.call(instance, prop)
  }
  var addElement = (parentNode, tagName, attributes) =>
    GM_addElement(parentNode, tagName, attributes)
  var addStyle = (styleText) => GM_addStyle(styleText)
  var content_default =
    '#myprefix_test_link {  --border-color: linear-gradient(-45deg, #ffae00, #7e03aa, #00fffb);  --border-width: 0.125em;  --curve-size: 0.5em;  --blur: 30px;  --bg: #080312;  --color: #afffff;  color: var(--color);  /* use position: relative; so that BG is only for #myprefix_test_link */  position: relative;  isolation: isolate;  display: inline-grid;  place-content: center;  padding: 0.5em 1.5em;  font-size: 17px;  border: 0;  text-transform: uppercase;  box-shadow: 10px 10px 20px rgba(0, 0, 0, 0.6);  clip-path: polygon(    /* Top-left */ 0% var(--curve-size),    var(--curve-size) 0,    /* top-right */ 100% 0,    100% calc(100% - var(--curve-size)),    /* bottom-right 1 */ calc(100% - var(--curve-size)) 100%,    /* bottom-right 2 */ 0 100%  );  transition: color 250ms;}#myprefix_test_link::after,#myprefix_test_link::before {  content: "";  position: absolute;  inset: 0;}#myprefix_test_link::before {  background: var(--border-color);  background-size: 300% 300%;  animation: move-bg7234 5s ease infinite;  z-index: -2;}@keyframes move-bg7234 {  0% {    background-position: 31% 0%;  }  50% {    background-position: 70% 100%;  }  100% {    background-position: 31% 0%;  }}#myprefix_test_link::after {  background: var(--bg);  z-index: -1;  clip-path: polygon(    /* Top-left */ var(--border-width)      calc(var(--curve-size) + var(--border-width) * 0.5),    calc(var(--curve-size) + var(--border-width) * 0.5) var(--border-width),    /* top-right */ calc(100% - var(--border-width)) var(--border-width),    calc(100% - var(--border-width))      calc(100% - calc(var(--curve-size) + var(--border-width) * 0.5)),    /* bottom-right 1 */      calc(100% - calc(var(--curve-size) + var(--border-width) * 0.5))      calc(100% - var(--border-width)),    /* bottom-right 2 */ var(--border-width) calc(100% - var(--border-width))  );  transition: clip-path 500ms;}#myprefix_test_link:where(:hover, :focus)::after {  clip-path: polygon(    /* Top-left */ calc(100% - var(--border-width))      calc(100% - calc(var(--curve-size) + var(--border-width) * 0.5)),    calc(100% - var(--border-width)) var(--border-width),    /* top-right */ calc(100% - var(--border-width)) var(--border-width),    calc(100% - var(--border-width))      calc(100% - calc(var(--curve-size) + var(--border-width) * 0.5)),    /* bottom-right 1 */      calc(100% - calc(var(--curve-size) + var(--border-width) * 0.5))      calc(100% - var(--border-width)),    /* bottom-right 2 */      calc(100% - calc(var(--curve-size) + var(--border-width) * 0.5))      calc(100% - var(--border-width))  );  transition: 200ms;}#myprefix_test_link:where(:hover, :focus) {  color: #fff;}'
  function showVisitCount(visitCount) {
    const div =
      $("#myprefix_div") ||
      addElement(document.body, "div", {
        id: "myprefix_div",
        style:
          "display: block; position: fixed; top: 50px; right: 50px; z-index: 100000;",
      })
    const div2 =
      $$(div, "div")[0] ||
      addElement(div, "div", {
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
    addElement($("#myprefix_div"), "a", {
      id: "myprefix_test_link",
      href: "https://utags.pipecraft.net/",
      target: "_blank",
      textContent: "Get UTags",
    })
    addElement(document.head, "style", {
      textContent: content_default,
    })
    addStyle("#myprefix_div { padding: 6px; };")
  }
  main()
})()
