const doc = document
export const uniq = (array) => [...new Set(array)]
export const $ = doc.querySelector.bind(doc)
export const $$ = doc.querySelectorAll.bind(doc)
export const createElement = doc.createElement.bind(doc)
export const extensionVersion = "0.1.0"
export const databaseVersion = 2
export const isUrl = (text) => /^https?:\/\//.test(text)
