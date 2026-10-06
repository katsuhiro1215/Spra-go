"""日本郵便の utf_ken_all.csv から、県ごとの市区町村名→ひらがなの読みの表を作る。

使い方: python3 tools/place-names/build_municipality_readings.py utf_ken_all.csv > database/data/municipality-readings.json
- 「◯◯郡△△町」は、郡を除いた「△△町」で持つ
- 地名コースの元原稿(database/data/place-names/*.csv)に出る読みで、表にないものを足す
"""
import csv, glob, json, re, sys, collections

def hira(s):
    return ''.join(chr(ord(c) - 0x60) if 'ァ' <= c <= 'ヶ' else c for c in s)

table = collections.defaultdict(dict)
for r in csv.reader(open(sys.argv[1], encoding='utf-8')):
    pref, city, kana = r[6], r[7], hira(r[4])
    gun = re.match(r'^.+?郡(.+[町村])$', city)
    if gun:
        if 'ぐん' not in kana:
            continue
        city, kana = gun.group(1), kana.split('ぐん', 1)[1]
    table[pref].setdefault(city, kana)

# 政令指定都市は、郵便番号のデータに「◯◯市△△区」しかないので、市の読みを足す
for pref, city, kana in [
    ('北海道', '札幌市', 'さっぽろし'), ('宮城県', '仙台市', 'せんだいし'), ('埼玉県', 'さいたま市', 'さいたまし'), ('千葉県', '千葉市', 'ちばし'),
    ('神奈川県', '横浜市', 'よこはまし'), ('神奈川県', '川崎市', 'かわさきし'), ('神奈川県', '相模原市', 'さがみはらし'), ('新潟県', '新潟市', 'にいがたし'),
    ('静岡県', '静岡市', 'しずおかし'), ('静岡県', '浜松市', 'はままつし'), ('愛知県', '名古屋市', 'なごやし'), ('京都府', '京都市', 'きょうとし'),
    ('大阪府', '大阪市', 'おおさかし'), ('大阪府', '堺市', 'さかいし'), ('兵庫県', '神戸市', 'こうべし'), ('岡山県', '岡山市', 'おかやまし'),
    ('広島県', '広島市', 'ひろしまし'), ('福岡県', '北九州市', 'きたきゅうしゅうし'), ('福岡県', '福岡市', 'ふくおかし'), ('熊本県', '熊本市', 'くまもとし'),
]:
    table[pref].setdefault(city, kana)

# 元原稿の読み(「◯◯は、…『よみ』と読むよ」)で、表にないものを足す
sources = collections.defaultdict(dict)
prefs = {}
for f in sorted(glob.glob('database/data/place-names/*.csv')):
    for r in list(csv.reader(open(f, encoding='utf-8-sig')))[1:]:
        m = re.match(r'^(.+?)は、(.+?)(?:にあるよ|にある)', r[9])
        y = re.search(r"『([ぁ-んー]+)』と読む", r[9])
        if m and y and m.group(1) and not m.group(1).startswith('『'):
            pref = re.match(r'^(.+?[都道府県])', r[4]).group(1) if re.match(r'^(.+?[都道府県])', r[4]) else None
            if pref:
                sources[pref].setdefault(m.group(1), y.group(1))
for pref, words in sources.items():
    for w, y in words.items():
        table[pref].setdefault(w, y)

print(json.dumps({p: dict(sorted(v.items())) for p, v in sorted(table.items())}, ensure_ascii=False, indent=0))
