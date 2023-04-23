import fs from "node:fs"

import { getBuildOptions, runDevServer } from "../common.mjs"

const target = "bookmarklet"
const tag = "dev"

const config = JSON.parse(fs.readFileSync("package.json", "utf8"))

const buildOptions = getBuildOptions(target, tag)
buildOptions.alias = {
  ...buildOptions.alias,
  "browser-extension-storage": "browser-extension-storage/local-storage",
}

const { port } = await runDevServer(buildOptions, target, tag)

const bookmarklet = `(function () {
  "use strict";

  const script = document.createElement("script");
  script.src = "http://localhost:${port}/content.js";
  script.async = true;
  script.defer = true;
  document.body.append(script);
})();`
  .replace(/^\s*/gm, "")
  .replace(/\n/gm, "")

let linkProd = ""
const fileProd = `build/${target}-prod/${config.name}.bookmarklet.link`
if (fs.existsSync(fileProd)) {
  const bookmarkletProd = fs.readFileSync(fileProd, "utf8")
  linkProd = `<br />  Production version: <a href="${bookmarkletProd}">Drag me</a> to the bookmark bar`
}

const html = `<html>
  <head>
    <title>Install Extension - target: ${target}</title>
  </head>
  <body>
    <p>
    Development version: <a href='javascript:${bookmarklet}'>Drag me</a> to the bookmark bar
    ${linkProd}
    </p>
    <p>Add this code to the bookmark</p>
    <textarea
      style="width: 100%; height: 80%; padding: 10px; box-sizing: border-box">
javascript:${bookmarklet}
    </textarea>
    <script>
      document.querySelector("textarea").select();
    </script>
  </body>
</html>
`

fs.writeFileSync(`build/${target}-${tag}/index.html`, html)
