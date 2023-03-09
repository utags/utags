if (
  typeof GM_getValue !== "function" &&
  typeof document.GM_getValue === "function"
) {
  GM_getValue = document.GM_getValue
  GM_setValue = document.GM_setValue
  GM_addValueChangeListener = document.GM_addValueChangeListener
}

const getValue = (key) => JSON.parse(GM_getValue(key) || "{}")
const setValue = (key, value) => GM_setValue(key, JSON.stringify(value))
const addValueChangeListener = GM_addValueChangeListener

export { getValue, setValue, addValueChangeListener }
