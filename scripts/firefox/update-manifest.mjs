import fs from "node:fs"

const filePath = "build/firefox-mv2-prod/manifest.json"
const manifest = JSON.parse(fs.readFileSync(filePath, "utf8"))

delete manifest.web_accessible_resources

if (manifest.content_scripts) {
  for (const script of manifest.content_scripts) {
    if (script.css && script.css.length === 0) {
      delete script.css
    }
  }
}

fs.writeFileSync(filePath, JSON.stringify(manifest))
