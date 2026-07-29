# Main(世界を旅するRPG) 設計ドキュメント (v1)

`docs/MainQuiz.md` で示されたビジョンを、現在の実装(Category軸のミニアプリ+Stage/経済システム)の上にどう重ねるかの設計メモ。**このドキュメント自体はまだ実装を伴わない。実装前の合意用。**

結論から言うと、MainQuiz.mdは今の実装を作り直す話ではない。`stages`/`stage_questions`/`profile_stage_progress`/経済(HP・XP・Coin)は既にカテゴリーを問わない共通基盤になっており、その上に「国から旅を始める」という1枚のナビゲーション層(Main)を被せ、既存のカテゴリー別クイズ(国旗・動物・食べ物…)を「ミニアプリ」として位置づけ直す作業になる。

## 背景・現状差分

| | 現状 | MainQuiz.md |
|---|---|---|
| ホーム画面の主役 | カテゴリー(国旗/動物/食べ物…)が円形に並ぶ | 国が円形に並ぶ。「どこから冒険する？」 |
| カテゴリー群の位置づけ | ホームの主導線そのもの | 「ミニアプリ」としてホームの脇に退避。独立して遊べるが成果は共通の世界ポイントに合算 |
| 進捗の単位 | Stage単位(`profile_stage_progress`)のみ | 国単位・地域単位の達成率(「日本18%」「大阪★★★★☆」)が要る |
| 地理の粒度 | カテゴリーツリーの中に国が子として入っている(国旗カテゴリー限定) | 世界→国→地方→都道府県→都市→ジャンル→問題、という独立した地理階層 |
| 国をまたぐ進行 | 概念がない(どの国でも常に遊べる) | 航空券で次の国を解放する、という国単位のゲート |
| 出題の選び方 | プレイヤーがStageを選ぶ | メインクエストでは選ばせない。「今日はこれ」と提示する |
| 演出・物語 | StageDesign.mdフェーズ6/9で計画済み・未着手 | キャラクターの出迎え、飛行機演出、「世界探検隊」という物語の皮 |
| コレクション要素 | StageDesign.mdフェーズ8「パスポート」で計画済み・未着手 | 「世界図鑑」(国旗図鑑・地図・会話帳・グルメ図鑑) |

## 生かせるもの・新しく要るもの

### そのまま使えるもの

- **経済(XP/Coin/HP)**: `user_profiles`のXP/Coinはカテゴリーを問わない共通の財布。「どのミニアプリで遊んでも世界ポイントに変換される」は既に成立している。
- **Stage/`stage_questions`エンジン**: 出題プールの確定・シャッフルの仕組みはそのまま使える。「今日の1本」はStageの中から1つを選ぶロジックを足すだけで乗る。
- **`profile_stage_progress`**: クリア記録の唯一の情報源として、国・地域単位の達成率もここから集計できる。
- **StageDesign.mdフェーズ6(演出)/8(パスポート)/9(旅演出)**: 未着手のまま温存されていたこれらのフェーズが、そのままMainQuiz.mdの「キャラクター演出」「世界図鑑」「飛行機演出」の実装先になる。

### 新しく要るもの

1. **ユーザー向け`GET /api/countries`**: 現状Owner向けの`/api/owner/countries`しかない。ホームの円を国にするには新設が必要。
2. **地理の階層(`regions`)**: 既存の`categories`は「国旗カテゴリーの子としての国」という*トピック上の*関係であり、「大阪は日本という場所の中にある」という*地理上の*親子関係とは軸が違う。無理に`categories`を深くするのではなく、地理専用の`regions`テーブルを新設する。
3. **国単位の達成率**: `stages`に`country_id`を持たせ、`profile_stage_progress`との集計で算出する。
4. **国の解放(航空券)**: StageDesign.mdフェーズ7(ショップ)で構想していた「航空券アイテム」の前倒し実装で表現できる。
5. **「今日の1本」自動選出**: メインクエスト専用の小さな選出ロジック(ミニアプリ側は今まで通り手動選択のまま)。

## データモデル案

### 1. `regions`(新規、地理ドリルダウン専用)

```
regions
  id
  country_id   FK -> countries
  parent_id    FK -> regions, nullable  ※ 地方→都道府県→都市の自己参照
  kind         string (region / prefecture / city)
  name         string
  order        unsignedInteger, default 0
  unique(country_id, parent_id, name)
```

`categories`(トピック軸: 国旗/動物/食べ物…)とは完全に独立させる。都市の中の「ジャンル」(鉄道・グルメ・難読地名など)は、既存の`question_themes`または`categories`の子としてぶら下げる形を想定(要相談、下記)。

### 2. `stages`に`country_id`・`region_id`を追加(既存テーブルの拡張)

```
stages に追加
  country_id  FK -> countries, nullable
  region_id   FK -> regions, nullable
```

