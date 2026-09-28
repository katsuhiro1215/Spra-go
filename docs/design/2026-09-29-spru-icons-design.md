# スプルのアイコン・画像を画面に入れる — 設計書

- 作成日: 2026-09-29
- ステータス: Owner合意済み（使う絵、メール確認・パスワード再設定の扱い、ステージの丸、「じぶん」、SNS画像の字、画面ごとの入れ方、アプリのアイコン・名前の表記を対話で確認）
- 前提: 画面のまわり（`docs/design/2026-09-28-app-chrome-design.md`）、トップとプロフィール選び（`docs/design/2026-09-28-top-profiles-design.md`）、国の進め方（`docs/design/2026-09-28-travel-tickets-design.md`）。どれも実装済み
- 対応するタスク: `TASKS.md` 開発部門「スプルのアイコン画像（Ownerが用意）が届いたら…」「追加の画像…が届いたら切り抜いて使う」

## 1. 背景と目的

下のメニューや「じぶん」などは線のアイコン、アバターやアプリのアイコンは仮の絵のままになっている。Ownerが画像生成でスプルのアイコン・画像を用意した（`company/mascot/assets/image4.png`〜`image6.png`・`image9.png`・`image10.png`）。これを切り抜いて画面に入れ、線のアイコンと仮の絵をなくす。

**うまくいった目安**

1. 下のメニュー・「じぶん」・音のボタン・ステージの丸・町のボタンが、スプルの絵になる
2. プロフィール選びのアバターが、Ownerの6種になる
3. ブラウザのタブ・スマホのホーム画面・SNSで共有したときに、Spra Go のアイコンと画像が出る
4. 見つからないページが、Next.jsの初期の画面ではなく、迷子のスプルの画面になる

## 2. 決定事項（Owner確認済み）

| 項目 | 決定 |
|---|---|
| 使う絵 | image4（バッジ類）・image5（追加のアイコン8点）・image6（アバター6種）・image9（アプリのアイコン）・image10（SNS画像）。image7・8は頭の形がちがうので使わない |
| ブランドのS | アプリのアイコンとSNS画像のように外から見える所で、SmartSprouts の S の形の芽を守る。画面の中のバッジは、葉の形のままでよい |
| 進め方 | 今の切り抜きの道具（`tools/spru-assets/extract.py`・`crops.json`）に組を足す。アプリのアイコンとSNS画像は小さな道具を足して1回作り、Next.jsの決まった名前のファイルとして置く |
| メール確認・パスワード再設定 | 手紙と鍵のスプルは切り抜いて取っておくだけ。ページ作りは別の仕事にする（今はページに中身がない。8章） |
| ステージの丸 | 丸ごとバッジの絵にする。番号は丸の下の小さな札 |
| 「じぶん」（下のメニュー） | 名前の1文字をやめて、そのプレイヤーのアバターにする |
| SNS画像の字 | 左の空に、ロゴのマーク・「Spra Go」・「学ぶほど、世界が広がる。」を入れる |
| 名前の表記 | 画面とタブの「SpraGo」を「Spra Go」にそろえる（「スプラ」を単独で使わず、言葉を付ける。`company/secretary/notes/2026-09-28-decisions.md`） |
| ふりがな・文字の大きさ | 字そのものが意味なので、今の字のアイコンのまま |

## 3. 切り抜き（`tools/spru-assets/`）

### 3-1. 元の絵

`crops.json` の `sources` に足す。

| 名前 | ファイル | 中身 |
|---|---|---|
| `i4` | `company/mascot/assets/image4.png` | 入口の3種・下のメニュー4種・ステージ3種・乗り物・チケット・迷子のスプル |
| `i5` | `company/mascot/assets/image5.png` | 音オン・音オフ・バッグ・ログアウト・つづきから学ぶ・家族の町・手紙・鍵 |
| `i6` | `company/mascot/assets/image6.png` | アバター6種 |

### 3-2. もやを消す

image4〜6は、背景を透明にした絵のまわりに、うすい半透明の色（もや）が残っている。切り抜くとき、決めた濃さ（不透明度）より薄い所を透明にしてから、いちばん大きい塊を取り出す。

- 組ごと・1点ごとに `min_alpha`（0〜255）を書けるようにする。書いた物だけ、その値より薄い所を透明にする
- 今までの組（`min_alpha` を書かない物）は、今までどおりの結果になる

### 3-3. 組と中身

