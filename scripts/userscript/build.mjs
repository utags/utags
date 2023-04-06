import * as esbuild from "esbuild"
import fs from "node:fs"

import { getBuildOptions } from "../common.mjs"

const target = "userscript"

const config = JSON.parse(fs.readFileSync("package.json", "utf8"))

const banner = fs.readFileSync("scripts/userscript/banner.txt", "utf8")

const buildOptions = {
  ...getBuildOptions(target, "prod"),
  banner: {
    js: banner,
  },
}
buildOptions.alias = {
  ...buildOptions.alias,
  "browser-extension-storage": "browser-extension-storage/userscript",
  "browser-extension-utils": "browser-extension-utils/userscript",
}

await esbuild.build(buildOptions)

let text = fs.readFileSync(`build/${target}-prod/content.js`, "utf8")

if (config.bugs && config.bugs.url) {
  text = text.replace("{bugs.url}", config.bugs.url)
}

const keys = banner
  .split("\n")
  .map((v) => /{([\w\-.:]+)}/.exec(v))
  .filter(Boolean)
  .map((v) => v[1])

for (const key of keys) {
  text = text.replace("{" + key + "}", config[key])
}

// Get all userscript GM_* and GM.* functions
const matched = new Set()
text.replace(/(GM[_.]\w+)/gm, (match) => {
  matched.add(match)
})
const grants = [...matched]
  .map((v) => `// @grant${" ".repeat(16)}${v}`)
  .join("\n")
text = text.replace("// ==/UserScript==", `${grants}\n// ==/UserScript==`)

// Replace first one to 'use strict'
text = text.replace("{", '{\n  "use strict";')
// Remove all commenets staret with '// '
text = text.replace(/^\s*\/\/ [^=@].*$/gm, "")
text = text.replace(/\\n/g, "")
text = text.replace(/\n+/gm, "\n")

fs.writeFileSync(`build/${target}-prod/content.js`, text)
