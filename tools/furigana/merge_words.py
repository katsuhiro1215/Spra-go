"""tools/furigana/*-words.json(語 → 読み)を、frontend/src/lib/furigana-dictionary.json に足す。
すでにある語は変えない。足したあと、文字数の長い語から順(同じ長さは今の並びのまま)に並べ直す
(画面は、長い語から先に一致させるため、この並びが前提。AutoFurigana のコメントを参照)。
使い方: python3 tools/furigana/merge_words.py"""
import json
from pathlib import Path

HERE = Path(__file__).parent
DICTIONARY = HERE.parent.parent / "frontend/src/lib/furigana-dictionary.json"


def main():
    dictionary = json.loads(DICTIONARY.read_text(encoding="utf-8"))
    added = []
    for path in sorted(HERE.glob("*-words.json")):
        for word, reading in json.loads(path.read_text(encoding="utf-8")).items():
            if word not in dictionary:
                dictionary[word] = reading
                added.append(word)

    ordered = dict(sorted(dictionary.items(), key=lambda item: -len(item[0])))
    DICTIONARY.write_text(json.dumps(ordered, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"足した語: {len(added)}、辞書の語: {len(ordered)}")


main()