| 組（出力 `frontend/public/spru/{組}/`） | キー | 元の絵 | 保存する幅 |
|---|---|---|---|
| `icons` | `nav-learn`・`nav-trip`・`nav-town`・`nav-shop` | i4 | 192px |
| | `sound-on`・`sound-off`・`bag`・`logout`・`continue`・`family` | i5 | 192px |
| | `login`・`switch-profile`・`add-player` | i4 | 192px |
| | `letter`・`key`（取っておくだけ。画面では使わない） | i5 | 192px |
| `stages` | `locked`（灰色の鍵）・`open`（紫の鍵を持つ）・`cleared`（金のチェック） | i4 | 192px |
| `avatars` | `avatar-1`（赤・ボール）・`avatar-2`（橙・本）・`avatar-3`（黄・ひまわり）・`avatar-4`（青・紙飛行機）・`avatar-5`（紫・星）・`avatar-6`（桃・カメラ） | i6 | 288px |
| `travel` | `ship`・`plane` | i4 | 480px |
| | `ticket` | i4 | 192px |
| `pages` | `lost`（迷子のスプル） | i4 | 480px |

- 保存する幅は、画面に出す大きさの約3倍（高精細の画面でもぼやけない大きさ）
- 画面から使う一覧は `components/spru/spru-assets.ts` に `SPRU_ICONS`・`SPRU_STAGES`・`SPRU_AVATARS`・`SPRU_TRAVEL`・`SPRU_PAGES` として書き出す（今の `SPRU_ITEMS` などと同じ作り）

## 4. 画面への入れ方

### 4-1. 下のメニュー（`components/app/bottom-nav.tsx`・`nav-items.ts`）

- 学ぶ・せかい・ショップ: 線の絵をやめて、`icons` の `nav-learn`・`nav-trip`・`nav-shop`（32px）
- まち（真ん中）: 緑の丸（56px）をやめて、`nav-town` を大きく（60px）出す。今と同じく少し上に飛び出させる
- 選んでいる所の字の色と上の線は今のまま。選んでいないときも、絵は色のまま出す
- どのメニューにどの絵を使うかは `nav-items.ts` の `NAV_ITEMS` に持たせる（`icon` のキー）
- 「じぶん」: 名前の1文字をやめて、そのプレイヤーのアバター（`AvatarBadge`、28px）。プロフィールを選んでいないときは、スプルのふつうの顔

### 4-2. 「じぶん」のパネル（`components/app/me-sheet.tsx`）

- バッグ → `icons/bag`、プロフィールを切り替える → `icons/switch-profile`、ログアウト → `icons/logout`（どれも28px）
- パスポートは今のバッジ（`badges/passport`）のまま。ふりがな・文字の大きさは今の字のまま

### 4-3. 音のボタン（`components/app/sound-controls.tsx`・`sound-face.ts`）

- スプルの顔と小さな印（♪・✕）をやめて、オンは `icons/sound-on`、オフは `icons/sound-off` を、ボタン（44px）いっぱいに出す
- どちらの絵を出すかは `sound-face.ts` の関数で決める（名前は `soundIcon(enabled)`。オン → `sound-on`、オフ → `sound-off`）
- ボタンの読み上げの名前（「効果音をオフにする」など）は今のまま

### 4-4. ステージの丸（`components/app/stage-path.tsx`・`stage-node.ts`）

- 丸ごとバッジの絵（64px）にする。どの絵かは `stage-node.ts` の関数 `stageNodeImage(stage)` で、下の表の上から順に決める

  | ステージ | 絵 |
  |---|---|
  | 鍵がかかっている | `stages/locked` |
  | クリア済み（ボスも） | `stages/cleared` |
  | ボスで、まだクリアしていない | なし（今の赤い丸とボスの印のまま） |
  | それ以外（遊べる） | `stages/open` |

- 番号は、丸の下に重ねた小さなクリーム色の札に出す
- 選んでいる丸の輪（青）と、次に遊ぶステージの「START」の吹き出しは今のまま
- 鍵のステージは、絵がもう灰色なので、今の「押せないときに薄くする」はやめる（押せないのは今のまま）
- 読み上げの名前（「ステージ3(ロック中)」など）は今のまま

### 4-5. 町（`components/world/world-screen.tsx`・`town-buttons.tsx`・`world-hud.tsx`）

