import fs from "node:fs"

import { getBuildOptions, runDevServer } from "../common.mjs"

const target = "userscript"
const tag = "dev"

const buildOptions = getBuildOptions(target, tag)
buildOptions.alias = {
  ...buildOptions.alias,
  "browser-extension-storage": "browser-extension-storage/userscript",
  "browser-extension-utils": "browser-extension-utils/userscript",
}

const { port } = await runDevServer(buildOptions, target, tag)

const text = fs.readFileSync(`build/${target}-${tag}/content.js`, "utf8")
// Get all userscript GM_* and GM.* functions
const matched = new Set()
text.replace(/(GM[_.]\w+)/gm, (match) => {
  matched.add(match)
})

const grants = [...matched]
  .map((v) => `// @grant${" ".repeat(8)}${v}`)
  .join("\n")

matched.add("GM")

const apiExports = [...matched]
  .filter((v) => !v.includes("GM."))
  .map((v) => `    "${v}": typeof ${v} === "undefined" ? undefined : ${v},`)
  .join("\n")

const code = `// ==UserScript==
// @name         localhost:${port}
// @namespace    http://tampermonkey.net/
// @version      0.0.1
// @description  try to take over the world!
// @author       You
// @match        https://*/*
// @match        http://*/*
${grants}
// ==/UserScript==

(function () {
  "use strict";
  if (!document.body) {
    return;
  }

  document.GMFunctions = {
${apiExports}
  }

  const script = document.createElement("script");
  script.src = "http://localhost:${port}/content.js";
  document.body.append(script);

  new EventSource("http://localhost:${port}/esbuild").addEventListener(
    "change",
    () => {
      location.reload();
    }
  );
})();
// END`

const html = `<html>
  <head>
    <title>Install Extension - target: ${target}</title>
  </head>
  <body>
    <p><a href="index.user.js">Click this to install</a></p>
    <p>Or add the code below to Tampermonkey</p>
    <textarea
      style="width: 100%; height: 80%; padding: 10px; box-sizing: border-box">
${code}</textarea>
    <script>
      document.querySelector("textarea").select();
    </script>
  </body>
</html>
`

fs.writeFileSync(`build/${target}-${tag}/index.html`, html)
fs.writeFileSync(`build/${target}-${tag}/index.user.js`, code)
