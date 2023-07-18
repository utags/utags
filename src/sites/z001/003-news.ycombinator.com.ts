import { $, $$ } from "browser-extension-utils"

import defaultSite from "../default"

export function cloneComment(element: HTMLElement) {
  const newElement = element.cloneNode(true) as HTMLElement
  for (const node of $$(".reply", newElement)) {
    node.remove()
  }

  return newElement
}

const site = {
  matches: /news\.ycombinator\.com/,
  listNodesSelectors: [".script-list li", ".discussion-list-container"],
  conditionNodesSelectors: [],
  matchedNodesSelectors: ["a[href]:not(.utags_text_tag)"],
  excludeSelectors: [
    ...defaultSite.excludeSelectors,
    ".pagetop",
    ".morelink",
    ".hnpast",
    ".clicky",
    ".navs > a",
    'a[href^="login"]',
    'a[href^="logout"]',
    'a[href^="forgot"]',
    'a[href^="vote"]',
    'a[href^="submit"]',
    'a[href^="hide"]',
    'a[href^="fave"]',
    'a[href^="reply"]',
    'a[href^="context"]',
    'a[href^="newcomments"]',
    'a[href^="#"]',
    '.subline > a[href^="item"]',
  ],
  addExtraMatchedNodes(matchedNodesSet: Set<HTMLElement>) {
    if (location.pathname === "/item") {
      // comments
      const comments = $$(".comment-tree .comtr[id]")
      for (const comment of comments) {
        const commentText = $(".commtext", comment)
        const target = $(".age a", comment) as HTMLAnchorElement
        if (commentText && target) {
          const key = target.href
          const title = cloneComment(commentText).textContent
          if (key && title) {
            const meta = { title, type: "comment" }
            target.utags = { key, meta }
            matchedNodesSet.add(target)
          }
        }
      }

      const fatitem = $(".fatitem")
      if (fatitem) {
        const titleElement = $(".titleline a", fatitem)
        const commentText = titleElement || $(".commtext", fatitem)
        const type = titleElement ? "topic" : "comment"
        const target = $(".age a", fatitem) as HTMLAnchorElement
        if (commentText && target) {
          const key = target.href
          const title = cloneComment(commentText).textContent
          if (key && title) {
            const meta = { title, type }
            target.utags = { key, meta }
            matchedNodesSet.add(target)
          }
        }
      }
    } else if (location.pathname === "/newcomments") {
      // comments
      const comments = $$(".athing[id]")
      for (const comment of comments) {
        const commentText = $(".commtext", comment)
        const target = $(".age a", comment) as HTMLAnchorElement
        if (commentText && target) {
          const key = target.href
          const title = cloneComment(commentText).textContent
          if (key && title) {
            const meta = { title, type: "comment" }
            target.utags = { key, meta }
            matchedNodesSet.add(target)
          }
        }
      }
    } else {
      // topics
      const topics = $$(".athing[id]")
      for (const topic of topics) {
        const titleElement = $(".titleline a", topic)
        const subtext = topic.nextElementSibling as HTMLElement
        if (subtext) {
          const target = $(".age a", subtext) as HTMLAnchorElement
          if (titleElement && target) {
            const key = target.href
            const title = titleElement.textContent
            if (key && title) {
              const meta = { title, type: "topic" }
              target.utags = { key, meta }
              matchedNodesSet.add(target)
            }
          }
        }
      }
    }
  },
}

export default site
