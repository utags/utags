import * as esbuild from "esbuild"
import fs from "node:fs"

import { getBuildOptions } from "../common.mjs"

const target = "module"

// TODO: add name and version to output
// const config = JSON.parse(fs.readFileSync("package.json", "utf8"))

const buildOptions = {
  ...getBuildOptions(target, "prod"),
  minify: false,
  sourcemap: false,
}
buildOptions.alias = {
  ...buildOptions.alias,
  "browser-extension-storage": "browser-extension-storage/local-storage",
}

await esbuild.build(buildOptions)

let text = fs.readFileSync(`build/${target}-prod/content.js`, "utf8")
// Remove all commenets staret with '// '
text = text.replace(/^\s*\/\/ [^=@].*$/gm, "")
text = text.replace(/\\n/g, "")
text = text.replace(/\n+/gm, "\n")

fs.writeFileSync(`build/${target}-prod/content.js`, text)

await esbuild.build({
  ...buildOptions,
  minify: true,
  sourcemap: true,
  outfile: `build/${target}-prod/content.min.js`,
})
