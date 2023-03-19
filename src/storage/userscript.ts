// eslint-disable-next-line @typescript-eslint/no-unused-expressions
process.env.PLASMO_TAG === "dev" &&
  (() => {
    if (
      typeof GM_getValue !== "function" &&
      typeof document.GM_getValue === "function"
    ) {
      GM_getValue = document.GM_getValue
      GM_setValue = document.GM_setValue
      GM_addValueChangeListener = document.GM_addValueChangeListener
    }

    if (typeof GM_getValue !== "function") {
      const listeners = {}

      GM_getValue = (key) => localStorage.getItem(key)
      GM_setValue = (key, value) => {
        localStorage.setItem(key, value)
        if (listeners[key]) {
          for (const func of listeners[key]) {
            func()
          }
        }
      }

      GM_addValueChangeListener = (key, func) => {
        listeners[key] = listeners[key] || []
        listeners[key].push(func)
      }
    }
  })()

const getValue = (key) => {
  const value = GM_getValue(key)
  return value && value !== "undefined" ? JSON.parse(value) : undefined
}

const setValue = (key, value) => {
  if (value !== undefined) GM_setValue(key, JSON.stringify(value))
}

const addValueChangeListener = GM_addValueChangeListener

export { getValue, setValue, addValueChangeListener }