ミニアプリのStage(例: 国旗カテゴリーのStage)にも`country_id`を任意で設定できるようにする。これにより「どのミニアプリで遊んでも国の達成率に合算される」を、特別な集計テーブルなしで表現できる。メインクエスト専用のStageは`region_id`まで設定する。

### 3. 国単位の達成率(新テーブル不要)

```php
$total = Stage::where('country_id', $countryId)->count();
$cleared = ProfileStageProgress::where('user_profile_id', $profileId)
    ->whereIn('stage_id', Stage::where('country_id', $countryId)->pluck('id'))
    ->whereNotNull('cleared_at')
    ->count();
```

`profile_stage_progress`は既にスパースな設計なので、追加のカウンターテーブルは今のところ不要。国あたりのStage数が数百件規模になった時点で重くなるようなら、`profile_country_progress`のようなキャッシュテーブルを足す増分アプローチにする。

### 4. `profile_unlocked_countries`(新規、国の解放記録)

```
profile_unlocked_countries
  id
  user_profile_id  FK -> user_profiles
  country_id       FK -> countries
  unlocked_at      timestamp
```

`profile_stage_progress`と同じ「挑戦(解放)した時点で行を作る」スパース設計。最初の国(例: 日本)は全プロフィールに自動解放。解放条件(達成率/航空券消費)は未確定(下記)。

### 5. 国の雰囲気・物語(`countries`に軽量カラムを追加)

```
countries に追加
  mood_emoji      string, nullable  ※ 🌸 🍁 🐉 など
  intro_message   text, nullable    ※ 「ようこそ日本へ！」
```

専用テーブルは今は不要。StageDesign.md検討時に見送った`Media`モデルと同じ理由で、実例が増えてから正規化する。

### 6. 世界図鑑(新テーブル不要、StageDesign.mdフェーズ8の再構成)

`profile_stage_progress` + `Country`/`Question.country_id`からの集計表示。StageDesign.mdの時点で「導出できない項目が出た時だけ`passport_requirements`等を足す」という結論が出ており、方針は変わらない。

## パフォーマンスへの配慮

- 国単位の達成率は当面ライブ集計(件数が小さいうちはインデックス付きCOUNTで十分)。StageDesign.mdの「ORDER BY RANDは避ける」という方針と同じく、重くなってから初めてキャッシュ層を足す。
- 「今日の1本」はDBに新しい状態を持たせず、日付とプロフィールIDからの決定的な選出(同じ日は同じ結果、日が変われば変わる)にすれば、書き込み無しで実現できる。
- `regions`は`stages`と同じく複合ユニーク制約(`country_id`,`parent_id`,`name`)で自然にインデックスされる。

## 実装フェーズ案

1. **ホーム画面の主客逆転**: `GET /api/countries`新設。ホームの円を国に、既存カテゴリー群を「ミニアプリ」として別セクション(画面右など)へ退避。見た目の方向性をまず確定させる。
2. **国ランディング画面**: `/travel/[countryId]`(仮)を新規作成。国の達成率表示。この時点では地域階層なしで、国→(既存の)Stage一覧に直接ドリルダウンできれば十分。`stages.country_id`はこのフェーズで追加。
3. **`regions`と階層ドリルダウン**: 世界→国→地方→都道府県→都市。`stages.region_id`を追加。
4. **国の解放/航空券**: `profile_unlocked_countries`。最初は全国解放のままにしておき、達成率条件や(将来の)ショップアイテム消費でのロックへ段階的に置き換える。Stageのロックをフェーズ3→4で段階導入したのと同じ進め方。
5. **「今日の1本」自動選出**: メインクエスト限定で、選ばせず1つのStageを提示するロジック。
6. **物語・演出**: キャラクターの出迎え、飛行機演出。StageDesign.mdフェーズ6/9と統合して実装。
7. **世界図鑑**: StageDesign.mdフェーズ8を「世界図鑑」としてUI再構成。

各フェーズは独立して動作確認できる単位に分けている。1・2だけでもMainQuiz.mdの核となる体験(国から始まる・達成率が見える)は成立する。

## 未確定・要相談

- ミニアプリ(国旗/動物/食べ物…)のStageにも`country_id`を持たせて国の達成率に合算するか、完全に別会計にするか
- `regions`の深さ(地方→都道府県→都市)を最初からフルで作るか、まず「国→Stage一覧」の浅い版で様子を見るか
- 都市の中の「ジャンル」(鉄道・グルメ・難読地名)を`question_themes`の再利用にするか、`regions`の子(kind=genre)にするか、別軸にするか
- 国の解放条件(達成率のしきい値か、航空券アイテム消費か、両方か)
- 「今日の1本」の選出ロジック(完全ランダムか、未クリア優先か、日付固定シードか)
- 航空券をフェーズ7(ショップ)本体より前倒しで作るか、ショップ全体と一緒に作るか
