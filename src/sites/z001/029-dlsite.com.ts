import { $, $$, getAttribute } from "browser-extension-utils"
import styleText from "data-text:./029-dlsite.com.scss"

import defaultSite from "../default"

const prefix = "https://www.dlsite.com/"

function getProductUrl(url: string) {
  if (url.startsWith(prefix)) {
    const href2 = url.slice(prefix.length)
    if (href2.includes("=/product_id/")) {
      return prefix + href2.replace(/^(.+\.html).*/, "$1")
    }
  }

  return undefined
}

function getMakerUrl(url: string) {
  if (url.startsWith(prefix)) {
    const href2 = url.slice(prefix.length)
    if (href2.includes("/profile/=/maker_id/")) {
      return prefix + href2.replace(/^(.+\.html).*/, "$1")
    }
  }

  return undefined
}

const site = {
  matches: /dlsite\.com/,
  getMatchedNodes() {
    return $$("a[href]:not(.utags_text_tag)").filter(
      (element: HTMLAnchorElement) => {
        const href = element.href
        element.dataset.utags_position = "LB"

        // $(".banner_container")?.remove()

        if (!href.startsWith(prefix)) {
          return true
        }

        if (href.includes("/=/")) {
          if (href.includes("=/product_id/")) {
            element.dataset.utags_position = "LT"
          }
          // if (element.closest(".genre_ranking .maker_name")) {
          //   element.dataset.utags_position = "LB"
          //   element.dataset.utags_position2 = "RB"
          // }

          return true
        }

        return false
      }
    ) as HTMLAnchorElement[]
  },
  excludeSelectors: [
    ...defaultSite.excludeSelectors,
    "header",
    "#top_header",
    "#header",
    ".topicpath",
    ".link_dl_ch",
    ".floating_cart_box",
    "#work_buy_box_wrapper",
    ".pagetop_block",
    ".matome_btn",
    ".review_all",
    ".review_report",
    ".work_cart",
    ".work_favorite",
    ".title_01",
    ".search_more",
    ".btn_category_sample",
    ".btn_cart",
    ".btn_favorite",
    ".btn_follow",
    ".btn_default",
    ".btn_sample",
    ".left_module",
    ".more_work_btn",
    ".heading_link",
    ".work_edition",
    ".work_btn_list",
    ".trans_work_btn",
    ".work_feature",
    ".work_review",
    ".work_rating",
    ".work_category",
    ".work_btn_link",
    ".sort_box",
    ".search_condition_box",
    ".global_pagination",
    ".page_bottom_link",
    ".trial_download",
    ".btn_trial",
    ".work_win_only",
    ".cp_overview_btn",
    ".cp_overview_list",
    ".option_tab_item",
    ".dc_work_group_footer",
    ".new_worklist_more",
    "#work_win_only",
    "#index2_header",
    ".floor_link",
    ".floor_link_creator",
    ".floor_guide",
    ".l-header",
    ".hd_drawer",
    ".index_header",
    ".index_footer",
    ".left_module_comipo",
    "div#left",
    ".footer_floor_nav",
    ".prof_label_list",
    ".type_btn",
  ],
  addExtraMatchedNodes(matchedNodesSet: Set<HTMLElement>) {
    let key = getProductUrl(location.href)
    if (key) {
      // post title
      const element = $("h1#work_name")
      if (element) {
        const title = element.textContent!.trim()
        if (title) {
          const meta = { title }
          element.utags = { key, meta }
          matchedNodesSet.add(element)
        }
      }
    }

    key = getMakerUrl(location.href)
    if (key) {
      // post title
      const element = $(".prof_maker_name")
      if (element) {
        const title = element.textContent!.trim()
        if (title) {
          const meta = { title }
          element.utags = { key, meta }
          matchedNodesSet.add(element)
        }
      }
    }
  },
  getStyle: () => styleText,
}

export default site
