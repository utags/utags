# UTags - リンクにユーザータグを追加

ユーザー、投稿、動画などのリンクに**カスタムタグ**や**メモ**を追加できます。例えば、フォーラムのユーザーや投稿にタグを追加して、それらを識別したり、投稿や返信をブロックしたりできます。X (Twitter)、Reddit、Facebook、Threads、Instagram、YouTube、TikTok、GitHub、Greasy Fork、Hacker News、pixiv、その他多数のウェブサイトで動作します。

**UTags** = **ユーザータグ**。**ユーザースクリプト**、**ユーザースタイル**はユーザーがサイトの機能とスタイルをカスタマイズできるようにし、**ユーザータグ**はユーザーがサイトのタグ（ラベル）をカスタマイズできるようにします。

現在サポートされているサイト：

- V2EX ([www.v2ex.com](https://www.v2ex.com/))
- Greasy Fork ([greasyfork.org](https://greasyfork.org/) および [sleazyfork.org](https://sleazyfork.org/))
- Hacker News ([news.ycombinator.com](https://news.ycombinator.com/))
- Lobsters ([lobste.rs](https://lobste.rs/))
- GitHub ([github.com](https://github.com/))
- Reddit ([www.reddit.com](https://www.reddit.com/))
- X(Twitter) ([x.com](https://x.com/) / [twitter.com](https://twitter.com/))
- WeChat ([mp.weixin.qq.com](https://mp.weixin.qq.com/))
- Instagram ([www.instagram.com](https://www.instagram.com/))
- Threads ([www.threads.net](https://www.threads.net/))
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
- LINUX DO ([linux.do](https://linux.do/))
- APPINN ([meta.appinn.net](https://meta.appinn.net/))
- NGA ([bbs.nga.cn](https://bbs.nga.cn/), [nga.178.com](https://nga.178.com/), [ngabbs.com](https://ngabbs.com/))
- Keylol ([keylol.com](https://keylol.com/))
- DLsite ([www.dlsite.com](http://www.dlsite.com/))
- Kemono ([kemono.cr](https://kemono.cr/))
- Coomer ([coomer.st](https://coomer.st/))
- Nekohouse ([nekohouse.su](https://nekohouse.su/))
- Discourse ([meta.discourse.org](https://meta.discourse.org/))
- Open AI ([community.openai.com](https://community.openai.com/))
- Cloudflare ([community.cloudflare.com](https://community.cloudflare.com/))
- Rule34Video(Rule34) ([rule34video.com](https://rule34video.com/))
- Rule34Generate(Rule34Gen) ([rule34gen.com](https://rule34gen.com/))
- panda.chaika.moe ([panda.chaika.moe](https://panda.chaika.moe/))
- WaniKani ([community.wanikani.com](https://community.wanikani.com/))
- tampermonkey.net.cn ([bbs.tampermonkey.net.cn](https://bbs.tampermonkey.net.cn/))
- Flarum Community ([discuss.flarum.org](https://discuss.flarum.org/))
- Flarum Community Chinese ([discuss.flarum.org.cn](https://discuss.flarum.org.cn/))
- uTools Community ([yuanliao.info](https://yuanliao.info/))
- NodeLoc ([www.nodeloc.com](https://www.nodeloc.com/))
- Veryfb ([veryfb.com](https://veryfb.com/))
- Kater ([kater.me](https://kater.me/))
- Viva La Vita ([bbs.viva-la-vita.org](https://bbs.viva-la-vita.org/))
- NodeSeek ([www.nodeseek.com](https://www.nodeseek.com/))
- Inoreader ([www.inoreader.com](https://www.inoreader.com/))
- zhipin.com ([www.zhipin.com](https://www.zhipin.com/))
- Cursor - Community Forum ([forum.cursor.com](https://forum.cursor.com/))
- Twitch ([www.twitch.tv](https://www.twitch.tv/))
- Yamibo.com ([bbs.yamibo.com](https://bbs.yamibo.com/))
- Flickr ([www.flickr.com](https://www.flickr.com/))
- Ruanyifeng ([www.ruanyifeng.com](https://www.ruanyifeng.com/blog/))
- その他多数。新しいサイトの追加を提案するには[こちら](https://greasyfork.org/scripts/460718-utags-add-usertags-to-links/feedback)をクリックしてください。

さらに、Greasy Forkの公開ルールにより、以下のウェブサイトではスクリプト設定で手動で`user matches`ルールを追加する必要があります：

- PornHub ([pornhub.com](https://www.pornhub.com/))
- e-hentai ([e-hentai.org](https://e-hentai.org/)), exhentai ([exhentai.org](https://exhentai.org/))
- dmm.co.jp ([www.dmm.co.jp](https://www.dmm.co.jp/))

![user matches](https://wsrv.nl/?url=https://greasyfork.s3.us-east-2.amazonaws.com/8mm3oa308eaymr8zdpsk72mjzgtx)

## 使用方法

- 投稿のタイトルやユーザー名にマウスを移動すると、隣にタグ🏷️アイコンが表示されます。アイコンをクリックしてタグを追加してください

- 複数のタグはカンマで区切ります

- 投稿のタイトル、ユーザー名、カテゴリにタグを追加できます
  ![スクリーンショット](https://wsrv.nl/?url=https://greasyfork.s3.us-east-2.amazonaws.com/h5x46uh3w12bfyhtfyo1wdip0xu4)

- 一部の特別なタグには特別な効果があります。例：「ignore」、「clickbait」、「promotion」、「block」、「hide」など
  ![スクリーンショット](https://wsrv.nl/?url=https://greasyfork.s3.us-east-2.amazonaws.com/568f6cu7je6isfx858kuyjorfl5n)

## スクリーンショット

![スクリーンショット](https://wsrv.nl/?url=https://raw.githubusercontent.com/utags/utags/refs/heads/main/assets/screenshots-01.png)

![スクリーンショット](https://wsrv.nl/?url=https://raw.githubusercontent.com/utags/utags/refs/heads/main/assets/screenshots-02.png)

![スクリーンショット](https://wsrv.nl/?url=https://raw.githubusercontent.com/utags/utags/refs/heads/main/assets/screenshots-03.png)

![スクリーンショット](https://wsrv.nl/?url=https://raw.githubusercontent.com/utags/utags/refs/heads/main/assets/screenshots-04.png)

![スクリーンショット](https://wsrv.nl/?url=https://raw.githubusercontent.com/utags/utags/refs/heads/main/assets/screenshots-05.png)

![スクリーンショット](https://wsrv.nl/?url=https://raw.githubusercontent.com/utags/utags/refs/heads/main/assets/screenshots-06.png)

## ビデオデモ

- 📺 YouTube: [デモ1](https://www.youtube.com/watch?v=WzUzBA5V91A) [デモ2](https://www.youtube.com/watch?v=zlNqk0nhLdI)

## 機能

- 閲覧中のページに直接タグを追加でき、タグを保存してもページが再読み込みされません
- 投稿のタイトル、ユーザー名、カテゴリにタグを追加できます
- Vimium拡張機能をサポート：「f」キーを押すとタグアイコンにもヒントマーカーが表示され、素早くタグを追加できます
- **モダンなブックマーク管理**：[https://utags.link/](https://utags.link/)にアクセスして高度なブックマーク管理機能を体験してください。Webアプリケーションの詳細については、[https://github.com/utags/utags-bookmarks](https://github.com/utags/utags-bookmarks)をご覧ください
- [タグリスト](https://utags.link/)ページで、タグ付きユーザーと投稿を更新順で確認できます
- [データのエクスポートとインポート](https://utags.link/)をサポート
- 閲覧済み投稿の自動マーク。閲覧済みコンテンツを半透明で表示したり非表示にしたりできます。この機能は設定ページで手動で有効にする必要があります。デフォルトでは無効です。現在は`linux.do`と`v2ex.com`のサイトにのみ適用されます
- 以下のユーザースクリプトマネージャーと互換性があります：
  - Tampermonkey（推奨）
  - Violentmonkey
  - Greasemonkey
  - ScriptCat
  - Userscripts (Safari MacOS/iOS)
  - Addons (Safari MacOS/iOS)

詳細情報：[https://github.com/utags/utags](https://github.com/utags/utags)

## リリースノート

- 0.19.x
  - データ同期ロジックの最適化、データ不整合問題の解決
  - dmm.co.jpサイトサポートの更新
  - 言語切り替え機能の追加
  - 日本語、韓国語、ドイツ語、フランス語、スペイン語、イタリア語、ポルトガル語、ロシア語、ベトナム語、繁体字中国語を含む多言語サポート
  - 現在のページにタグを追加するメニューコマンドの追加
- 0.18.x
  - Flickrサイトの追加
  - Ruanyifengサイトの追加
  - Twitchサイトの追加
  - Yamiboサイトの追加
  - v2ex.comのvxnaとplanetページで特別タグをサポート
  - GitHubファイルとフォルダのタグ付けをサポート
  - GitHub issueタイトルの隣にタグを表示
- 0.17.1
  - GitHubとWebDAVによるデータ同期をサポート
- 0.16.0
  - ブックマークのソフト削除機能を実装
- 0.15.0
  - 新しいWebアプリ（[https://utags.link](https://utags.link)）との統合
- 0.12.11
  - 設定可能な絵文字タグ数の制限を削除
- 0.12.10
  - BOSS Zhipinで企業と求人をマークし、備考を残すことができます。例えば、「block」や「hide」タグを追加することで、興味のない企業と求人を非表示にできます
  - www.zhipin.comサイトのサポートを追加
- 0.12.9
  - www.zhipin.comサイトのサポートを追加
- 0.12.5
  - Discourseのモバイル体験を向上
  - kater.meとbbs.viva-la-vita.orgサイトのサポートを追加
- 0.12.4
  - www.inoreader.comサイトのサポートを追加
- 0.12.3
  - www.nodeseek.comサイトのサポートを追加
- 0.12.2
  - flarumベースのサイトのサポートを追加（discuss.flarum.org、discuss.flarum.org.cn、www.nodeloc.com、freesmth.net、veryfb.comを含む）
- 0.12.1
  - bbs.tampermonkey.net.cnサイトのサポートを追加
  - ユーザースクリプトの公式インストールURLと拡張機能ストアのURLを追加
  - V2EXで閲覧コンテンツタグ付けを有効化
  - 閲覧コンテンツタグ付けをサポートするサイトで有効化ボタンを表示
- 0.12.0
  - カスタムスタイルの適用を有効化
- 0.11.1
  - 閲覧済みコンテンツのタイトル色変更オプションを追加
- 0.11.0
  - 閲覧済み投稿の自動マーク。閲覧済みコンテンツを半透明で表示したり非表示にしたりできます。この機能は設定ページで手動で有効にする必要があります。デフォルトでは無効です。現在は`linux.do`サイトにのみ適用されます
  - タグ入力インターフェースに「設定」ボタンを表示
- 0.10.7
  - X (Twitter)でのタグ追加を向上。特別タグでツイートとコメントをフィルタリング
- 0.10.6
  - community.wanikani.comのサポートを追加
- 0.10.4
  - rule34video.com、rule34gen.comのサポートを追加
- 0.10.3
  - Redditでコミュニティ、投稿、ユーザーにタグを追加可能。特別タグで投稿とコメントをフィルタリング
  - TikTokで動画とユーザーにタグを追加可能。特別タグで動画と返信をフィルタリング
- 0.10.1
  - RedNote(xiaohongshu)でノートとユーザーにタグを追加可能。特別タグでノートと返信をフィルタリング
  - パフォーマンスの向上
- 0.9.11
  - linux.doと他のdiscourseサイトで投稿、カテゴリ、タグにタグを追加可能。特別タグで投稿と返信をフィルタリング
- 0.9.10
  - dlsite.comのサポートを追加
  - dmm.co.jpのサポートを追加
  - kemono.suのサポートを追加
  - coomer.suのサポートを追加
  - keylol.comのサポートを追加
- 0.9.9
  - www.pixiv.netのサポートを追加
  - linux.doのサポートを追加
  - meta.appinn.netのサポートを追加
  - NGAのサポートを追加
- 0.9.8
  - twitter.com -> x.com
  - github.com、threads.net、e-hentai.orgの問題を修正
- 0.9.5
  - 絵文字タグ👍を追加
  - 候補タグリストのサイズを増加
  - タグ管理ページで選択/検索機能を有効化
  - テキストタグボーダーの幅を定義するためにCSS custom propertiesを使用
- 0.9.4
  - GitHubのセレクターを更新、issues、pull requests、discussionsにタグを追加可能
  - CSS custom propertiesでutagsフォントサイズとアイコンサイズを定義
- 0.9.3
  - セレクターとスタイルを更新
  - douban.comのサポートを追加
  - myanimelist.netのサポートを追加
  - 注入タイミングを'document_start'に変更
- 0.9.1
  - プロンプトUIにコピーボタンを追加
- 0.9.0
  - 高度なタグ入力プロンプトUIを使用
  - css custom propertiesでutags ulスタイルを定義
- 0.8.10
  - rebang.todayのサポートを追加
- 0.8.9
  - bilibili.com、greasyfork.org、youtube.com、douyin.com、pornhub.comのスタイルとマッチングルールを更新
- 0.8.8
  - podcasts.google.comのサポートを追加
  - douyin.comのサポートを追加
  - sspai.comのサポートを追加
- 0.8.7
  - weibo.com、weibo.cnのサポートを追加
  - pornhub.comのサポートを追加
- 0.8.6
  - xiaohongshu.comのサポートを追加
- 0.8.5
  - zhihu.comのサポートを追加
- 0.8.4
  - YouTubeのバグを修正、utags要素を再利用する際のキー比較
  - youtubeセレクターとスタイルを更新
- 0.8.0
  - 多言語サポートを実装、現在英語と中国語をサポート
- 0.7.7
  - instagram.com、threads.netを更新
  - パフォーマンス向上、ドキュメントが非表示でない時にタグを更新
- 0.7.6
  - CSP問題を修正するためにdata: urlのbackground-imageの代わりにsvg要素を使用
  - (v2ex): ve2x.repユーザースクリプトによって生成された引用返信を処理
- 0.7.5
  - chrome拡張機能とfirefoxアドオンのデフォルトサイトルールを処理
  - 現在のサイトでutagsを有効/無効にするオプションを追加
  - bilibili、githubセレクターを更新
- 0.7.3
  - bilibiliセレクターを更新
  - マージロジックを更新
- 0.7.2
  - 52pojie.cnのサポートを追加
  - juejin.cnのサポートを追加
- 0.7.1
  - tiktok.comのサポートを追加
  - bilibili.comのサポートを追加
  - youtube.comのサポートを追加
  - facebook.comのサポートを追加
- 0.7.0
  - threads.netのサポートを追加
  - instagram.comのサポートを追加
  - mp.weixin.qq.comのサポートを追加
- 0.6.7
  - twitter.comのサポートを追加
- 0.6.6
  - [github] issues、PR、コミットでユーザー名をマッチング
  - タグが変更されていない時のutags要素の再作成を防止
- 0.6.5
  - reddit.comのサポートを追加
- 0.6.4
  - github.comのサポートを追加
- 0.6.3
  - lobste.rsのサポートを追加
  - TABキーでutags要素にフォーカスを移動
  - Firefoxでvimiumヒントマーカーでutagsを表示
- 0.6.0
  - hacker news (news.ycombinator.com)のサポートを追加
- 0.5.2
  - パフォーマンス向上
  - HTMLテキストをコピーする際にタグコンテンツが一緒にコピーされることを防止
- 0.5.1
  - [V2EX] トピックページでトピックタグの表示位置を調整
  - [V2EX] 返信にタグを追加することを許可
- 0.5.0
  - greasyfork.orgとsleazyfork.orgのサポートを追加
  - [V2EX] すべての外部リンクにタグを追加することを許可
- 0.4.5
  - 空白エリアをクリックした時のタグボタン表示の遅延効果をキャンセル
  - 同じエリアを連続してクリックした時にタグボタンを非表示
- 0.4.1
  - タグアイコンとスタイルを更新
- 0.4.0
  - モバイルデバイスをサポート
- 0.3.1
  - アクセシビリティを向上、v2ex 超级增强の問題を修正
- 0.3.0
  - ネストした返信モードで非表示や半透明効果がブロック全体に影響する問題を修正
- 0.2.1
  - 設定にタグページとデータインポート/エクスポートページへのリンクを追加
- 0.2.0
  - 非表示アイテムの表示と透明度効果の無効化の設定を有効化
- 0.1.10
  - Violentmonkey、Greasemonkey(Firefox)、Userscripts(Safari)などのスクリプトマネージャーと互換性
- 0.1.5
  - clickbait、promotion、boring、ignore、read、hide、hidden、no more display、hot、favorite、follow、read laterなどの特別タグを追加
  - より多くのページをサポートするためにwww.v2ex.comマッチングルールを更新
- 0.1.4
  - www.v2ex.comのノードリンクにタグを追加することを有効化
- 0.1.2
  - Firefoxブラウザが'sb'や'block'などのタグの特別機能をサポートしない問題を解決
- 0.1.0
  - [Plasmo](https://www.plasmo.com/)ベースでコードをリファクタリング。ブラウザ拡張機能も利用可能
- 0.0.2
  - www.v2ex.comの様々なドメイン名をサポート
  - [データインポート/エクスポートページ](https://utags.pipecraft.net/data/)を追加
- 0.0.1
  - [www.v2ex.com](https://www.v2ex.com/)サイトをサポート、メンバーや投稿リンクにタグを追加または表示
  - タグ付きリンクの[リストページ](https://utags.pipecraft.net/tags/)を追加

## ライセンス

Copyright (c) 2023 [Pipecraft](https://www.pipecraft.net). [MIT License](https://github.com/utags/utags/blob/main/LICENSE)の下でライセンスされています。

## >\_

[![Pipecraft](https://img.shields.io/badge/site-pipecraft-brightgreen)](https://www.pipecraft.net)
[![UTags](https://img.shields.io/badge/site-UTags-brightgreen)](https://utags.link)
