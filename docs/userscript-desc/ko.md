# UTags - 링크에 사용자 태그 추가

사용자, 게시물, 동영상 등의 링크에 **커스텀 태그**나 **메모**를 추가할 수 있습니다. 예를 들어, 포럼의 사용자나 게시물에 태그를 추가하여 식별하거나 게시물과 댓글을 차단할 수 있습니다. X (Twitter), Reddit, Facebook, Threads, Instagram, YouTube, TikTok, GitHub, Greasy Fork, Hacker News, pixiv 등 다양한 웹사이트에서 작동합니다.

**UTags** = **사용자 태그**. **사용자 스크립트**, **사용자 스타일**이 사용자가 사이트의 기능과 스타일을 커스터마이징할 수 있게 해주는 것처럼, **사용자 태그**는 사용자가 사이트의 태그(라벨)를 커스터마이징할 수 있게 해줍니다.

현재 지원되는 사이트:

- V2EX ([www.v2ex.com](https://www.v2ex.com/))
- Greasy Fork ([greasyfork.org](https://greasyfork.org/) 및 [sleazyfork.org](https://sleazyfork.org/))
- Hacker News ([news.ycombinator.com](https://news.ycombinator.com/))
- Lobsters ([lobste.rs](https://lobste.rs/))
- GitHub ([github.com](https://github.com/))
- Reddit ([www.reddit.com](https://www.reddit.com/))
- X(Twitter) ([x.com](https://x.com/) / [twitter.com](https://twitter.com/))
- WeChat ([mp.weixin.qq.com](https://mp.weixin.qq.com/))
- Instagram ([www.instagram.com](https://www.instagram.com/))
- Threads ([www.threads.com](https://www.threads.com/), [www.threads.net](https://www.threads.net/))
- Facebook ([www.facebook.com](https://www.facebook.com/))
- YouTube ([www.youtube.com](https://www.youtube.com/))
- Bilibili ([www.bilibili.com](https://www.bilibili.com/))
- TikTok ([www.tiktok.com](https://www.tiktok.com/))
- 52pojie ([www.52pojie.cn](https://www.52pojie.cn/))
- juejin ([juejin.cn](https://juejin.cn/))
- zhihu ([zhihu.com](https://www.zhihu.com/))
- xiaohongshu, RedNote ([xiaohongshu.com](https://www.xiaohongshu.com/))
- weibo ([weibo.com](https://weibo.com/), [weibo.cn](https://weibo.cn/))
- sspai ([sspai.com](https://sspai.com/))
- douyin ([douyin.com](https://www.douyin.com/))
- Google Podcasts ([podcasts.google.com](https://podcasts.google.com/))
- Rebang.Today ([rebang.today](https://rebang.today/))
- MyAnimeList ([myanimelist.net](https://myanimelist.net/))
- douban ([douban.com](https://www.douban.com/))
- pixiv ([www.pixiv.net](https://www.pixiv.net/))
- LINUX DO ([linux.do](https://linux.do/)) ([Invite Code](https://linux.do/invites/Smb6NS5Bj6))
- APPINN ([meta.appinn.net](https://meta.appinn.net/))
- NGA ([bbs.nga.cn](https://bbs.nga.cn/), [nga.178.com](https://nga.178.com/), [ngabbs.com](https://ngabbs.com/))
- Keylol ([keylol.com](https://keylol.com/))
- DLsite ([www.dlsite.com](http://www.dlsite.com/))
- Discourse ([meta.discourse.org](https://meta.discourse.org/))
- Open AI ([community.openai.com](https://community.openai.com/))
- Cloudflare ([community.cloudflare.com](https://community.cloudflare.com/))
- WaniKani ([community.wanikani.com](https://community.wanikani.com/))
- tampermonkey.net.cn ([bbs.tampermonkey.net.cn](https://bbs.tampermonkey.net.cn/))
- Flarum Community ([discuss.flarum.org](https://discuss.flarum.org/))
- Flarum Community Chinese ([discuss.flarum.org.cn](https://discuss.flarum.org.cn/))
- uTools Community ([yuanliao.info](https://yuanliao.info/))
- NodeLoc ([www.nodeloc.com](https://www.nodeloc.com/))
- Veryfb ([veryfb.com](https://veryfb.com/))
- Kater ([kater.me](https://kater.me/))
- NodeSeek ([www.nodeseek.com](https://www.nodeseek.com/))
- DeepFlood ([www.deepflood.com](https://www.deepflood.com/))
- Inoreader ([www.inoreader.com](https://www.inoreader.com/))
- zhipin.com ([www.zhipin.com](https://www.zhipin.com/))
- Cursor - Community Forum ([forum.cursor.com](https://forum.cursor.com/))
- Twitch ([www.twitch.tv](https://www.twitch.tv/))
- Yamibo.com ([bbs.yamibo.com](https://bbs.yamibo.com/))
- Flickr ([www.flickr.com](https://www.flickr.com/))
- Ruanyifeng ([www.ruanyifeng.com](https://www.ruanyifeng.com/blog/))
- IDC Flare ([idcflare.com](https://idcflare.com/))
- Obsidian Forum ([forum.obsidian.md](https://forum.obsidian.md/), [forum-zh.obsidian.md](https://forum-zh.obsidian.md/))
- 2libra ([2libra.com](https://2libra.com/)) ([Invite Code](https://2libra.com/auth/signup/1AeoTgXc))
- TouTiao ([toutiao.com](https://www.toutiao.com/))
- www.tsdm39.com ([tsdm39.com](https://www.tsdm39.com/))
- 기타 다수. 새로운 사이트 추가를 제안하려면 [여기](https://github.com/utags/utags/issues)를 클릭하세요.

다른 웹사이트에서도 UTags를 사용하고 싶다면, 스크립트 설정에서 대상 사이트에 대한 `user matches` 규칙을 직접 추가하면 됩니다.

![user matches](https://wsrv.nl/?url=https://greasyfork.s3.us-east-2.amazonaws.com/8mm3oa308eaymr8zdpsk72mjzgtx)

## 사용 방법

- 게시물 제목이나 사용자명에 마우스를 올리면 옆에 태그🏷️ 아이콘이 나타납니다. 아이콘을 클릭하여 태그를 추가하세요

- 여러 태그는 쉼표로 구분합니다

- 게시물 제목, 사용자명, 카테고리에 태그를 추가할 수 있습니다
  ![스크린샷](https://wsrv.nl/?url=https://greasyfork.s3.us-east-2.amazonaws.com/h5x46uh3w12bfyhtfyo1wdip0xu4)

- 일부 특별한 태그는 특별한 효과가 있습니다. 예: "ignore", "clickbait", "promotion", "block", "hide" 등
  ![스크린샷](https://wsrv.nl/?url=https://greasyfork.s3.us-east-2.amazonaws.com/568f6cu7je6isfx858kuyjorfl5n)

## 스크린샷

![스크린샷](https://wsrv.nl/?url=https://raw.githubusercontent.com/utags/utags/refs/heads/main/assets/screenshots-01.png)

![스크린샷](https://wsrv.nl/?url=https://raw.githubusercontent.com/utags/utags/refs/heads/main/assets/screenshots-02.png)

![스크린샷](https://wsrv.nl/?url=https://raw.githubusercontent.com/utags/utags/refs/heads/main/assets/screenshots-03.png)

![스크린샷](https://wsrv.nl/?url=https://raw.githubusercontent.com/utags/utags/refs/heads/main/assets/screenshots-04.png)

![스크린샷](https://wsrv.nl/?url=https://raw.githubusercontent.com/utags/utags/refs/heads/main/assets/screenshots-05.png)

![스크린샷](https://wsrv.nl/?url=https://raw.githubusercontent.com/utags/utags/refs/heads/main/assets/screenshots-06.png)

## 비디오 데모

- 📺 YouTube: [데모1](https://www.youtube.com/watch?v=WzUzBA5V91A) [데모2](https://www.youtube.com/watch?v=zlNqk0nhLdI)

## 기능

- 현재 보고 있는 페이지에 직접 태그를 추가할 수 있으며, 태그를 저장해도 페이지가 새로고침되지 않습니다
- 게시물 제목, 사용자명, 카테고리에 태그를 추가할 수 있습니다
- Vimium 확장 프로그램 지원: "f" 키를 누르면 태그 아이콘에도 힌트 마커가 표시되어 빠르게 태그를 추가할 수 있습니다
- **현대적인 북마크 관리**: [https://utags.link/](https://utags.link/)를 방문하여 고급 북마크 관리 기능을 경험해보세요. 웹 애플리케이션에 대한 자세한 정보는 [https://github.com/utags/utags/blob/main/packages/webapp/README.md](https://github.com/utags/utags/blob/main/packages/webapp/README.md)를 참조하세요
- [태그 목록](https://utags.link/) 페이지에서 태그가 있는 사용자와 게시물을 업데이트 순으로 확인할 수 있습니다
- [데이터 내보내기 및 가져오기](https://utags.link/)를 지원합니다
- 읽은 게시물 자동 표시. 읽은 콘텐츠를 반투명으로 표시하거나 숨길 수 있습니다. 이 기능은 설정 페이지에서 수동으로 활성화해야 합니다. 기본적으로 비활성화되어 있습니다. 현재 `linux.do`와 `v2ex.com` 사이트에만 적용됩니다
- 다음 사용자 스크립트 관리자와 호환됩니다:
  - Tampermonkey (권장)
  - Violentmonkey
  - Greasemonkey
  - ScriptCat
  - Userscripts (Safari MacOS/iOS)
  - Addons (Safari MacOS/iOS)

자세한 정보: [https://github.com/utags/utags](https://github.com/utags/utags)

## 릴리스 노트

New release notes will be published at [https://github.com/utags/utags/tree/main/docs/release-notes](https://github.com/utags/utags/tree/main/docs/release-notes).
This document will no longer be updated with release notes.

- 0.23
  - GM.\* API 폴백 로직 최적화.
  - Greasymonkey, quoid-userscripts, Stay 등 스크립트 관리자와의 호환성 향상.
  - Escape 및 Tab 키에 대한 키보드 상호 작용 개선.
  - 태그 입력 패널을 닫을 때 페이지가 맨 아래로 스크롤되는 Safari 문제 수정.
- 0.22
  - `// @noframes`를 제거하고 `all_frames: true`를 활성화하여 iframe 내에서 UTags가 실행되도록 허용, utags-shortcuts 확장 프로그램 및 유저스크립트와의 호환성을 개선했습니다.
  - 설정 모듈을 업데이트했습니다.
- 0.21
  - 원격 버전 이상 처리 최적화: 확인 후 최초 병합(`lastSyncTime=0`, 최신 데이터를 우선) 수행 또는 취소하여 동기화를 비활성화.
  - 새로운 메뉴 명령: 모든 태그 숨기기/숨김 해제, 동적 제목 및 다국어 지원.
- 0.20
  - Shadow DOM 내에서 요소를 찾고 태그를 지정하는 것을 지원하는 shadowRoot 순회 기능 추가
  - bilibili.com 웹사이트 지원을 최적화하여 플랫폼에서 태그 기능의 호환성과 성능 향상
  - youtube.com 웹사이트를 위한 특수 태그 필터링 및 빠른 별표 기능 추가, 사용자 이름 매칭 로직 최적화
  - 느낌표로 시작하는 새로운 특수 태그 추가: !, !!, !!!, !important (우선순위 표시용)
- 0.19.x
  - 빠른 태그 메뉴 명령 추가: 설정에서 사용자 정의 빠른 태그를 구성하고 우클릭 메뉴를 통해 ➕/➖ 아이콘으로 태그 추가/제거에 액세스
  - linux.do 웹사이트용 빠른 별표 기능 추가 - 설정에서 빠른 별표 추가를 활성화하여 더 빠른 북마킹 가능
  - 데이터 동기화 로직 최적화, 데이터 불일치 문제 해결
  - 언어 전환 기능 추가
  - 일본어, 한국어, 독일어, 프랑스어, 스페인어, 이탈리아어, 포르투갈어, 러시아어, 베트남어, 번체 중국어를 포함한 다국어 지원
  - 현재 페이지에 태그를 추가하는 메뉴 명령 추가
  - 우선순위 정렬 기능이 있는 특별한 별 태그 (★★★, ★★, ★, ☆☆☆, ☆☆, ☆) 지원 추가
  - 태그 입력 창에서 태그 스타일 활성화
  - 동기화 어댑터에서 사용자 스크립트 가용성 감지 및 오류 처리 개선
- 0.18.x
  - Flickr 사이트 추가
  - Ruanyifeng 사이트 추가
  - Twitch 사이트 추가
  - Yamibo 사이트 추가
  - v2ex.com의 vxna와 planet 페이지에서 특별 태그 지원
  - GitHub 파일과 폴더 태그 지원
  - GitHub issue 제목 옆에 태그 표시
- 0.17.1
  - GitHub와 WebDAV를 통한 데이터 동기화 지원
- 0.16.0
  - 북마크 소프트 삭제 기능 구현
- 0.15.0
  - 새로운 웹 앱([https://utags.link](https://utags.link))과 통합
- 0.12.11
  - 설정 가능한 이모지 태그 수 제한 제거
- 0.12.10
  - BOSS 직핀에서 회사와 채용 공고를 표시하고 메모를 남길 수 있습니다. 예를 들어, "block"이나 "hide" 태그를 추가하여 관심 없는 회사와 채용 공고를 숨길 수 있습니다
  - www.zhipin.com 사이트 지원 추가
- 0.12.9
  - www.zhipin.com 사이트 지원 추가
- 0.12.5
  - Discourse 모바일 경험 향상
- 0.12.4
  - www.inoreader.com 사이트 지원 추가
- 0.12.3
  - www.nodeseek.com 사이트 지원 추가
- 0.12.2
  - flarum 기반 사이트 지원 추가 (discuss.flarum.org, discuss.flarum.org.cn, www.nodeloc.com, freesmth.net, veryfb.com 포함)
- 0.12.1
  - bbs.tampermonkey.net.cn 사이트 지원 추가
  - 사용자 스크립트 공식 설치 URL과 확장 프로그램 스토어 URL 추가
  - V2EX에서 읽은 콘텐츠 태그 활성화
  - 읽은 콘텐츠 태그를 지원하는 사이트에서 활성화 버튼 표시
- 0.12.0
  - 커스텀 스타일 적용 활성화
- 0.11.1
  - 읽은 콘텐츠 제목 색상 변경 옵션 추가
- 0.11.0
  - 읽은 게시물 자동 표시. 읽은 콘텐츠를 반투명으로 표시하거나 숨길 수 있습니다. 이 기능은 설정 페이지에서 수동으로 활성화해야 합니다. 기본적으로 비활성화되어 있습니다. 현재 `linux.do` 사이트에만 적용됩니다
  - 태그 입력 인터페이스에 "설정" 버튼 표시
- 0.10.7
  - X (Twitter)에서 태그 추가 개선. 특별 태그로 트윗과 댓글 필터링
- 0.10.6
  - community.wanikani.com 지원 추가
- 0.10.4
- 0.10.3
  - Reddit에서 커뮤니티, 게시물, 사용자에 태그 추가 가능. 특별 태그로 게시물과 댓글 필터링
  - TikTok에서 동영상과 사용자에 태그 추가 가능. 특별 태그로 동영상과 댓글 필터링
- 0.10.1
  - RedNote(xiaohongshu)에서 노트와 사용자에 태그 추가 가능. 특별 태그로 노트와 댓글 필터링
  - 성능 향상
- 0.9.11
  - linux.do와 다른 discourse 사이트에서 게시물, 카테고리, 태그에 태그 추가 가능. 특별 태그로 게시물과 댓글 필터링
- 0.9.10
  - dlsite.com 지원 추가
  - keylol.com 지원 추가
- 0.9.9
  - www.pixiv.net 지원 추가
  - linux.do 지원 추가
  - meta.appinn.net 지원 추가
  - NGA 지원 추가
- 0.9.8
  - twitter.com -> x.com
  - github.com, threads.net 문제 수정
- 0.9.5
  - 이모지 태그👍 추가
  - 후보 태그 목록 크기 증가
  - 태그 관리 페이지에서 선택/검색 기능 활성화
  - 텍스트 태그 테두리 너비를 정의하기 위해 CSS custom properties 사용
- 0.9.4
  - GitHub 선택자 업데이트, issues, pull requests, discussions에 태그 추가 가능
  - CSS custom properties로 utags 폰트 크기와 아이콘 크기 정의
- 0.9.3
  - 선택자와 스타일 업데이트
  - douban.com 지원 추가
  - myanimelist.net 지원 추가
  - 주입 타이밍을 'document_start'로 변경
- 0.9.1
  - 프롬프트 UI에 복사 버튼 추가
- 0.9.0
  - 고급 태그 입력 프롬프트 UI 사용
  - css custom properties로 utags ul 스타일 정의
- 0.8.10
  - rebang.today 지원 추가
- 0.8.9
  - bilibili.com, greasyfork.org, youtube.com, douyin.com 스타일과 매칭 규칙 업데이트
- 0.8.8
  - podcasts.google.com 지원 추가
  - douyin.com 지원 추가
  - sspai.com 지원 추가
- 0.8.7
  - weibo.com, weibo.cn 지원 추가
- 0.8.6
  - xiaohongshu.com 지원 추가
- 0.8.5
  - zhihu.com 지원 추가
- 0.8.4
  - YouTube 버그 수정, utags 요소 재사용 시 키 비교
  - youtube 선택자와 스타일 업데이트
- 0.8.0
  - 다국어 지원 구현, 현재 영어와 중국어 지원
- 0.7.7
  - instagram.com, threads.net 업데이트
  - 성능 향상, 문서가 숨겨지지 않았을 때 태그 업데이트
- 0.7.6
  - CSP 문제 해결을 위해 data: url의 background-image 대신 svg 요소 사용
  - (v2ex): ve2x.rep 사용자 스크립트로 생성된 인용 댓글 처리
- 0.7.5
  - chrome 확장 프로그램과 firefox 애드온의 기본 사이트 규칙 처리
  - 현재 사이트에서 utags 활성화/비활성화 옵션 추가
  - bilibili, github 선택자 업데이트
- 0.7.3
  - bilibili 선택자 업데이트
  - 병합 로직 업데이트
- 0.7.2
  - 52pojie.cn 지원 추가
  - juejin.cn 지원 추가
- 0.7.1
  - tiktok.com 지원 추가
  - bilibili.com 지원 추가
  - youtube.com 지원 추가
  - facebook.com 지원 추가
- 0.7.0
  - threads.net 지원 추가
  - instagram.com 지원 추가
  - mp.weixin.qq.com 지원 추가
- 0.6.7
  - twitter.com 지원 추가
- 0.6.6
  - [github] issues, PR, 커밋에서 사용자명 매칭
  - 태그가 변경되지 않았을 때 utags 요소 재생성 방지
- 0.6.5
  - reddit.com 지원 추가
- 0.6.4
  - github.com 지원 추가
- 0.6.3
  - lobste.rs 지원 추가
  - TAB 키로 utags 요소에 포커스 이동
  - Firefox에서 vimium 힌트 마커로 utags 표시
- 0.6.0
  - hacker news (news.ycombinator.com) 지원 추가
- 0.5.2
  - 성능 향상
  - HTML 텍스트 복사 시 태그 콘텐츠가 함께 복사되는 것 방지
- 0.5.1
  - [V2EX] 토픽 페이지에서 토픽 태그 표시 위치 조정
  - [V2EX] 댓글에 태그 추가 허용
- 0.5.0
  - greasyfork.org와 sleazyfork.org 지원 추가
  - [V2EX] 모든 외부 링크에 태그 추가 허용
- 0.4.5
  - 빈 영역 클릭 시 태그 버튼 표시 지연 효과 취소
  - 같은 영역을 연속으로 클릭할 때 태그 버튼 숨김
- 0.4.1
  - 태그 아이콘과 스타일 업데이트
- 0.4.0
  - 모바일 기기 지원
- 0.3.1
  - 접근성 향상, v2ex 超级增强 문제 수정
- 0.3.0
  - 중첩된 댓글 모드에서 숨김이나 반투명 효과가 전체 블록에 영향을 주는 문제 수정
- 0.2.1
  - 설정에 태그 페이지와 데이터 가져오기/내보내기 페이지 링크 추가
- 0.2.0
  - 숨겨진 항목 표시와 투명도 효과 비활성화 설정 활성화
- 0.1.10
  - Violentmonkey, Greasemonkey(Firefox), Userscripts(Safari) 등 스크립트 관리자와 호환성
- 0.1.5
  - clickbait, promotion, boring, ignore, read, hide, hidden, no more display, hot, favorite, follow, read later 등 특별 태그 추가
  - 더 많은 페이지 지원을 위해 www.v2ex.com 매칭 규칙 업데이트
- 0.1.4
  - www.v2ex.com 노드 링크에 태그 추가 활성화
- 0.1.2
  - Firefox 브라우저가 'sb'나 'block' 등 태그의 특별 기능을 지원하지 않는 문제 해결
- 0.1.0
  - [Plasmo](https://www.plasmo.com/) 기반으로 코드 리팩토링. 브라우저 확장 프로그램도 사용 가능
- 0.0.2
  - www.v2ex.com의 다양한 도메인명 지원
  - [데이터 가져오기/내보내기 페이지](https://utags.pipecraft.net/data/) 추가
- 0.0.1
  - [www.v2ex.com](https://www.v2ex.com/) 사이트 지원, 멤버나 게시물 링크에 태그 추가 또는 표시
  - 태그가 있는 링크의 [목록 페이지](https://utags.pipecraft.net/tags/) 추가

## 라이선스

Copyright (c) 2023 [Pipecraft](https://www.pipecraft.net). [MIT License](https://github.com/utags/utags/blob/main/LICENSE) 하에 라이선스됩니다.

## >\_

[![Pipecraft](https://img.shields.io/badge/site-pipecraft-brightgreen)](https://www.pipecraft.net)
[![UTags](https://img.shields.io/badge/site-UTags-brightgreen)](https://utags.link)
