import {
  addValueChangeListener,
  getValue,
  setValue,
} from "browser-extension-storage"
import {
  $,
  $$,
  addElement,
  addStyle,
  createElement,
  setStyle,
} from "browser-extension-utils"
import styleText from "data-text:./content.scss"

function showVisitCount(visitCount: string) {
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

  const visitCount = ((await getValue("visitCount")) as string) || "0"
  let visitCountInt = Number.parseInt(visitCount, 10)
  showVisitCount(String(++visitCountInt))
  await setValue("visitCount", visitCountInt)

  addValueChangeListener("visitCount", async () => {
    const visitCount = ((await getValue("visitCount")) as string) || "0"
    showVisitCount(visitCount)
  })

  addElement($("#myprefix_div"), "a", {
    id: "myprefix_test_link",
    href: "https://utags.pipecraft.net/",
    target: "_blank",
    textContent: "Get UTags",
  })

  addElement(document.head, "style", {
    textContent: styleText,
  })

  addStyle("#myprefix_div { padding: 6px; };")
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises, unicorn/prefer-top-level-await
main()
