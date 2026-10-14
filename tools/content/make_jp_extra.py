#!/usr/bin/env python3
"""日本のコースに足す問題(地図の「この県は？」47問と、祝日・年中行事31問)の原稿 JSON を作る。
使い方: python3 tools/content/make_jp_extra.py  (リポジトリのルートで)
出力: docs/content/drafts/jp_extra_{beginner,intermediate,advanced}.json
- 地図の問題: 県の知名度(prefectures.php の tier 1・2・3)で、初級・中級・上級に分ける。まちがいの選択肢は、となりの県・同じ地方の県から(決まった乱数で、何度作っても同じ)
- 行事の問題: このファイルの EVENTS。事実は、Ownerが公開前に確認する(docs/design/2026-10-15-question-variety-design.md 3-2)
"""
import json, random, re, subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LEVELS = {1: "初級", 2: "中級", 3: "上級"}
FILES = {"初級": "beginner", "中級": "intermediate", "上級": "advanced"}

# 祝日・年中行事: [問題文, 正解, まちがい3つ]
EVENTS = {
    "初級": [
        ["1月1日は、何の日？", "お正月(元日)", ["こどもの日", "七夕", "クリスマス"]],
        ["3月3日の行事は？", "ひなまつり", ["七夕", "節分", "七五三"]],
        ["5月5日は、何の日？", "こどもの日", ["成人の日", "文化の日", "海の日"]],
        ["7月7日の行事は？", "七夕", ["ひなまつり", "お月見", "節分"]],
        ["12月25日は、何の日？", "クリスマス", ["お正月", "七夕", "節分"]],
        ["大みそかの夜に食べる、細くて長い食べ物は？", "年越しそば", ["七草がゆ", "ちらしずし", "柏餅"]],
        ["節分に「鬼は外」と言ってまくものは？", "豆", ["米", "砂", "水"]],
        ["お正月に、子どもがもらうお金は？", "お年玉", ["おこづかい", "お賽銭", "ごほうび"]],
        ["お月見のときに、すすきといっしょに飾る丸いおかしは？", "月見だんご", ["柏餅", "おはぎ", "たい焼き"]],
        ["年が明けて、はじめて神社やお寺にお参りすることを何という？", "初詣", ["花見", "七五三", "月見"]],
    ],
    "中級": [
        ["「成人の日」があるのは、何月？", "1月", ["3月", "5月", "9月"]],
        ["「海の日」があるのは、何月？", "7月", ["4月", "10月", "12月"]],
        ["11月3日は「文化の日」。11月23日の祝日は？", "勤労感謝の日", ["敬老の日", "山の日", "憲法記念日"]],
        ["11月15日ごろに、3歳・5歳・7歳の子どもの成長をお祝いする行事は？", "七五三", ["ひなまつり", "端午の節句", "十五夜"]],
        ["5月5日の「端午の節句」に飾るものは？", "こいのぼり", ["ひな人形", "笹", "門松"]],
        ["「端午の節句」に食べる、葉で包んだおもちは？", "柏餅", ["桜もち", "月見だんご", "大福"]],
        ["「ひなまつり」に飾るものは？", "ひな人形", ["こいのぼり", "門松", "かぶと"]],
        ["春分の日と秋分の日は、何がほぼ同じ長さになる日？", "昼と夜の長さ", ["夏と冬の長さ", "月と太陽の大きさ", "朝と夕方の気温"]],
        ["大みそかの夜につく「除夜の鐘」は、何回つくことが多い？", "108回", ["100回", "365回", "12回"]],
        ["夏の「土用の丑の日」に食べる習慣のある魚は？", "うなぎ", ["さけ", "まぐろ", "たい"]],
    ],
    "上級": [
        ["「山の日」は、何月何日？", "8月11日", ["7月20日", "9月23日", "5月4日"]],
        ["「スポーツの日」があるのは、何月？", "10月", ["4月", "6月", "12月"]],
        ["「みどりの日」は、5月何日？", "4日", ["3日", "5日", "6日"]],
        ["「天皇誕生日」は、何月何日？", "2月23日", ["12月23日", "4月29日", "11月3日"]],
        ["「建国記念の日」は、何月何日？", "2月11日", ["1月1日", "5月3日", "11月3日"]],
        ["1月7日の朝に食べる、7種類の草を入れたおかゆは？", "七草がゆ", ["小豆がゆ", "雑炊", "ぞうに"]],
        ["春の七草に入っているのは、どれ？", "せり", ["たんぽぽ", "すみれ", "つくし"]],
        ["冬至の日に、お風呂に入れる習慣があるのは？", "ゆず", ["みかん", "しょうが", "よもぎ"]],
        ["9月9日の「重陽の節句」と関係の深い花は？", "菊", ["桜", "ひまわり", "あじさい"]],
        ["「お盆」に迎えるといわれているのは？", "ご先祖さまの霊", ["神さま", "鬼", "雪の精"]],
        ["「立春」は、2月何日ごろ？", "4日", ["1日", "11日", "20日"]],
    ],
}


def prefectures():
    code = "$c=include 'database/data/prefectures.php'; echo json_encode($c['prefectures'], JSON_UNESCAPED_UNICODE);"
    out = subprocess.run(["php", "-r", code], cwd=ROOT, capture_output=True, text=True, check=True).stdout
    return json.loads(out)


def map_questions(prefs):
    by_key = {p["key"]: p for p in prefs}
    result = {name: [] for name in LEVELS.values()}
    for p in prefs:
        rng = random.Random(p["key"])
        pool = [by_key[k] for k in p["neighbors"] if k in by_key]
        rng.shuffle(pool)
        wrong = pool[:2]  # となりの県は、まぎらわしいので2つまで
        rest = [q for q in prefs if q["region"] == p["region"] and q["key"] != p["key"] and q not in wrong]
        rng.shuffle(rest)
        wrong += rest[: 3 - len(wrong)]
        others = [q for q in prefs if q["key"] != p["key"] and q not in wrong]
        rng.shuffle(others)
        wrong += others[: 3 - len(wrong)]
        choices = [{"label": p["name"], "is_correct": True}] + [{"label": q["name"], "is_correct": False} for q in wrong[:3]]
        rng.shuffle(choices)
        result[LEVELS[p["tier"]]].append({
            "prompt": "ちずで いろが ついた けんは どこ？",
            "map": {"view": "japan", "highlight": p["key"]},
            "choices": choices,
        })
    return result


def event_questions(level):
    out = []
    for i, (prompt, right, wrong) in enumerate(EVENTS[level]):
        rng = random.Random(f"{level}:{i}")
        choices = [{"label": right, "is_correct": True}] + [{"label": w, "is_correct": False} for w in wrong]
        rng.shuffle(choices)
        out.append({"prompt": prompt, "choices": choices})
    return out


def main():
    maps = map_questions(prefectures())
    for level, name in FILES.items():
        data = {
            "country_name": "日本",
            "country_code": "JP",
            "difficulty": level,
            "stages": [
                # 道のステージの番号(1〜10)と重ならない番号。course:build が、問題だけをプールに集め、この番号のステージは消す
                {"stage_number": 11, "theme_key": "geography", "is_boss": False, "title_reward": None, "questions": maps[level]},
                {"stage_number": 12, "theme_key": "heritage", "is_boss": False, "title_reward": None, "questions": event_questions(level)},
            ],
        }
        path = ROOT / "docs/content/drafts" / f"jp_extra_{name}.json"
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(path.name, len(maps[level]), "地図 /", len(EVENTS[level]), "行事")


if __name__ == "__main__":
    main()