- 「つづきから学ぶ」: 本の線の絵をやめて、`icons/continue`（36px）
- 「家族の町」の札: 線の絵をやめて、`icons/family`（24px）
- 上のバッグのボタン: 線の絵をやめて、`icons/bag`（32px）
- 「おつかい」の札の線の絵（リュック）は今のまま（バッグと同じ絵にすると、見分けがつかないため）

### 4-6. 家族の町（`app/family/page.tsx`）

- 見出し「家族の町」の線の絵 → `icons/family`（28px）
- 「自分の町にもどる」 → 左にスプルの家の小さい絵（`house/home`、24px）

### 4-7. 旅（`components/travel/`・`app/trip/page.tsx`）

- 出発の場面（`departure-scene.tsx`）: 飛行機は仮の絵（`plane-art.tsx`）をやめて `travel/plane`、船は町の小舟の絵をやめて `travel/ship`（どちらも幅170px）。元の絵が左向きなので、左右を反転して右向きに出す。`plane-art.tsx` は消す
- 「せかい」の見出しの横のチケットの札: 線の絵をやめて `travel/ticket`（20px）
- チケットを手に入れたカード（`ticket-earned-card.tsx`）: 線の絵をやめて `travel/ticket` を大きく（56px）、見出しの上に出す

### 4-8. 見つからないページ（`app/not-found.tsx`、新規）

- 時間帯の空の背景（`SkyPage`）の真ん中に、迷子のスプル（`pages/lost`、幅200px）
- 見出し「ページが見つからないよ」、説明「さがしているページは、ここにはないみたい」
- ボタン「町にもどる」（`/` へ。ログインしていなければトップになる）
- ページの題名は「ページが見つかりません | Spra Go」
- 404の看板の絵（image4）は、数字が入っているので使わない

### 4-9. アバター（`components/app/avatars.ts`・`avatar-badge.tsx`）

- `avatars.ts` の仮の絵の対応表を、`SPRU_AVATARS` の6種に替える（`avatar-1`〜`avatar-6` の並びは3-3の表のとおり）。データベースとサーバーは触らない
- 新しい絵には色の輪が描いてあるので、`AvatarBadge` の今のクリーム色の枠と背景をやめて、絵を丸いっぱいに出す。選んでいる印は、今と同じく外側の緑の輪

### 4-10. 入口（`components/app/guest-landing.tsx`・`app/profiles/page.tsx`）

- 未ログインのトップの「アカウントをお持ちの方はログイン」: 左に `icons/login`（28px）
- プロフィール選びの「＋ 追加」: 点線の丸の中の「＋」の字をやめて、`icons/add-player`（点線の丸いっぱい）

## 5. アプリのアイコン（image9）

`tools/spru-assets/brand.py`（新規、Pillow）で作り、`frontend/src/app/` に置く。今の `favicon.ico`（Next.jsの初期の物）は置き換える。

| ファイル | 大きさ | 使われる所 | 作り方 |
|---|---|---|---|
| `app/favicon.ico` | 16・32・48px（1つのファイルに3つ） | ブラウザのタブ | 小さいとS字の芽がつぶれるので、頭（顔とS字の芽）のまわりを正方形に大きめに切り取ってから縮める |
| `app/icon.png` | 512px | 検索結果・ブラウザ | image9 をそのまま縮める |
| `app/apple-icon.png` | 180px | iPhoneのホーム画面 | image9 をそのまま縮める。背景の黄緑は透明にしない（透明だと黒くなるため） |
| `public/icons/icon-192.png`・`icon-512.png` | 192・512px | Androidのホーム画面 | image9 をそのまま縮める |

- `app/manifest.ts`（新規）: 名前「Spra Go」、短い名前「Spra Go」、説明（今のタブの説明と同じ）、アイコン（上の192・512px）、開き方はブラウザの枠なし（`standalone`）、最初のページ `/`、テーマの色 `#5bb33e`、背景の色 `#fffaf0`

## 6. SNS画像（image10）

同じ `brand.py` で作る。

- 大きさ: image10（1721×914）を幅1200に縮め、上下を少し切って1200×630にする
- 字: 左の空（画像の左45%）に、上から順に
  1. ロゴのマーク（`frontend/public/logo.svg`。Next.jsに入っている sharp でPNGにしてから重ねる）
  2. 「Spra Go」（大きく）
  3. 「学ぶほど、世界が広がる。」
