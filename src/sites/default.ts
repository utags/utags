export const getCanonicalUrl = (url: string) => url

const site = {
  matches: /.*/,
  includeSelectors: ["a[href]:not(.utags_text_tag)"],
  excludeSelectors: [".browser_extension_settings_container"],
  getCanonicalUrl,
}

export default site
