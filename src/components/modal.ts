import { addClass, addElement, doc } from "browser-extension-utils"

export default function createModal(attributes?: Record<string, unknown>) {
  const div = addElement(doc.body, "div", {
    class: "utags_modal",
  })

  const wrapper = addElement(div, "div", {
    class: "utags_modal_wrapper",
  })

  const content = addElement(wrapper, "div", attributes)

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