- 書体: M PLUS Rounded 1c（無料、SIL Open Font License）。`tools/spru-assets/fonts/` に書体のファイルと使用許諾の文（`OFL.txt`）を置く
- 色: 字は画面と同じ濃い緑（`#3b7f26`）と焦げ茶（`#3b3226`）、白いふちを付けて空の上でも読みやすくする
- 置き場所: `app/opengraph-image.png`・`app/twitter-image.png`（同じ絵）と、絵の説明文 `app/opengraph-image.alt.txt`・`app/twitter-image.alt.txt`（「家の前で手を振るスプルと、Spra Go のロゴ」）
- 画像のURLのもとになるドメイン: `layout.tsx` の `metadataBase` に、設定 `NEXT_PUBLIC_SITE_URL` の値を使う（ないときは `http://localhost:3000`）。本番の値は、ブランドとドメインの設計で決める

## 7. 名前の表記

画面とタブに出る「SpraGo」を「Spra Go」にする。

- `app/layout.tsx` のタブの題名
- `app/about/page.tsx`（題名・説明）
- `app/world/[code]/page.tsx`（題名・説明・本文・「トップへ」のリンク）

ドキュメント（`CLAUDE.md` の「SpraGo（仮）」など）の名前は、ブランドとドメインの設計でまとめて直す。

## 8. やらないこと

- メール確認・パスワード再設定のページ作り（今はページに英語の見出しがあるだけで、ログインの画面からもつながっていない）。`TASKS.md` に「公開前必須」の仕事として足す。手紙と鍵のスプルは、そのとき使う
- 学ぶタブの地図（次の仕事）
- 町のアイテムの画像（`docs/design/2026-09-28-town-items-design.md` の段階2・3）
- 使わない絵: image4 の自転車・電車・車（使う場面ができたら使う）、「学ぶ」の切り替え（国旗から・地図から）、404の看板、スプルの家（image1 から背景を抜いた絵がもうある）、image7・8
- アバターを「じぶん」以外（町・ヘッダー・家族の町など）に出すこと
- ふりがな・文字の大きさの絵
- 本番のドメインを決めること

## 9. テスト

### 9-1. 画面（Vitest）

- `stageNodeImage`: 鍵 → `locked`／クリア（ボスも）→ `cleared`／まだのボス → なし／それ以外 → `open`
- `soundIcon`: オン → `sound-on`、オフ → `sound-off`（今の `soundFace` のテストを直す）
- `avatarImage`: 6つのキーがそれぞれ別の新しい絵になる・空と知らない名前は1つ目（今のテストを直す）
- `NAV_ITEMS`: 4つのメニューそれぞれに、`SPRU_ICONS` にある絵のキーが付いている
- 型チェック・lint

### 9-2. 切り抜きと作った画像

- `extract.py` を流して、3-3の全部のファイルができること。今までの組のファイルが変わらないこと（`git status` で、新しい組の物だけが増えている）
- 切り抜いた絵を目で見て、もやが残っていないこと・欠けていないこと
- `brand.py` で作ったアイコンとSNS画像を目で見て、S字の芽と字が読めること

### 9-3. ブラウザでの確認（幅320・390・1280px）

- 下のメニュー（まちの大きい絵・選んでいる所）・「じぶん」のアバター・「じぶん」のパネル・音のボタン（オン・オフ）
- 学ぶタブと国のページのステージの丸（鍵・遊べる・クリア・ボス・選んでいる輪・START）
- 町のボタン（つづきから学ぶ・家族の町・バッグ）、家族の町の見出しと「自分の町にもどる」
- せかいのチケットの札。出発の場面（町テストにチケットを1枚足して確かめ、確認後に元へ戻す）
- 見つからないページ（`/nai` などを開く）
- プロフィール選びのアバターと「＋ 追加」、未ログインのトップの「ログイン」
- ページの頭に、アイコン・SNS画像・manifest の指定が入っていること（ページのHTMLを見る）。タブにアイコンが出ること
- 確認のあと、開発用のデータが確認前と同じであることを確かめる

## 10. ドキュメントの更新

- `SPEC.md`: 画面のまわり（下のメニュー・「じぶん」・音のボタン）とステージの丸の見た目、見つからないページ、アプリのアイコン・SNS画像、名前の表記「Spra Go」
- `TASKS.md`: 「スプルのアイコン画像…」「追加の画像…」を完了にする。「メール確認・パスワード再設定のページを作る（公開前必須）」を足す。「ほかの小さな点」のタブの題名・アイコン・SNS画像の所を直す
- `company/mascot/CLAUDE.md`: image4〜6・9・10 の使い方を追記する
