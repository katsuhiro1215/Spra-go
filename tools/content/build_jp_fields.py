#!/usr/bin/env python3
"""日本のコースの8分野の原稿(CSV)から、取り込み用の JSON 原稿を作る。
使い方: python3 tools/content/build_jp_fields.py  (リポジトリのルートで)
入力: company/spra/spra-go/content/japan/<分野>/final/questions.csv (採用版)
出力: docs/content/drafts/jp_fields_{beginner,intermediate,advanced}.json
- 分野 N は、ステージ番号 20+N に入れる(course:build が、この番号のステージから問題を集めて、分野ごとのステージ1〜8に並べ直し、ボスを足す)
- 問題の番号(問題ID)を key に入れる(問題文が同じでも、別の問題として取り込むため)
- 画像は、frontend/public/quiz/jp/<画像キー>.webp があるときだけ付ける(あとからできた画像は、もう一度作って取り込めば付く)
設計書: docs/design/2026-10-21-japan-themed-course-design.md
"""
import csv, json, random
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONTENT = ROOT.parents[1] / "company/spra/spra-go/content/japan"
IMAGES = ROOT / "frontend/public/quiz/jp"

FIELDS = {
    1: ("日本のことばとマナー", "01-language-manners/v2/final", "phrase"),
    2: ("日本の基本情報", "02-basics/final", "geography"),
    3: ("地方と都道府県", "03-regions-prefectures/final", "geography"),
    4: ("県庁所在地", "04-capitals/final", "capital"),
    5: ("食べ物・名物", "05-food/final", "heritage"),
    6: ("観光地・文化", "06-sightseeing-culture/final", "heritage"),
    7: ("山・川・湖", "07-mountains-rivers-lakes/final", "geography"),
    8: ("歴史・産業", "08-history-industry/final", "heritage"),
}
LEVELS = {"初級": "beginner", "中級": "intermediate", "上級": "advanced"}


def question(row):
    right = row["正解"]
    if row["形"] == "○×":
        choices = [{"label": "ただしい", "is_correct": right == "ただしい"}, {"label": "まちがい", "is_correct": right == "まちがい"}]
        kind = "true_false"
    else:
        wrong = [row[k] for k in ("まちがい1", "まちがい2", "まちがい3")]
        choices = [{"label": right, "is_correct": True}] + [{"label": w, "is_correct": False} for w in wrong]
        random.Random(row["問題ID"]).shuffle(choices)
        kind = "multiple_choice"
    q = {"key": row["問題ID"], "type": kind, "prompt": row["問題文"], "grade": int(row["grade"]), "choices": choices}
    if row["解説(要約)"]:
        q["explanation"] = row["解説(要約)"]
    if row["画像キー"] and (IMAGES / f"{row['画像キー']}.webp").exists():
        q["image"] = f"/quiz/jp/{row['画像キー']}.webp"
    return q


def main():
    by_level = {level: [] for level in LEVELS}
    for number, (name, folder, theme) in FIELDS.items():
        rows = list(csv.DictReader(open(CONTENT / folder / "questions.csv", encoding="utf-8")))
        for level in LEVELS:
            qs = [question(r) for r in rows if r["級"] == level]
            by_level[level].append({"stage_number": 20 + number, "theme_key": theme, "theme_name": name, "is_boss": False, "title_reward": None, "questions": qs})
    for level, stages in by_level.items():
        data = {"country_name": "日本", "country_code": "JP", "difficulty": level, "stages": stages}
        path = ROOT / "docs/content/drafts" / f"jp_fields_{LEVELS[level]}.json"
        path.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        print(path.name, [len(s["questions"]) for s in stages], sum(len(s["questions"]) for s in stages))


if __name__ == "__main__":
    main()
