import {
  getSettingsValue,
  initSettings,
  showSettings,
} from "browser-extension-settings"
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
  registerMenuCommand,
  setStyle,
} from "browser-extension-utils"
import styleText from "data-text:./content.scss"

const settingsTable = {
  test1: {
    title: "Test1",
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

function registerMenuCommands() {
  registerMenuCommand("⚙️ 设置", showSettings, "o")
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
  if (!document.body || $("#myprefix_div")) {
    return
  }

  await initSettings({
    id: "my-extension",
    title: "My Extension",
    footer: `
    <p>After change settings, reload the page to take effect</p>
    <p>
    <a href="https://github.com/utags/browser-extension-starter/issues" target="_blank">
    Report and Issue...
    </a></p>
    <p>Made with ❤️ by
    <a href="https://www.pipecraft.net/" target="_blank">
      Pipecraft
    </a></p>`,
    settingsTable,
  })
  registerMenuCommands()

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

// eslint-disable-next-line @typescript-eslint/no-floating-promises, unicorn/prefer-top-level-await
main()
