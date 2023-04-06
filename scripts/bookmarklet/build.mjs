import bookmarkleter from "bookmarkleter"
import * as esbuild from "esbuild"
import fs from "node:fs"

import { getBuildOptions } from "../common.mjs"

const target = "bookmarklet"

// TODO: add name and version to output
// const config = JSON.parse(fs.readFileSync("package.json", "utf8"))

const buildOptions = {
  ...getBuildOptions(target, "prod"),
  minify: true,
  sourcemap: false,
}
buildOptions.alias = {
  ...buildOptions.alias,
  "browser-extension-storage": "browser-extension-storage/local-storage",
}

await esbuild.build(buildOptions)

const text = fs.readFileSync(`build/${target}-prod/content.js`, "utf8")
const options = {
  urlencode: true,
  iife: false,
  mangleVars: true,
  transpile: true,
}
const bookmarklet = bookmarkleter(text, options)
fs.writeFileSync(`build/${target}-prod/content.js`, bookmarklet)
