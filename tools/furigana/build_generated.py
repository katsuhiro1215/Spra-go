#!/usr/bin/env python3
"""
ふりがなの辞書を、形態素解析(Sudachi)で作る(docs/design/2026-10-09-furigana-morph-design.md 3-2)。

  php artisan furigana:corpus storage/corpus.txt
  python3 tools/furigana/build_generated.py storage/corpus.txt

出力: frontend/src/lib/furigana-generated.json (語→ひらがなの読み。長い語が先)
      tools/furigana/conflicts.txt (読みが複数出た語と回数。必要なものは furigana-dictionary.json で直す)
前提: pip install sudachipy sudachidict_core (作るときだけ。画面・サーバーには入れない)
"""
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

from sudachipy import dictionary, tokenizer

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "frontend/src/lib/furigana-generated.json"
CONFLICTS = ROOT / "tools/furigana/conflicts.txt"

KANJI = re.compile(r"[一-鿿々]")
HIRAGANA = re.compile(r"^[ぁ-ゖー]+$")


def to_hiragana(text: str) -> str:
    return "".join(chr(ord(c) - 0x60) if "ァ" <= c <= "ヶ" else c for c in text)


# 長音「ー」を、ひらがなの書き方(ぎょうざ・おおきい)に直す。あ段→あ、い段→い、う段→う、え段→い、お段→う
VOWEL_OF = {}
for _vowel, _chars in {"あ": "ぁあかがさざただなはばぱまゃやらゎわ", "い": "ぃいきぎしじちぢにひびぴみり", "う": "ぅうくぐすずっつづぬふぶぷむゅゆるゔ", "え": "ぇえけげせぜてでねへべぺめれ", "お": "ぉおこごそぞとどのほぼぽもょよろを"}.items():
    for _c in _chars:
        VOWEL_OF[_c] = _vowel
LONG_OF = {"あ": "あ", "い": "い", "う": "う", "え": "い", "お": "う"}

# Sudachiの読みが、発音の形(ゆう)で返る語
READING_FIXES = {"言う": "いう"}

# 1文字の語は、複合語の中の読み(島=とう・家=か)に引きずられやすい。いちばん多い読みが、この割合以上のときだけ作る
SINGLE_KANJI_DOMINANCE = 0.8


def normalize_long_vowel(reading: str) -> str:
    out = []
    for char in reading:
        if char == "ー" and out:
            out.append(LONG_OF.get(VOWEL_OF.get(out[-1], ""), "ー"))
        else:
            out.append(char)
    return "".join(out)


def main(corpus_path: str) -> None:
    analyzer = dictionary.Dictionary().create()
    mode = tokenizer.Tokenizer.SplitMode.A
    counts: dict[str, Counter] = defaultdict(Counter)

    for line in Path(corpus_path).read_text(encoding="utf-8").splitlines():
        previous_numeric = False
        for morpheme in analyzer.tokenize(line, mode):
            surface = morpheme.surface()
            numeric = bool(re.fullmatch(r"[0-9０-９]+", surface))
            counter_after_number = previous_numeric and surface in ("日", "人", "月")  # 数字の後ろは counter-reading.ts が読む
            previous_numeric = numeric
            if not KANJI.search(surface) or counter_after_number or re.search(r"[0-9０-９A-Za-zＡ-Ｚａ-ｚ]", surface):
                continue
            reading = normalize_long_vowel(to_hiragana(morpheme.reading_form()))
            if not HIRAGANA.match(reading):  # 読みが取れない語(漢字が残る・記号)は作らない
                continue
            counts[surface][reading] += 1

    entries = {}
    for surface, readings in counts.items():
        top, top_count = readings.most_common(1)[0]
        if len(surface) == 1 and top_count / sum(readings.values()) < SINGLE_KANJI_DOMINANCE:
            continue
        entries[surface] = READING_FIXES.get(surface, top)
    entries = dict(sorted(entries.items(), key=lambda item: (-len(item[0]), item[0])))
    OUT.write_text(json.dumps(entries, ensure_ascii=False, indent=0) + "\n", encoding="utf-8")

    conflicts = sorted(
        ((surface, readings) for surface, readings in counts.items() if len(readings) > 1),
        key=lambda item: -sum(item[1].values()),
    )
    CONFLICTS.write_text(
        "".join(f"{surface}\t{'  '.join(f'{r}:{n}' for r, n in readings.most_common())}\n" for surface, readings in conflicts),
        encoding="utf-8",
    )
    print(f"{len(entries)}語を書き出しました: {OUT.relative_to(ROOT)}（読みが複数の語: {len(conflicts)}）")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
