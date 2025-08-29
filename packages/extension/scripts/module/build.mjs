import fs from "node:fs"
import * as esbuild from "esbuild"

import { getBuildOptions } from "../common.mjs"

const target = "module"
const tag = "prod"

// TODO: add name and version to output
const config = JSON.parse(fs.readFileSync("package.json", "utf8"))

const buildOptions = {
  ...getBuildOptions(target, "prod"),
  minify: false,
  sourcemap: false,
  outfile: `build/${target}-${tag}/${config.name}.js`,
}
buildOptions.alias = {
  ...buildOptions.alias,
  "browser-extension-storage": "browser-extension-storage/local-storage",
}

await esbuild.build(buildOptions)

let text = fs.readFileSync(buildOptions.outfile, "utf8")
// Remove all commenets staret with '// '
text = text.replaceAll(/^\s*\/\/ [^=@].*$/gm, "")
text = text.replaceAll(/\n+/gm, "\n")

fs.writeFileSync(buildOptions.outfile, text)

await esbuild.build({
  ...buildOptions,
  minify: true,
  sourcemap: true,
  outfile: `build/${target}-${tag}/${config.name}.min.js`,
})
