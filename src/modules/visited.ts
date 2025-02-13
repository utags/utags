import { getSettingsValue } from "browser-extension-settings"

const prefix = location.origin + "/"
const host = location.host
let useVisitedFunction = false
let displayMark = false

export function onSettingsChange() {
  useVisitedFunction = getSettingsValue(`useVisitedFunction_${host}`) as boolean
  displayMark =
    (getSettingsValue(`displayEffectOfTheVisitedContent_${host}`) as string) !==
    "0"
}

function getVisitedLinks(): string[] {
  if (!useVisitedFunction) {
    return []
  }

  return (
    (JSON.parse(localStorage.getItem("utags_visited") || "[]") as string[]) ||
    []
  )
}

function saveVisitedLinks(newVisitedLinks: string[]) {
  if (useVisitedFunction) {
    localStorage.setItem("utags_visited", JSON.stringify(newVisitedLinks))
  }
}

function convertKey(url: string) {
  if (url.includes(prefix)) {
    return url.slice(prefix.length)
  }

  return url
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const TAG_VISITED = ":visited"

export function addVisited(key: string) {
  key = convertKey(key)
  const visitedLinks = getVisitedLinks()
  if (!visitedLinks.includes(key)) {
    visitedLinks.push(key)
    saveVisitedLinks(visitedLinks)
  }
}

export function removeVisited(key: string) {
  key = convertKey(key)
  const visitedLinks = getVisitedLinks()
  if (visitedLinks.includes(key)) {
    const newVisitedLinks = visitedLinks.filter((value: string) => {
      return value !== key
    })
    saveVisitedLinks(newVisitedLinks)
  }
}

export function isVisited(key: string) {
  if (!displayMark) {
    return false
  }

  key = convertKey(key)
  const visitedLinks = getVisitedLinks()
  return visitedLinks.includes(key)
}
