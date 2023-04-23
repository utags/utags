import * as esbuild from "esbuild"
import fs from "node:fs"
import process from "node:process"

import { getBuildOptions } from "../common.mjs"

const target = "userscript"
const tag = process.argv.includes("--staging") ? "staging" : "prod"

const config = JSON.parse(fs.readFileSync("package.json", "utf8"))

let banner = fs.readFileSync("scripts/userscript/banner.txt", "utf8")

if (tag !== "prod") {
  banner = banner.replace(/({displayName(:.+)?})/gm, `$1 - ${tag}`)
}

const buildOptions = {
  ...getBuildOptions(target, tag),
  banner: {
    js: banner,
  },
  outfile: `build/${target}-${tag}/${config.name}.user.js`,
}
buildOptions.alias = {
  ...buildOptions.alias,
  "browser-extension-storage": "browser-extension-storage/userscript",
  "browser-extension-utils": "browser-extension-utils/userscript",
}

await esbuild.build(buildOptions)

let text = fs.readFileSync(buildOptions.outfile, "utf8")

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
text = text.replace(/\n+/gm, "\n")

fs.writeFileSync(buildOptions.outfile, text)
