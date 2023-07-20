import defaultSite from "../default"

const site = {
  matches: /lobste\.rs|dto\.pipecraft\.net|tilde\.news|journalduhacker\.net/,
  listNodesSelectors: [],
  conditionNodesSelectors: [],
  matchedNodesSelectors: ["a[href]:not(.utags_text_tag)"],
  excludeSelectors: [
    ...defaultSite.excludeSelectors,
    "#nav",
    "#header",
    "#subnav",
    ".mobile_comments",
    ".description_present",
    ".morelink",
    ".user_tree",
    'a[href^="/login"]',
    'a[href^="/logout"]',
    'a[href^="/u#"]',
    'a[href$="/save"]',
    'a[href$="/hide"]',
  ],
}

export default site
