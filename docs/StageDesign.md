# Stage機能 設計ドキュメント (v2)

`docs/Stage.md` で示された仕様を、現在の実装(カテゴリー×難易度でクイズをプールする方式)からどう発展させるかの設計メモ。**このドキュメント自体はまだ実装を伴わない。実装前の合意用。**

v1からの変更点: テーブル数を増やして粒度を上げ、「進捗の記録場所が無い」「プールを毎回ランダムクエリで引くと重くなる」という2つの見落としを解消した。

## 背景・現状差分

| | 現状 | Stage.md |
|---|---|---|
| 粒度 | 難易度=1つの問題プール(初級/中級/上級) | 難易度の中にStage1〜N(初級5・中級20・上級30) |
| 出題形式 | 4択で固定 | Stageごとに角度が進化(国旗→国名、国名→国旗、地理、首都、言語) |
| 最終Stage | 特別扱いなし | ボス戦(問題数2倍)+称号報酬 |
| 進捗 | 記録なし(毎回プールから出題するだけ) | どのStageをクリアしたか、ロック状態、実績が必要 |
| 経済 | UIのみのモック(HP20/20固定、Coin0固定) | 正解/不正解でHP・XP・Coin増減、コンボ、Stageクリアボーナス |
| その後 | なし | ショップ・パスポート(実績)・クリア後の旅演出 |

## v1からの2つの見落としと、その解決方針

### 見落とし1: 「クリア済みか」を記録する場所が無かった

v1はStageと問題プールの構造だけで、**誰がどのStageをクリアしたか**を記録するテーブルが無かった。これが無いと以下が全部作れない:
- Stage2はStage1クリアまでロック、という進行制御
- 初級Stage1〜5が全部クリア済みなら「🏆初級クリア！」
- パスポートの達成率(何%埋まっているか)
- 称号(ボスクリアで付与)を「誰が持っているか」の判定

→ `profile_stage_progress` を新設し、進捗の唯一の情報源にする(下記)。

### 見落とし2: プールを毎回ランダムクエリで引く設計は、コンテンツが増えるほど重くなる

v1の`inRandomOrder()->limit(N)`はMySQLの`ORDER BY RAND()`で、テーブルが大きくなるほど全件スキャン+ソートのコストが増える典型的なアンチパターン。**「ランダムに選ぶ」という重い処理を、毎回のプレイ時ではなく、Owner側でStageを作る時(1回だけ)に前倒しする**のが正しい設計。

→ `stage_questions` という中間テーブルで「このStageにはこの問題たち」を事前に確定させておく。プレイ時は`WHERE stage_id = ?`のインデックス検索だけで済む。出題順のランダム性は、取得済みの少数件(10〜20件)を**PHP側で`shuffle()`**すれば十分でDBに負荷はかからない。

## データモデル案

### 1. `stages`(難易度内のStage定義)

```
stages
  id
  category_id       FK -> categories
  difficulty        string (初級 / 中級 / 上級)
  stage_number      unsignedInteger        ※ 難易度内の通し番号(1,2,3...)
  question_theme_id FK -> question_themes, nullable  ※ このStageの出題の角度(下記)
  question_count    unsignedInteger        ※ 目標問題数。通常10、ボスは20
  is_boss           boolean, default false
  title_reward      string, nullable       ※ ボスクリア時の称号。例: "イタリア博士"
  unique(category_id, difficulty, stage_number)
```

### 2. `question_themes`(新規、出題の角度の参照テーブル)

v1では`stages.question_type`を自由文字列にしていたが、これだと種類が増えたときにOwner画面でどんな値が使えるか把握できない。参照テーブルにして選択式にする(コード変更なしでOwnerが新しい角度を追加できる):

```
question_themes
  id
  key          string, unique  ※ flag_to_country / country_to_flag / geography / capital / language など
  label        string          ※ Owner画面表示用。「国旗→国名」など
  description  text, nullable
```

