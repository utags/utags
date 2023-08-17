import { getSettingsValue, initSettings } from "browser-extension-settings"
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
  doc,
  runWhenBodyExists,
} from "browser-extension-utils"
import styleText from "data-text:./content.scss"

import { i } from "./messages"

const settingsTable = {
  test1: {
    title: i("settings.test1"),
    defaultValue: true,
  },
  test2: {
    title: "Test2",
    defaultValue: false,
  },
  test3: {
    title: "Test3",
    defaultValue: false,
    group: 2,
  },
  test4: {
    title: "Test4",
    defaultValue: true,
    group: 2,
  },
  test5: {
    title: "Test5",
    defaultValue: true,
    group: 3,
  },
  test6: {
    title: "Test6",
    defaultValue: "",
    placeholder: "Input value",
    type: "textarea",
    group: 3,
  },
}

function showVisitCount(visitCount: string) {
  const div =
    $("#myprefix_div") ||
    addElement(document.body, "div", {
      id: "myprefix_div",
      style:
        "display: block; position: fixed; top: 50px; right: 50px; z-index: 1000;",
    })

  const div2 =
    $$("div", div)[0] ||
    addElement(div, "div", {
      style:
        "display: block; background-color: yellow; margin-bottom: 10px; padding: 4px 12px; box-sizing: border-box;",
    })

  div2.innerHTML = visitCount
}

async function main() {
  await initSettings({
    id: "my-extension",
    title: i("settings.title"),
    footer: `
    <p>${i("settings.information")}</p>
    <p>
    <a href="https://github.com/utags/browser-extension-starter/issues" target="_blank">
    ${i("settings.report")}
    </a></p>
    <p>Made with ❤️ by
    <a href="https://www.pipecraft.net/" target="_blank">
      Pipecraft
    </a></p>`,
    settingsTable,
  })

  console.log(getSettingsValue("test1"))
  console.log(getSettingsValue("test2"))

  const visitCount = ((await getValue("visitCount")) as string) || "0"
  let visitCountInt = Number.parseInt(visitCount, 10)
  showVisitCount(String(++visitCountInt))
  await setValue("visitCount", visitCountInt)

  addValueChangeListener("visitCount", async () => {
    const visitCount = ((await getValue("visitCount")) as string) || "0"
    showVisitCount(visitCount)
  })

  addElement($("#myprefix_div")!, "a", {
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

runWhenBodyExists(async () => {
  if (doc.documentElement.dataset.myextensionId === undefined) {
    doc.documentElement.dataset.myextensionId = ""
    await main()
  }
})
