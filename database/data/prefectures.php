<?php

/*
|--------------------------------------------------------------------------
| 都道府県の一覧(docs/design/2026-10-05-prefecture-quiz-design.md 4章)
|--------------------------------------------------------------------------
|
| 47都道府県。北から南の順(都道府県コードの順)。
| key: バッジのファイル名(frontend/public/badge/pref/{key}.webp)
| region: hokkaido-tohoku / kanto / chubu / kinki / chugoku-shikoku / kyushu-okinawa
| capital: 県庁所在地(東京都は、都庁のある新宿区)
| neighbors: 陸で県境が接している県のkey(海を挟むだけの県は入れない。互いにそろえる)
| foods(4つ以上): 名物・特産(簡単なものから)／sights(4つ以上): 名所・自然・建物(簡単なものから)
| culture(3つ以上): お祭り・伝統工芸・歴史・人物(簡単なものから)
| hard(3つ以上): 難読地名。word(漢字)・reading(正しい読み)・wrong(ありがちな読みまちがい3つ)
| 事実がそろった県(foods・sights・culture・hard)だけ、県のコースができる。いまは近畿の7県。
| 事実の正しさ、県庁所在地、となりの県、難読地名の読みは、公開前にOwnerが確認する。
|
*/

return [
    'prefectures' => [
        ['key' => 'hokkaido', 'name' => '北海道', 'region' => 'hokkaido-tohoku', 'capital' => '札幌市', 'neighbors' => []],
        ['key' => 'aomori', 'name' => '青森県', 'region' => 'hokkaido-tohoku', 'capital' => '青森市', 'neighbors' => ['iwate', 'akita']],
        ['key' => 'iwate', 'name' => '岩手県', 'region' => 'hokkaido-tohoku', 'capital' => '盛岡市', 'neighbors' => ['aomori', 'akita', 'miyagi']],
        ['key' => 'miyagi', 'name' => '宮城県', 'region' => 'hokkaido-tohoku', 'capital' => '仙台市', 'neighbors' => ['iwate', 'akita', 'yamagata', 'fukushima']],
        ['key' => 'akita', 'name' => '秋田県', 'region' => 'hokkaido-tohoku', 'capital' => '秋田市', 'neighbors' => ['aomori', 'iwate', 'miyagi', 'yamagata']],
        ['key' => 'yamagata', 'name' => '山形県', 'region' => 'hokkaido-tohoku', 'capital' => '山形市', 'neighbors' => ['akita', 'miyagi', 'fukushima', 'niigata']],
        ['key' => 'fukushima', 'name' => '福島県', 'region' => 'hokkaido-tohoku', 'capital' => '福島市', 'neighbors' => ['miyagi', 'yamagata', 'niigata', 'gunma', 'tochigi', 'ibaraki']],

        ['key' => 'ibaraki', 'name' => '茨城県', 'region' => 'kanto', 'capital' => '水戸市', 'neighbors' => ['fukushima', 'tochigi', 'saitama', 'chiba']],
        ['key' => 'tochigi', 'name' => '栃木県', 'region' => 'kanto', 'capital' => '宇都宮市', 'neighbors' => ['fukushima', 'ibaraki', 'saitama', 'gunma']],
        ['key' => 'gunma', 'name' => '群馬県', 'region' => 'kanto', 'capital' => '前橋市', 'neighbors' => ['fukushima', 'tochigi', 'saitama', 'niigata', 'nagano']],
        ['key' => 'saitama', 'name' => '埼玉県', 'region' => 'kanto', 'capital' => 'さいたま市', 'neighbors' => ['ibaraki', 'tochigi', 'gunma', 'chiba', 'tokyo', 'yamanashi', 'nagano']],
        ['key' => 'chiba', 'name' => '千葉県', 'region' => 'kanto', 'capital' => '千葉市', 'neighbors' => ['ibaraki', 'saitama', 'tokyo']],
        ['key' => 'tokyo', 'name' => '東京都', 'region' => 'kanto', 'capital' => '新宿区', 'neighbors' => ['saitama', 'chiba', 'kanagawa', 'yamanashi']],
        ['key' => 'kanagawa', 'name' => '神奈川県', 'region' => 'kanto', 'capital' => '横浜市', 'neighbors' => ['tokyo', 'yamanashi', 'shizuoka']],

        ['key' => 'niigata', 'name' => '新潟県', 'region' => 'chubu', 'capital' => '新潟市', 'neighbors' => ['yamagata', 'fukushima', 'gunma', 'nagano', 'toyama']],
        ['key' => 'toyama', 'name' => '富山県', 'region' => 'chubu', 'capital' => '富山市', 'neighbors' => ['niigata', 'nagano', 'gifu', 'ishikawa']],
        ['key' => 'ishikawa', 'name' => '石川県', 'region' => 'chubu', 'capital' => '金沢市', 'neighbors' => ['toyama', 'gifu', 'fukui']],
        ['key' => 'fukui', 'name' => '福井県', 'region' => 'chubu', 'capital' => '福井市', 'neighbors' => ['ishikawa', 'gifu', 'shiga', 'kyoto']],
        ['key' => 'yamanashi', 'name' => '山梨県', 'region' => 'chubu', 'capital' => '甲府市', 'neighbors' => ['saitama', 'tokyo', 'kanagawa', 'shizuoka', 'nagano']],
        ['key' => 'nagano', 'name' => '長野県', 'region' => 'chubu', 'capital' => '長野市', 'neighbors' => ['niigata', 'gunma', 'saitama', 'yamanashi', 'shizuoka', 'aichi', 'gifu', 'toyama']],
        ['key' => 'gifu', 'name' => '岐阜県', 'region' => 'chubu', 'capital' => '岐阜市', 'neighbors' => ['toyama', 'ishikawa', 'fukui', 'shiga', 'mie', 'aichi', 'nagano']],
        ['key' => 'shizuoka', 'name' => '静岡県', 'region' => 'chubu', 'capital' => '静岡市', 'neighbors' => ['kanagawa', 'yamanashi', 'nagano', 'aichi']],
        ['key' => 'aichi', 'name' => '愛知県', 'region' => 'chubu', 'capital' => '名古屋市', 'neighbors' => ['shizuoka', 'nagano', 'gifu', 'mie']],

        [
            'key' => 'mie', 'name' => '三重県', 'region' => 'kinki', 'capital' => '津市',
            'neighbors' => ['aichi', 'gifu', 'shiga', 'kyoto', 'nara', 'wakayama'],
            'foods' => ['伊勢えび', '松阪牛', '赤福', '手こね寿司'],
            'sights' => ['伊勢神宮', '鈴鹿サーキット', '夫婦岩', 'ナガシマスパーランド'],
            'culture' => ['伊賀の忍者', '志摩の海女', '松尾芭蕉'],
            'hard' => [
                ['word' => '四日市', 'reading' => 'よっかいち', 'wrong' => ['よんにちし', 'よつかいち', 'しにちし']],
                ['word' => '尾鷲', 'reading' => 'おわせ', 'wrong' => ['おわし', 'おわり', 'おしゅう']],
                ['word' => '名張', 'reading' => 'なばり', 'wrong' => ['なはり', 'なばる', 'めいちょう']],
            ],
        ],
        [
            'key' => 'shiga', 'name' => '滋賀県', 'region' => 'kinki', 'capital' => '大津市',
            'neighbors' => ['fukui', 'gifu', 'mie', 'kyoto'],
            'foods' => ['近江牛', 'ふなずし', '赤こんにゃく', '瀬田のしじみ'],
            'sights' => ['琵琶湖', '彦根城', '竹生島', '長浜城'],
            'culture' => ['信楽焼', 'ひこにゃん', '近江商人'],
            'hard' => [
                ['word' => '信楽', 'reading' => 'しがらき', 'wrong' => ['しんらく', 'のぶらく', 'しんがく']],
                ['word' => '米原', 'reading' => 'まいばら', 'wrong' => ['こめはら', 'べいげん', 'よねはら']],
                ['word' => '野洲', 'reading' => 'やす', 'wrong' => ['のす', 'やしゅう', 'のしゅう']],
            ],
        ],
        [
            'key' => 'kyoto', 'name' => '京都府', 'region' => 'kinki', 'capital' => '京都市',
            'neighbors' => ['fukui', 'shiga', 'mie', 'nara', 'osaka', 'hyogo'],
            'foods' => ['八つ橋', '湯豆腐', '千枚漬け', '京野菜'],
            'sights' => ['清水寺', '金閣寺', '伏見稲荷大社', '嵐山'],
            'culture' => ['祇園祭', '西陣織', '舞妓さん'],
            'hard' => [
                ['word' => '太秦', 'reading' => 'うずまさ', 'wrong' => ['ふとみ', 'たいしん', 'おおはた']],
                ['word' => '先斗町', 'reading' => 'ぽんとちょう', 'wrong' => ['さきとちょう', 'せんとちょう', 'さきますちょう']],
                ['word' => '烏丸', 'reading' => 'からすま', 'wrong' => ['とりまる', 'うがん', 'からすまる']],
            ],
        ],
        [
            'key' => 'osaka', 'name' => '大阪府', 'region' => 'kinki', 'capital' => '大阪市',
            'neighbors' => ['kyoto', 'hyogo', 'nara', 'wakayama'],
            'foods' => ['たこやき', 'お好み焼き', 'くしカツ', 'きつねうどん'],
            'sights' => ['大阪城', '道頓堀', '通天閣', 'ユニバーサル・スタジオ・ジャパン'],
            'culture' => ['天神祭', '文楽', '豊臣秀吉'],
            'hard' => [
                ['word' => '枚方', 'reading' => 'ひらかた', 'wrong' => ['まいかた', 'ひらがた', 'まいがた']],
                ['word' => '放出', 'reading' => 'はなてん', 'wrong' => ['ほうしゅつ', 'はなだし', 'ほうで']],
                ['word' => '十三', 'reading' => 'じゅうそう', 'wrong' => ['じゅうさん', 'とみ', 'じゅうざん']],
            ],
        ],
        [
            'key' => 'hyogo', 'name' => '兵庫県', 'region' => 'kinki', 'capital' => '神戸市',
            'neighbors' => ['kyoto', 'osaka', 'tottori', 'okayama'],
            'foods' => ['神戸牛', '明石焼き', '淡路島のたまねぎ', '出石そば'],
            'sights' => ['姫路城', '甲子園球場', '神戸ポートタワー', '明石海峡大橋'],
            'culture' => ['宝塚歌劇団', '灘の酒造り', '豊岡のかばん'],
            'hard' => [
                ['word' => '相生', 'reading' => 'あいおい', 'wrong' => ['あいしょう', 'あいせい', 'そうしょう']],
                ['word' => '朝来', 'reading' => 'あさご', 'wrong' => ['ちょうらい', 'あさき', 'あさくる']],
                ['word' => '御影', 'reading' => 'みかげ', 'wrong' => ['ごえい', 'おかげ', 'みえい']],
            ],
        ],
        [
            'key' => 'nara', 'name' => '奈良県', 'region' => 'kinki', 'capital' => '奈良市',
            'neighbors' => ['mie', 'kyoto', 'osaka', 'wakayama'],
            'foods' => ['柿の葉ずし', '三輪そうめん', '奈良漬け', 'くずもち'],
            'sights' => ['東大寺の大仏', '法隆寺', '奈良公園のシカ', '平城宮跡'],
            'culture' => ['若草山の山焼き', '聖徳太子', '正倉院'],
            'hard' => [
                ['word' => '斑鳩', 'reading' => 'いかるが', 'wrong' => ['はんきゅう', 'まだらばと', 'いかが']],
                ['word' => '明日香', 'reading' => 'あすか', 'wrong' => ['あしたか', 'みょうにちか', 'あしたこう']],
                ['word' => '十津川', 'reading' => 'とつかわ', 'wrong' => ['じゅうしんがわ', 'とおつかわ', 'とつがわ']],
            ],
        ],
        [
            'key' => 'wakayama', 'name' => '和歌山県', 'region' => 'kinki', 'capital' => '和歌山市',
            'neighbors' => ['mie', 'nara', 'osaka'],
            'foods' => ['みかん', '梅干し', '和歌山ラーメン', '金山寺みそ'],
            'sights' => ['白浜海岸', '高野山', '熊野古道', '那智の滝'],
            'culture' => ['徳川吉宗', '駅長のたま', '紀州漆器'],
            'hard' => [
                ['word' => '御坊', 'reading' => 'ごぼう', 'wrong' => ['おんぼう', 'みぼう', 'ごぼ']],
                ['word' => '有田', 'reading' => 'ありだ', 'wrong' => ['ゆうた', 'ありた', 'あるた']],
                ['word' => '九度山', 'reading' => 'くどやま', 'wrong' => ['きゅうどやま', 'くどざん', 'ここのどやま']],
            ],
        ],

        ['key' => 'tottori', 'name' => '鳥取県', 'region' => 'chugoku-shikoku', 'capital' => '鳥取市', 'neighbors' => ['hyogo', 'okayama', 'hiroshima', 'shimane']],
        ['key' => 'shimane', 'name' => '島根県', 'region' => 'chugoku-shikoku', 'capital' => '松江市', 'neighbors' => ['tottori', 'hiroshima', 'yamaguchi']],
        ['key' => 'okayama', 'name' => '岡山県', 'region' => 'chugoku-shikoku', 'capital' => '岡山市', 'neighbors' => ['hyogo', 'tottori', 'hiroshima']],
        ['key' => 'hiroshima', 'name' => '広島県', 'region' => 'chugoku-shikoku', 'capital' => '広島市', 'neighbors' => ['tottori', 'shimane', 'okayama', 'yamaguchi']],
        ['key' => 'yamaguchi', 'name' => '山口県', 'region' => 'chugoku-shikoku', 'capital' => '山口市', 'neighbors' => ['shimane', 'hiroshima']],
        ['key' => 'tokushima', 'name' => '徳島県', 'region' => 'chugoku-shikoku', 'capital' => '徳島市', 'neighbors' => ['kagawa', 'ehime', 'kochi']],
        ['key' => 'kagawa', 'name' => '香川県', 'region' => 'chugoku-shikoku', 'capital' => '高松市', 'neighbors' => ['tokushima', 'ehime']],
        ['key' => 'ehime', 'name' => '愛媛県', 'region' => 'chugoku-shikoku', 'capital' => '松山市', 'neighbors' => ['kagawa', 'tokushima', 'kochi']],
        ['key' => 'kochi', 'name' => '高知県', 'region' => 'chugoku-shikoku', 'capital' => '高知市', 'neighbors' => ['tokushima', 'ehime']],

        ['key' => 'fukuoka', 'name' => '福岡県', 'region' => 'kyushu-okinawa', 'capital' => '福岡市', 'neighbors' => ['saga', 'kumamoto', 'oita']],
        ['key' => 'saga', 'name' => '佐賀県', 'region' => 'kyushu-okinawa', 'capital' => '佐賀市', 'neighbors' => ['fukuoka', 'nagasaki']],
        ['key' => 'nagasaki', 'name' => '長崎県', 'region' => 'kyushu-okinawa', 'capital' => '長崎市', 'neighbors' => ['saga']],
        ['key' => 'kumamoto', 'name' => '熊本県', 'region' => 'kyushu-okinawa', 'capital' => '熊本市', 'neighbors' => ['fukuoka', 'oita', 'miyazaki', 'kagoshima']],
        ['key' => 'oita', 'name' => '大分県', 'region' => 'kyushu-okinawa', 'capital' => '大分市', 'neighbors' => ['fukuoka', 'kumamoto', 'miyazaki']],
        ['key' => 'miyazaki', 'name' => '宮崎県', 'region' => 'kyushu-okinawa', 'capital' => '宮崎市', 'neighbors' => ['oita', 'kumamoto', 'kagoshima']],
        ['key' => 'kagoshima', 'name' => '鹿児島県', 'region' => 'kyushu-okinawa', 'capital' => '鹿児島市', 'neighbors' => ['kumamoto', 'miyazaki']],
        ['key' => 'okinawa', 'name' => '沖縄県', 'region' => 'kyushu-okinawa', 'capital' => '那覇市', 'neighbors' => []],
    ],
];