注意: これは既存の`questions.type`(multiple_choice / reorder / fill_blank など、**回答方法**の種別)とは別軸。`question_themes`は**出題の切り口**(内容のテーマ)を表す。名前が紛らわしいので明確に区別している。

### 3. `stage_questions`(新規、StageとQuestionの中間テーブル)

`quizzes.stage_id`という案(v1)をやめ、StageとQuestionを直接つなぐ中間テーブルにする。QuizはOwnerが問題を作るときの「教材フォルダ」的な単位として残り(title/description/is_publishedはそのまま)、実際にどのStageで出題するかはこちらで決める。同じ問題を複数Stageで再利用することも可能になり柔軟性が上がる。

```
stage_questions
  id
  stage_id     FK -> stages
  question_id  FK -> questions
  order        unsignedInteger
  unique(stage_id, question_id)
  index(stage_id)   ※ プレイ時の取得はこのインデックスだけで完結
```

Owner側には「このStageに問題を追加」の操作画面を用意し、追加した時点でランダム抽出などの重い処理を終わらせておく(候補から選ぶ/自動でN件割り当てる、など)。プレイ時のクエリ:

```php
Question::whereIn('id', $stage->stage_questions()->pluck('question_id'))->with('choices')->get()->shuffle();
```

### 4. `profile_stage_progress`(新規、進捗の唯一の情報源)

```
profile_stage_progress
  id
  user_profile_id  FK -> user_profiles
  stage_id         FK -> stages
  best_score       unsignedInteger, nullable   ※ 自己ベストの正解数
  cleared_at       timestamp, nullable
  attempts         unsignedInteger, default 0
  unique(user_profile_id, stage_id)
```

全Stage分を事前生成せず、**挑戦した時点で初めて行を作る**(スパースに保つ。初級/中級/上級合計55Stage×全プロフィール分を先に用意すると無駄にレコードが増える)。ロック判定は「1つ前の`stage_number`の行に`cleared_at`があるか」を見るだけで、Stageを跨いだ集計は不要 = 軽い。

### 5. `profile_titles`(新規、称号の付与記録)

```
profile_titles
  id
  user_profile_id  FK -> user_profiles
  title            string
  source_stage_id  FK -> stages, nullable   ※ どのボスStageで獲得したか(トレーサビリティ用)
  unlocked_at      timestamp
```

`stages.title_reward`は「このStageをクリアすると何がもらえるか」という**定義**、`profile_titles`は「誰が実際に獲得したか」という**実績**。両方必要(片方だけでは表現できない)。

### 6. 経済(XP / Coin / HP)は引き続きフラットな列で持つ

ここはv1のまま。プレイ中に毎回参照・更新する値なので、正規化しすぎずシンプルな列にしておくのが正しい(1回のUPDATEで完結し、集計不要):

```
user_profiles に追加
  hp        unsignedInteger, default 20
  max_hp    unsignedInteger, default 20
  xp        unsignedInteger, default 0
  coins     unsignedInteger, default 0
  level     unsignedInteger, default 1
```

正解/不正解時の増減は**サーバー側**で計算し、クライアントには結果だけ返す(クライアント側計算は改ざん可能)。

### 7. `profile_currency_ledger`(新規、任意だが推奨)

HP/XP/Coinの増減理由を後から追えるようにする台帳。ショップでの購入・返金対応や「なぜ増減したか」のデバッグに必要になる。プレイ中のホットパスには影響を与えない(1行追記するだけ、読み取りはしない):

```
profile_currency_ledger
  id
  user_profile_id  FK -> user_profiles
  type             string  ※ xp / coin / hp
  delta            integer  ※ +10, -2 など
  reason           string  ※ answer_correct / answer_wrong / stage_clear / combo_bonus / shop_purchase / level_up_heal など
  question_id      FK -> questions, nullable
  stage_id         FK -> stages, nullable
  created_at
```

