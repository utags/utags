import v2ex from "./v2ex"

export function matchedSite(hostname: string) {
  if (/v2ex\.com|v2hot\./.test(hostname)) {
    return v2ex
  }

  return null
}
