import { Storage } from "@plasmohq/storage"

const storage = new Storage({ area: "local" })
const getValue = async (key) => storage.get(key)
const setValue = async (key, value) => {
  if (value !== undefined) await storage.set(key, value)
}

const addValueChangeListener = (key, func) => {
  storage.watch({
    [key]: func,
  })
}

export { getValue, setValue, addValueChangeListener }
