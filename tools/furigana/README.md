# ふりがなの辞書

画面の自動ふりがな（`frontend/src/components/app/auto-furigana.tsx`）は、2つの辞書を合わせて使う。

| 辞書 | 場所 | 作り方 |
|---|---|---|
| 手の辞書（優先） | `frontend/src/lib/furigana-dictionary.json` | 手で足す・直す。同じ語は、こちらが勝つ |
| 作った辞書 | `frontend/src/lib/furigana-generated.json` | 下の手順で、問題の文から自動で作る（形態素解析 Sudachi） |

設計: `docs/design/2026-10-09-furigana-morph-design.md`

## 作り直す（問題が増えたとき）

```bash
# 1. 問題・選択肢・解説・単語帳・国の文字を書き出す
php artisan furigana:corpus storage/corpus.txt
# 2. 作るときだけ使うソフト(画面・サーバーには入れない)
python3 -m venv /tmp/furigana-venv && /tmp/furigana-venv/bin/pip install sudachipy sudachidict_core
# 3. 辞書を作る
/tmp/furigana-venv/bin/python tools/furigana/build_generated.py storage/corpus.txt
```

- `conflicts.txt`: 読みが複数出た語と回数。町（ちょう／まち）・国（くに／こく）など、文脈で変わる語。多く使われる読みで困る語は、手の辞書に足して直す
- 1文字の語は、いちばん多い読みが8割以上のときだけ作る。割れる語（家・島・村など）は、必要なら手の辞書に足す
- Sudachiが古い読みを返す語がある（難しい→がたし、言う→ゆう）。見つけたら手の辞書で直す
- 数字の後ろの日・人・月は、辞書でなく `counter-reading.ts` が読む
