import * as esbuild from "esbuild"
import fse from "fs-extra"
import fs from "node:fs"
import path from "node:path"

const config = JSON.parse(fs.readFileSync("package.json", "utf8"))

const banner = fs.readFileSync("src/userscript/banner.js", "utf8")

const result = await esbuild.build({
  entryPoints: ["src/contents/utags.ts"],
  bundle: true,
  banner: {
    js: banner
  },
  define: {
    "process.env.PLASMO_TAG": '"production"'
  },
  alias: {
    "data-text:./style.scss": "src/contents/style.scss",
    "~storage/chrome": "src/storage/userscript.js"
  },
  loader: {
    ".scss": "text"
  },
  target: ["chrome58", "firefox57", "safari11", "edge16"],
  write: false,
  outdir: "build/userscript-prod"
})

for (const out of result.outputFiles) {
  fse.ensureDirSync(path.dirname(out.path))
  let text = out.text
  text = text.replace("{name}", config.displayName)
  text = text.replace("{name:zh-CN}", config["displayName:zh-CN"])
  for (const key of [
    "version",
    "author",
    "description",
    "description:zh-CN",
    "license"
  ]) {
    text = text.replace("{" + key + "}", config[key])
  }

  text = text.replace("// src/contents/style.scss", "'use strict';")
  text = text.replace(/^\s*\/\/ src\/.*$/gm, "")
  fs.writeFileSync(out.path, text)
}