フェーズ3(経済)の実装時に`user_profiles`の増減と同時に1行追記するだけで良く、実装コストは小さい。ショップ(フェーズ5)を作る頃には購入履歴としてそのまま使える。

### 8. ショップ・パスポート(引き続き後回し、スケッチを更新)

```
shop_items           id, name, price, type(potion/plane/background/character/title), meta(json)
user_profile_items    user_profile_id, shop_item_id, purchased_at
```

パスポートはv1で専用テーブルを考えていたが、**`profile_stage_progress`(+カテゴリー)から導出できる部分が大半**なので、まずは専用テーブルなしで一覧画面をSQLの集計だけで作れないか検討する。「挨拶」のようにカテゴリーと一致しない実績項目が出てきた時点で、その項目だけ`passport_requirements`/`profile_passport_stamps`のような軽いテーブルを足す、という増分アプローチにする。

## パフォーマンスへの配慮(まとめ)

「ゲーム中に重くならない」ために各所で意識した点:

- 出題プールの確定は**Owner操作時に1回**(`stage_questions`)。プレイ時はインデックス検索のみ、`ORDER BY RAND()`は使わない
- 出題順のランダム性は取得済みの少数件をPHPで`shuffle()`(DBに負荷をかけない)
- 進捗(`profile_stage_progress`)は挑戦したStageの分だけ記録するスパース設計。ロック判定は1行の存在確認のみ
- HP/XP/Coinは集計不要なフラットカウンター列。台帳(`profile_currency_ledger`)は書き込み専用でホットパスの読み取りに影響しない
- 各テーブルの検索キーになる列(`stage_id`, `user_profile_id`など)はFK+複合uniqueで自然にインデックスされる

## 実装フェーズ案(更新)

1. **Stage土台**: `stages` + `question_themes` テーブル、Owner側CRUD(カテゴリー配下にStage一覧・作成・編集・ボス設定・出題の角度選択)
2. **出題プールの確定**: `stage_questions` テーブル+Owner側で「Stageに問題を割り当てる」操作画面。既存2クイズの問題をどこかのStageに割り当てて動作確認
3. **プレイ側のStage対応**: `/play/[id]`をStage一覧(ロック/クリア状態表示)に変更。出題を`stage_questions`ベースに変更。ボスStageの演出
4. **進捗記録**: `profile_stage_progress`を追加し、クリア時に記録。ロック解除・「初級クリア」判定を実装
5. **経済の永続化**: `user_profiles`にhp/xp/coins/level追加、`profile_currency_ledger`追加。回答APIが増減を計算して返すよう拡張。フロントのHPゲージ/ポイント表示を実データに接続
6. **正解/不正解演出**: 画面いっぱいの「✨Correct!!」「😢Wrong!」演出、Stageクリア画面、称号獲得演出(`profile_titles`)
7. **ショップ**: `shop_items`+購入API(`profile_currency_ledger`に記録)+ショップ画面
8. **パスポート**: `profile_stage_progress`からの集計表示。導出できない項目のみ追加テーブルを検討
9. **旅演出**: クリア後の国到着シーン(背景・キャラクターの台詞・ミニ選択肢)

各フェーズは独立して動作確認できる単位に分けている。v1より1つ増えて9フェーズになったが、1つ1つは小さい。

## 未確定・要相談

- `stage_questions`への問題割り当てをOwner画面でどう操作させるか(候補一覧からチェックして追加/「N件自動割り当て」ボタンで済ませるか)
- `question_themes`はStageに強制する(このStageはこのテーマの問題しか入れられない)か、ラベル程度の緩い運用にするか
- `profile_currency_ledger`をフェーズ3から作るか、フェーズ5(ショップ)まで待つか(早く作るほど後から履歴が追える)
- 上級Stage6以降のような「まだ作られていないStage」をUIでどう見せるか(「Coming Soon」ロック表示など)
- HP/XP/Coinの増減ロジックをルート内に直書きするか、サービスクラスに切り出すか
