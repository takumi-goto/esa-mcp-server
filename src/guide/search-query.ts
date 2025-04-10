/**
 * esa の検索クエリのドキュメント(LLM に必要な情報のみ抜粋)
 * @see https://docs.esa.io/posts/104
 */
export const searchQueryDocument = /* markdown */ `---
original-documents:
  - https://docs.esa.io/posts/104
---

# 記事検索のオプション・仕様について

## 検索オプション

検索に下記のオプションを使うことで、様々な角度から絞り込み検索をすることができます。

使用例:

\`\`\`
category:日報
\`\`\`

\`\`\`
created:>2023-07-05 @taea wip:false
\`\`\`

| 記法                                     | 説明                                                                                                                                                                               |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| \`keyword\`                                | 記事名 or カテゴリ or 本文にkeywordを含むもの(表記の揺れを考慮した検索)                                                                                                            |
| \`"keyword"\`                              | 記事名 or カテゴリ or 本文にkeywordを含むもの(語句の完全一致による検索)<br> [#220: ReleaseNotes/2017/07/12/""を使うと語句の完全一致による検索ができるようになりました](/posts/220) |
| \`name:keyword\` または \`title:keyword\`    | 記事名にkeywordを含むもの                                                                                                                                                          |
| \`full_name:keyword\`                      | "[カテゴリ名]/[記事名]" にkeywordを含むもの                                                                                                                                        |
| \`number\`                                 | 記事ID（URL末尾の番号）                                                                                                                                                            |
| \`wip:true または wip:false\`              | 記事の WIP or Shipped 状態                                                                                                                                                         |
| \`kind:stock または kind:flow\`            | 記事のStock or Flow 状態 <br> [#31: release_note/2014/12/13/検索結果の絞り込み(Stock or Flow)](/posts/31)                                                                          |
| \`category:keyword\`                       | カテゴリ名にkeywordを含むもの(部分一致)                                                                                                                                            |
| \`in:keyword\`                             | カテゴリ名がkeywordから始まるもの(前方一致)                                                                                                                                        |
| \`on:keyword\`                             | カテゴリ名がkeywordであるもの(完全一致)                                                                                                                                            |
| \`body:keyword\`                           | 記事本文にkeywordを含むもの                                                                                                                                                        |
| \`#tag1\` または \`tag:tag1\`                | tag1 タグが付いているもの(大文字小文字区別なし)                                                                                                                                    |
| \`#tag1 case_sensitive:true\`              | tag1 タグが付いているもの(大文字小文字区別あり)                                                                                                                                    |
| \`@screen_name\` または \`user:screen_name\` | 記事作成者のscreen_name                                                                                                                                                            |
| \`updated_by:screen_name\`                 | 記事の最終更新者のscreen_name                                                                                                                                                      |
| \`comment:keyword\`                        | コメント本文に keyword が含まれる記事                                                                                                                                              |
| \`starred:true\` または \`starred:false\`    | 自分がStarしている記事                                                                                                                                                             |
| \`watched:true\` または \`watched:false\`    | 自分がWatchしている記事                                                                                                                                                            |
| \`watched_by:screen_name\`                 | 記事をwatchしているメンバーのscreen_name                                                                                                                                           |
| \`sharing:true\` または \`sharing:false\`    | 記事の外部公開状態                                                                                                                                                                 |
| \`stars:>3\`                               | Star数が3より大きい記事                                                                                                                                                            |
| \`watches:>4\`                             | Watch数が4より大きい記事                                                                                                                                                           |
| \`comments:>5\`                            | コメント数が5より大きい記事                                                                                                                                                        |
| \`done:>=6\`                               | 完了したタスクが6以上の記事                                                                                                                                                        |
| \`undone:>0\`                              | 未完了のタスクが0より大きい記事                                                                                                                                                    |
| \`created:>2015-07-05\`                    | 2015-07-05以降に作成された記事                                                                                                                                                     |
| \`updated:>2015-07\`                       | 2015-07-01以降に更新された記事                                                                                                                                                     |
| \`keyword1 keyword2\`                      | AND検索(スペース区切り)                                                                                                                                                            |
| \`keyword1 OR keyword2\`                   | OR検索                                                                                                                                                                             |
| \`keyword1 \| keyword2\`                   | OR検索                                                                                                                                                                             |
| \`-keyword\`                               | 否定検索                                                                                                                                                                           |

### 語句の結合の優先順位

通常検索内容は左から順番に処理されますが、\`()\` を使って優先順位を調整することができます。特に、OR検索と組み合わせると便利です。

例:

- \`in:日報 えさ OR 餌\` => (\`in:日報\` AND \`えさ\`) OR (\`餌\`) として処理
- \`in:日報 (えさ OR 餌)\` => (\`in:日報\`) AND ( \`えさ\` OR \`餌\`) として処理

### 数値や日付で絞り込む

\`stars\`、 \`watches\`、\`comments\`、\`number\`、\`done\`、\`undone\` 、\`created\`、\`updated\` は 以下のような書き方ができます。

| 記法        | 説明              |
| ----------- | ----------------- |
| \`stars:3\`   | starが3つ         |
| \`stars:>3\`  | starが3より大きい |
| \`stars:<3\`  | starが3未満       |
| \`stars:>=3\` | starが3以上       |
| \`stars:<=3\` | starが3以下       |

### ソート順を指定する

\`sort:ソートキー\`で指定

使えるソートキー

| ソートキー      | 説明                 |
| --------------- | -------------------- |
| best_match-desc | ベストマッチ         |
| updated-desc    | 更新日時が新しい順   |
| updated-asc     | 更新日時が古い順     |
| created-desc    | 作成日時が新しい順   |
| created-asc     | 作成日時が古い順     |
| stars-desc      | Starの多い順         |
| watches-desc    | Watchの多い順        |
| comments-desc   | コメントの多い順     |
| full_name-asc   | カテゴリ・タイトル順 |
| name-asc        | 記事タイトル順       |
| number-desc     | 記事IDの大きい順     |
| number-asc      | 記事IDの小さい順     |

並び替え条件を best_match-desc にして検索すると、特定の条件に合致するものが優先的に検索上位に来るようになります。詳しくは、[キーワード検索しやすい記事にするコツ](#xxx)をご確認ください。

## 検索例

- \`help\`
  - 記事名もしくはカテゴリもしくは記事本文に \`help\` が含まれる記事を検索
  - https://docs.esa.io/posts?q=help
- \`-in:help user:fukayatsu\`
  - カテゴリに \`help\` が含まれず、\`fukayatsu\` が作成した記事を検索
  - https://docs.esa.io/posts?q=-in%3Ahelp+user%3Afukayatsu
- \`name:テーブル #markdown\`
  - 記事名に \`テーブル\` が含まれ、 \`markdown\` タグが付いている記事を検索
  - https://docs.esa.io/posts?q=name%3A%E3%83%86%E3%83%BC%E3%83%96%E3%83%AB+%23markdown&tag=markdown
`
