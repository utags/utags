import { describe, expect, it } from 'vitest'

import { getCanonicalUrl } from './index'

describe('getCanonicalUrl', () => {
  it('should return original url for other domains', () => {
    expect(getCanonicalUrl('https://other.example.com/foo')).toBe(
      'https://other.example.com/foo'
    )
  })

  it('should remove utm parameters for any domain', () => {
    expect(
      getCanonicalUrl(
        'https://other.example.com/foo?utm_source=google&utm_medium=cpc&utm_campaign=spring_sale'
      )
    ).toBe('https://other.example.com/foo')

    expect(
      getCanonicalUrl('https://other.example.com/foo?param=1&utm_source=google')
    ).toBe('https://other.example.com/foo?param=1')
  })

  describe('github.com', () => {
    it('should replace http with https', () => {
      expect(getCanonicalUrl('http://github.com/foo')).toBe(
        'https://github.com/foo'
      )
    })
  })

  describe('v2ex', () => {
    it('should return original url for non-topic pages', () => {
      expect(getCanonicalUrl('https://www.v2ex.com/about')).toBe(
        'https://www.v2ex.com/about'
      )
    })

    it('should normalize links.pipecraft.net/www.v2ex.com', () => {
      expect(
        getCanonicalUrl('https://links.pipecraft.net/www.v2ex.com/t/123')
      ).toBe('https://www.v2ex.com/t/123')
    })

    it('should remove utm parameters', () => {
      expect(
        getCanonicalUrl(
          'https://www.v2ex.com/t/123456?utm_source=feedly&utm_medium=rss&utm_campaign=feed'
        )
      ).toBe('https://www.v2ex.com/t/123456')
    })

    it('should normalize v2ex.com to www.v2ex.com', () => {
      expect(getCanonicalUrl('https://v2ex.com/t/123')).toBe(
        'https://www.v2ex.com/t/123'
      )
    })

    it('should normalize v2ex.co to www.v2ex.com', () => {
      expect(getCanonicalUrl('https://global.v2ex.co/t/123')).toBe(
        'https://www.v2ex.com/t/123'
      )
    })

    it('should remove query parameters and hash', () => {
      expect(getCanonicalUrl('https://www.v2ex.com/t/123?p=1#reply1')).toBe(
        'https://www.v2ex.com/t/123'
      )
    })

    it('should handle recursive normalization', () => {
      // e.g. links.pipecraft.net/v2ex.co/t/123 -> v2ex.co -> www.v2ex.com
      expect(getCanonicalUrl('https://links.pipecraft.net/v2ex.co/t/123')).toBe(
        'https://www.v2ex.com/t/123'
      )
    })
  })

  describe('greasyfork', () => {
    it('should return original url for non-script/user pages', () => {
      expect(getCanonicalUrl('https://greasyfork.org/help')).toBe(
        'https://greasyfork.org/help'
      )
    })

    it('should remove locale from url', () => {
      expect(getCanonicalUrl('https://greasyfork.org/en/scripts/123')).toBe(
        'https://greasyfork.org/scripts/123'
      )
      expect(getCanonicalUrl('https://greasyfork.org/zh-CN/scripts/123')).toBe(
        'https://greasyfork.org/scripts/123'
      )
    })

    it('should normalize script url', () => {
      expect(
        getCanonicalUrl('https://greasyfork.org/scripts/436459-fast-upload')
      ).toBe('https://greasyfork.org/scripts/436459')
      expect(
        getCanonicalUrl(
          'https://greasyfork.org/en/scripts/436459-fast-upload/code'
        )
      ).toBe('https://greasyfork.org/scripts/436459/code')
    })

    it('should normalize user url', () => {
      expect(
        getCanonicalUrl('https://greasyfork.org/users/12345-username')
      ).toBe('https://greasyfork.org/users/12345')
      expect(
        getCanonicalUrl('https://greasyfork.org/zh-CN/users/12345-username')
      ).toBe('https://greasyfork.org/users/12345')
    })

    it('should handle sleazyfork.org', () => {
      expect(
        getCanonicalUrl('https://sleazyfork.org/en/scripts/123-test')
      ).toBe('https://sleazyfork.org/scripts/123')
    })
  })

  describe('reddit', () => {
    it('should return original url for non-profile/community/comments pages', () => {
      expect(getCanonicalUrl('https://www.reddit.com/login')).toBe(
        'https://www.reddit.com/login'
      )
    })

    it('should normalize user profile url', () => {
      expect(getCanonicalUrl('https://www.reddit.com/user/someuser')).toBe(
        'https://www.reddit.com/user/someuser/'
      )
      expect(getCanonicalUrl('https://www.reddit.com/u/someuser')).toBe(
        'https://www.reddit.com/user/someuser/'
      )
      expect(
        getCanonicalUrl('https://www.reddit.com/user/someuser?sort=new')
      ).toBe('https://www.reddit.com/user/someuser/')
    })

    it('should normalize community url', () => {
      expect(getCanonicalUrl('https://www.reddit.com/r/somesub')).toBe(
        'https://www.reddit.com/r/somesub/'
      )
      expect(getCanonicalUrl('https://www.reddit.com/r/somesub?sort=top')).toBe(
        'https://www.reddit.com/r/somesub/'
      )
    })

    it('should normalize comments url', () => {
      expect(
        getCanonicalUrl(
          'https://www.reddit.com/r/somesub/comments/12345/some_title'
        )
      ).toBe('https://www.reddit.com/r/somesub/comments/12345/some_title/')
      expect(
        getCanonicalUrl('https://www.reddit.com/r/somesub/comments/12345')
      ).toBe('https://www.reddit.com/r/somesub/comments/12345/')
      expect(
        getCanonicalUrl(
          'https://www.reddit.com/r/somesub/comments/12345/some_title/?context=3'
        )
      ).toBe('https://www.reddit.com/r/somesub/comments/12345/some_title/')
    })
  })

  describe('mp.weixin.qq.com', () => {
    it('should replace http with https', () => {
      expect(getCanonicalUrl('http://mp.weixin.qq.com/s/abc')).toBe(
        'https://mp.weixin.qq.com/s/abc'
      )
    })

    it('should normalize article url', () => {
      expect(getCanonicalUrl('https://mp.weixin.qq.com/s/abc?query=1')).toBe(
        'https://mp.weixin.qq.com/s/abc'
      )
      expect(getCanonicalUrl('https://mp.weixin.qq.com/s/abc#hash')).toBe(
        'https://mp.weixin.qq.com/s/abc'
      )
    })

    it('should remove hash for other pages', () => {
      expect(getCanonicalUrl('https://mp.weixin.qq.com/other#hash')).toBe(
        'https://mp.weixin.qq.com/other'
      )
    })
  })

  describe('zhihu.com', () => {
    it('should decode link.zhihu.com target', () => {
      expect(
        getCanonicalUrl(
          'https://link.zhihu.com/?target=https%3A%2F%2Fexample.com'
        )
      ).toBe('https://example.com/')
    })

    it('should normalize user profile url', () => {
      expect(getCanonicalUrl('https://www.zhihu.com/people/user1')).toBe(
        'https://www.zhihu.com/people/user1'
      )
      expect(
        getCanonicalUrl('https://www.zhihu.com/people/user1?foo=bar')
      ).toBe('https://www.zhihu.com/people/user1')
      expect(getCanonicalUrl('https://www.zhihu.com/org/org1')).toBe(
        'https://www.zhihu.com/org/org1'
      )
    })

    it('should normalize post url', () => {
      expect(getCanonicalUrl('https://zhuanlan.zhihu.com/p/12345')).toBe(
        'https://zhuanlan.zhihu.com/p/12345'
      )
      expect(
        getCanonicalUrl('https://zhuanlan.zhihu.com/p/12345?foo=bar')
      ).toBe('https://zhuanlan.zhihu.com/p/12345')
    })
  })

  describe('xiaohongshu.com', () => {
    it('should normalize search result url', () => {
      expect(
        getCanonicalUrl(
          'https://www.xiaohongshu.com/search_result?keyword=abc&type=54&source=web_note_detail_r10'
        )
      ).toBe('https://www.xiaohongshu.com/search_result/?keyword=abc&type=54')
      expect(
        getCanonicalUrl('https://www.xiaohongshu.com/search_result?keyword=abc')
      ).toBe('https://www.xiaohongshu.com/search_result/?keyword=abc&type=54')
    })
  })

  describe('weibo.com', () => {
    it('should normalize user profile url', () => {
      expect(getCanonicalUrl('https://weibo.com/u/123456')).toBe(
        'https://weibo.com/u/123456'
      )
      expect(getCanonicalUrl('https://weibo.com/u/123456?is_hot=1')).toBe(
        'https://weibo.com/u/123456'
      )
      expect(getCanonicalUrl('https://m.weibo.cn/u/123456')).toBe(
        'https://weibo.com/u/123456'
      )
      expect(getCanonicalUrl('https://m.weibo.cn/profile/123456')).toBe(
        'https://weibo.com/u/123456'
      )
      expect(getCanonicalUrl('https://m.weibo.cn/123456')).toBe(
        'https://weibo.com/u/123456'
      )
    })

    it('should return original url for urls with trailing slash (not handled)', () => {
      expect(getCanonicalUrl('https://weibo.com/u/123456/')).toBe(
        'https://weibo.com/u/123456/'
      )
    })
  })

  describe('sspai.com', () => {
    it('should normalize user profile url', () => {
      expect(getCanonicalUrl('https://sspai.com/u/123456')).toBe(
        'https://sspai.com/u/123456'
      )
      expect(getCanonicalUrl('https://sspai.com/u/123456?is_hot=1')).toBe(
        'https://sspai.com/u/123456'
      )
    })

    it('should remove trailing slash for user profile url', () => {
      expect(getCanonicalUrl('https://sspai.com/u/123456/')).toBe(
        'https://sspai.com/u/123456'
      )
    })

    it('should return original url for other pages', () => {
      expect(getCanonicalUrl('https://sspai.com/post/123456')).toBe(
        'https://sspai.com/post/123456'
      )
    })
  })

  describe('podcasts.google.com', () => {
    it('should normalize feed url', () => {
      expect(
        getCanonicalUrl(
          'https://podcasts.google.com/feed/aHR0cHM6Ly9mZWVkcy5zb3VuZGNsb3VkLmNvbS91c2Vycy9zb3VuZGNsb3VkOnVzZXJzOjIxNDg5MzEvc291bmRzLnJzcw'
        )
      ).toBe(
        'https://podcasts.google.com/feed/aHR0cHM6Ly9mZWVkcy5zb3VuZGNsb3VkLmNvbS91c2Vycy9zb3VuZGNsb3VkOnVzZXJzOjIxNDg5MzEvc291bmRzLnJzcw'
      )
      expect(
        getCanonicalUrl(
          'https://podcasts.google.com/feed/xxx?sa=X&ved=0CAMQ4aUDahcKEwjQ_5_5_5_5AhUAAAAAHQAAAAAQAQ'
        )
      ).toBe('https://podcasts.google.com/feed/xxx')
    })

    it('should normalize episode url', () => {
      expect(
        getCanonicalUrl(
          'https://podcasts.google.com/feed/xxx/episode/yyy?sa=X&ved=0CAMQ4aUDahcKEwjQ_5_5_5_5AhUAAAAAHQAAAAAQAQ'
        )
      ).toBe('https://podcasts.google.com/feed/xxx/episode/yyy')
    })

    it('should return original url for urls with trailing slash (not handled)', () => {
      expect(getCanonicalUrl('https://podcasts.google.com/feed/xxx/')).toBe(
        'https://podcasts.google.com/feed/xxx/'
      )
    })

    it('should strip trailing slash for episode url', () => {
      expect(
        getCanonicalUrl('https://podcasts.google.com/feed/xxx/episode/yyy/')
      ).toBe('https://podcasts.google.com/feed/xxx/episode/yyy')
    })
  })

  describe('douban.com', () => {
    it('should remove specific query parameters', () => {
      expect(
        getCanonicalUrl('https://movie.douban.com/subject/123456/?from=showing')
      ).toBe('https://movie.douban.com/subject/123456/')
      expect(
        getCanonicalUrl(
          'https://www.douban.com/group/topic/123456/?start=0&from=spi-b-details'
        )
      ).toBe('https://www.douban.com/group/topic/123456/?start=0')
    })

    it('should preserve trailing slash', () => {
      expect(getCanonicalUrl('https://movie.douban.com/subject/123456/')).toBe(
        'https://movie.douban.com/subject/123456/'
      )
      expect(getCanonicalUrl('https://movie.douban.com/subject/123456')).toBe(
        'https://movie.douban.com/subject/123456'
      )
    })
  })

  describe('zhipin.com', () => {
    it('should remove query parameters and hash', () => {
      expect(
        getCanonicalUrl(
          'https://www.zhipin.com/job_detail/123456.html?ka=search_list_1'
        )
      ).toBe('https://www.zhipin.com/job_detail/123456.html')
      expect(
        getCanonicalUrl(
          'https://www.zhipin.com/gongsi/123456.html?ka=search_list_1'
        )
      ).toBe('https://www.zhipin.com/gongsi/123456.html')
    })
  })

  describe('discuz', () => {
    const domains = [
      { domain: 'bbs.tampermonkey.net.cn' },
      { domain: 'bbs.yamibo.com' },
      { domain: 'www.tsdm39.com' },
      { domain: 'tsdm39.com', outputDomain: 'www.tsdm39.com' },
      { domain: 'xsijishe.net' },
      { domain: 'xsijishe.com', outputDomain: 'xsijishe.net' },
      { domain: 'sjs47.net', outputDomain: 'xsijishe.net' },
      { domain: 'sjs47.com', outputDomain: 'xsijishe.net' },
      { domain: 'sjslt.cc', outputDomain: 'xsijishe.net' },
    ]

    for (const { domain, outputDomain: out } of domains) {
      const outputDomain = out || domain
      describe(domain, () => {
        it('should normalize user profile url', () => {
          expect(
            getCanonicalUrl(`https://${domain}/home.php?mod=space&uid=123`)
          ).toBe(`https://${outputDomain}/home.php?mod=space&uid=123`)
          expect(getCanonicalUrl(`https://${domain}/space-uid-123.html`)).toBe(
            `https://${outputDomain}/home.php?mod=space&uid=123`
          )
          expect(getCanonicalUrl(`https://${domain}/?123`)).toBe(
            `https://${outputDomain}/home.php?mod=space&uid=123`
          )
          expect(
            getCanonicalUrl(
              `https://${domain}/home.php?mod=space&uid=123#comment`
            )
          ).toBe(`https://${outputDomain}/home.php?mod=space&uid=123`)
          expect(
            getCanonicalUrl(
              `https://${domain}/home.php?mod=space&uid=123&do=profile`
            )
          ).toBe(`https://${outputDomain}/home.php?mod=space&uid=123`)
          expect(
            getCanonicalUrl(
              `https://${domain}/home.php?mod=space&uid=123&view=me`
            )
          ).toBe(`https://${outputDomain}/home.php?mod=space&uid=123&view=me`)
        })

        it('should normalize post url', () => {
          expect(
            getCanonicalUrl(
              `https://${domain}/forum.php?mod=viewthread&tid=123`
            )
          ).toBe(`https://${outputDomain}/forum.php?mod=viewthread&tid=123`)
          expect(getCanonicalUrl(`https://${domain}/thread-123-1-1.html`)).toBe(
            `https://${outputDomain}/forum.php?mod=viewthread&tid=123`
          )
          expect(
            getCanonicalUrl(
              `https://${domain}/forum.php?mod=redirect&tid=123&goto=lastpost#lastpost`
            )
          ).toBe(`https://${outputDomain}/forum.php?mod=viewthread&tid=123`)
          expect(
            getCanonicalUrl(
              `https://${domain}/forum.php?mod=viewthread&tid=123&extra=page%3D1`
            )
          ).toBe(`https://${outputDomain}/forum.php?mod=viewthread&tid=123`)
        })

        it('should return original url for other pages', () => {
          expect(
            getCanonicalUrl(
              `https://${domain}/forum.php?mod=forumdisplay&fid=1`
            )
          ).toBe(`https://${outputDomain}/forum.php?mod=forumdisplay&fid=1`)
          expect(getCanonicalUrl(`https://${domain}/archiver/`)).toBe(
            `https://${outputDomain}/archiver/`
          )
          expect(getCanonicalUrl(`https://${domain}/misc.php?mod=faq`)).toBe(
            `https://${outputDomain}/misc.php?mod=faq`
          )
        })
      })
    }
  })

  describe('flickr.com', () => {
    it('should normalize domain', () => {
      expect(getCanonicalUrl('https://flickr.com/photos/user123')).toBe(
        'https://www.flickr.com/photos/user123'
      )
      expect(getCanonicalUrl('http://flickr.com/photos/user123')).toBe(
        'https://www.flickr.com/photos/user123'
      )
    })

    it('should preserve path even for profile pages', () => {
      expect(getCanonicalUrl('https://flickr.com/photos/user123/albums')).toBe(
        'https://www.flickr.com/photos/user123/albums'
      )
    })

    it('should preserve trailing slash', () => {
      expect(getCanonicalUrl('https://flickr.com/photos/user123/')).toBe(
        'https://www.flickr.com/photos/user123/'
      )
      expect(getCanonicalUrl('https://flickr.com/photos/user123')).toBe(
        'https://www.flickr.com/photos/user123'
      )
    })
  })

  describe('ruanyifeng.com', () => {
    it('should normalize domain', () => {
      expect(
        getCanonicalUrl(
          'http://www.ruanyifeng.com/blog/2023/01/weekly-issue-240.html'
        )
      ).toBe('https://www.ruanyifeng.com/blog/2023/01/weekly-issue-240.html')
      expect(
        getCanonicalUrl(
          'https://ruanyifeng.com/blog/2023/01/weekly-issue-240.html'
        )
      ).toBe('https://www.ruanyifeng.com/blog/2023/01/weekly-issue-240.html')
    })

    it('should preserve trailing slash', () => {
      expect(getCanonicalUrl('https://ruanyifeng.com/blog/')).toBe(
        'https://www.ruanyifeng.com/blog/'
      )
    })
  })

  describe('toutiao.com', () => {
    it('should normalize domain and remove query parameters', () => {
      expect(getCanonicalUrl('https://toutiao.com/c/user/123456/')).toBe(
        'https://www.toutiao.com/c/user/123456/'
      )
      expect(
        getCanonicalUrl('https://m.toutiao.com/c/user/123456/?test=1')
      ).toBe('https://www.toutiao.com/c/user/123456/')
    })

    it('should normalize user profile url (enforce trailing slash)', () => {
      expect(getCanonicalUrl('https://www.toutiao.com/c/user/123456')).toBe(
        'https://www.toutiao.com/c/user/123456/'
      )
      expect(getCanonicalUrl('https://www.toutiao.com/c/user/123456/')).toBe(
        'https://www.toutiao.com/c/user/123456/'
      )
      expect(
        getCanonicalUrl('https://www.toutiao.com/c/user/123456/?tab=article')
      ).toBe('https://www.toutiao.com/c/user/123456/')
      expect(
        getCanonicalUrl('https://www.toutiao.com/c/user/token/MS4wLjABAAAA')
      ).toBe('https://www.toutiao.com/c/user/token/MS4wLjABAAAA/')
    })

    it('should normalize article/trending url', () => {
      expect(getCanonicalUrl('https://www.toutiao.com/article/123456/')).toBe(
        'https://www.toutiao.com/article/123456/'
      )
      expect(getCanonicalUrl('https://www.toutiao.com/trending/123456/')).toBe(
        'https://www.toutiao.com/trending/123456/'
      )
      expect(getCanonicalUrl('https://www.toutiao.com/article/123456')).toBe(
        'https://www.toutiao.com/article/123456/'
      )
      expect(getCanonicalUrl('https://www.toutiao.com/trending/123456')).toBe(
        'https://www.toutiao.com/trending/123456/'
      )
    })
  })

  describe('dmm.co.jp', () => {
    it('should remove query parameters from product url with /=/ pattern', () => {
      expect(
        getCanonicalUrl(
          'https://www.dmm.co.jp/digital/videoa/-/detail/=/cid=tek00086/?i3_ref=list'
        )
      ).toBe('https://www.dmm.co.jp/digital/videoa/-/detail/=/cid=tek00086/')
    })

    it('should convert old list url to video.dmm.co.jp', () => {
      expect(
        getCanonicalUrl(
          'https://www.dmm.co.jp/digital/videoa/-/list/?actress=1037568'
        )
      ).toBe('https://video.dmm.co.jp/av/list/?actress=1037568')
    })

    it('should convert old detail url to video.dmm.co.jp content url (http)', () => {
      expect(
        getCanonicalUrl(
          'http://www.dmm.co.jp/digital/videoa/-/detail/=/cid=tek00086/?i3_ref=list'
        )
      ).toBe('https://video.dmm.co.jp/av/content/?id=tek00086')
    })

    it('should clean up video content url', () => {
      expect(
        getCanonicalUrl(
          'https://video.dmm.co.jp/av/content/?id=kwbd00232&i3_ref=list'
        )
      ).toBe('https://video.dmm.co.jp/av/content/?id=kwbd00232')
    })
  })

  describe('simpcity.cr', () => {
    it('should normalize domain aliases', () => {
      expect(getCanonicalUrl('https://simpcity.ax/threads/123')).toBe(
        'https://simpcity.cr/threads/123'
      )
    })

    it('should normalize user profile url (enforce trailing slash)', () => {
      expect(getCanonicalUrl('https://simpcity.cr/members/user.123')).toBe(
        'https://simpcity.cr/members/user.123/'
      )
      expect(getCanonicalUrl('https://simpcity.cr/members/user.123/')).toBe(
        'https://simpcity.cr/members/user.123/'
      )
      expect(getCanonicalUrl('https://simpcity.ax/members/user.123')).toBe(
        'https://simpcity.cr/members/user.123/'
      )
    })

    it('should normalize thread url (enforce trailing slash)', () => {
      expect(getCanonicalUrl('https://simpcity.cr/threads/title.123')).toBe(
        'https://simpcity.cr/threads/title.123/'
      )
      expect(getCanonicalUrl('https://simpcity.cr/threads/title.123/')).toBe(
        'https://simpcity.cr/threads/title.123/'
      )
      expect(getCanonicalUrl('https://simpcity.ax/threads/title.123')).toBe(
        'https://simpcity.cr/threads/title.123/'
      )
    })

    it('should return original url for sub-pages or other pages', () => {
      expect(
        getCanonicalUrl('https://simpcity.cr/threads/title.123/page-2')
      ).toBe('https://simpcity.cr/threads/title.123/page-2')
      expect(getCanonicalUrl('https://simpcity.cr/whats-new/')).toBe(
        'https://simpcity.cr/whats-new/'
      )
      expect(
        getCanonicalUrl('https://simpcity.ax/threads/title.123/page-2')
      ).toBe('https://simpcity.cr/threads/title.123/page-2')
      expect(getCanonicalUrl('https://simpcity.ax/whats-new/')).toBe(
        'https://simpcity.cr/whats-new/'
      )
    })
  })

  describe('hitomi.la', () => {
    it('should normalize doujinshi/imageset/gamecg url', () => {
      expect(
        getCanonicalUrl(
          'https://hitomi.la/doujinshi/adventurous-affair-english-3767175.html'
        )
      ).toBe('https://hitomi.la/doujinshi/3767175.html')
      expect(
        getCanonicalUrl(
          'https://hitomi.la/imageset/adventurous-affair-english-3767194.html'
        )
      ).toBe('https://hitomi.la/imageset/3767194.html')
      expect(
        getCanonicalUrl(
          'https://hitomi.la/gamecg/adventurous-affair-english-3767194.html'
        )
      ).toBe('https://hitomi.la/gamecg/3767194.html')
    })

    it('should return original url for already canonical url', () => {
      expect(getCanonicalUrl('https://hitomi.la/doujinshi/3767175.html')).toBe(
        'https://hitomi.la/doujinshi/3767175.html'
      )
    })

    it('should return original url for excluded prefixes', () => {
      expect(getCanonicalUrl('https://hitomi.la/reader/123.html')).toBe(
        'https://hitomi.la/reader/123.html'
      )
      expect(
        getCanonicalUrl('https://hitomi.la/tag/female%3Aelf-all.html')
      ).toBe('https://hitomi.la/tag/female%3Aelf-all.html')
    })
  })
})
