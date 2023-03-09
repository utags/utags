import { Storage } from "@plasmohq/storage"

const storage = new Storage()
const getValue = (key) => storage.get(key)
const setValue = (key, value) => storage.set(key, value)
const addValueChangeListener = (key, func) => {
  storage.watch({
    [key]: func
  })
}

export { getValue, setValue, addValueChangeListener }
