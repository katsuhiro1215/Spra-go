"""地名コースの問題を、日本郵便の郵便番号データ(utf_ken_all.csv)と照らして点検する。
使い方: python3 tools/place-names/verify_readings.py utf_ken_all.csv
市区町村の読みの問い・「◯◯にある市は どれ？」の問いについて、正解の読みのちがい・まちがいが正解にもなる・正解がその県にない、を出す。
町域名(大字)の問いは、このスクリプトでは照合しない(難読地名は、郵便データの町域名と別に確認する)
"""
import csv, glob, re, collections, json, sys

hira = lambda s: ''.join(chr(ord(c) - 0x60) if 'ァ' <= c <= 'ヶ' else c for c in s)
jp = collections.defaultdict(dict)
for r in csv.reader(open(sys.argv[1], encoding='utf-8')):
    p, c, k = r[6], r[7], hira(r[4])
    g = re.match(r'^.+?郡(.+[町村])$', c)
    if g:
        if 'ぐん' not in k:
            continue
        c, k = g.group(1), k.split('ぐん', 1)[1]
    jp[p].setdefault(c, k)
for p, c, k in [('北海道', '札幌市', 'さっぽろし'), ('宮城県', '仙台市', 'せんだいし'), ('埼玉県', 'さいたま市', 'さいたまし'), ('千葉県', '千葉市', 'ちばし'), ('神奈川県', '横浜市', 'よこはまし'), ('神奈川県', '川崎市', 'かわさきし'), ('神奈川県', '相模原市', 'さがみはらし'), ('新潟県', '新潟市', 'にいがたし'), ('静岡県', '静岡市', 'しずおかし'), ('静岡県', '浜松市', 'はままつし'), ('愛知県', '名古屋市', 'なごやし'), ('京都府', '京都市', 'きょうとし'), ('大阪府', '大阪市', 'おおさかし'), ('大阪府', '堺市', 'さかいし'), ('兵庫県', '神戸市', 'こうべし'), ('岡山県', '岡山市', 'おかやまし'), ('広島県', '広島市', 'ひろしまし'), ('福岡県', '北九州市', 'きたきゅうしゅうし'), ('福岡県', '福岡市', 'ふくおかし'), ('熊本県', '熊本市', 'くまもとし')]:
    jp[p].setdefault(c, k)
PREFS = sorted([p for p in jp if p], key=len, reverse=True)


def pref_of(s):
    for p in PREFS:
        if s.startswith(p):
            return p
    return None


SUF = [('市', 'し'), ('町', 'ちょう'), ('町', 'まち'), ('村', 'そん'), ('村', 'むら'), ('区', 'く')]


def lookup(p, x):
    if x in jp[p]:
        return jp[p][x]
    for k, _ in SUF:
        if x + k in jp[p]:
            full = jp[p][x + k]
            for kk, rr in SUF:
                if kk == k and full.endswith(rr):
                    return full[:-len(rr)]
    return None


issues = collections.defaultdict(list)
checked = 0
unknown = []
for f in sorted(glob.glob('database/data/place-names/*.csv')):
    for i, r in enumerate(list(csv.reader(open(f, encoding='utf-8-sig')))[1:], 2):
        lv, _, _, _, q, a, w1, w2, w3, ex = r
        tag = f.split('/')[-1][:-4]
        p = pref_of(q) or pref_of(ex)
        if not p:
            issues['都道府県が読めない'].append((tag, i, q))
            continue
        m = re.search('『(.+?)』', q)
        if m:
            x = m.group(1)
            t = lookup(p, x)
            if t is None:
                unknown.append((tag, i, p, x, a))
                continue
            checked += 1
            if a != t:
                issues['正解の読みがちがう'].append((tag, i, x, a, t))
            for w in (w1, w2, w3):
                if w == t:
                    issues['まちがいが正解と同じ'].append((tag, i, x, w))
        else:
            checked += 1
            if lookup(p, a) is None and a not in jp[p]:
                issues['正解がその県にない'].append((tag, i, q, a))
            for w in (w1, w2, w3):
                if w in jp[p] or lookup(p, w):
                    issues['まちがいもその県にある'].append((tag, i, q, w))
print('checked', checked, 'unknown', len(unknown))
for k, v in issues.items():
    print('\n##', k, len(v))
    for x in v[:25]:
        print('  ', x)
print('\n照合できなかった問い(町域名など):', len(unknown))
