const doc = document
export const uniq = (array) => [...new Set(array)]
export const $ = doc.querySelector.bind(doc)
export const $$ = doc.querySelectorAll.bind(doc)
export const createElement = doc.createElement.bind(doc)
export const extensionVersion = "0.1.3"
export const databaseVersion = 2
export const isUrl = (text) => /^https?:\/\//.test(text)

if (typeof Object.hasOwn !== "function") {
  Object.hasOwn = (instance, prop) =>
    Object.prototype.hasOwnProperty.call(instance, prop)
}
