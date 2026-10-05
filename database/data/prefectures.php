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
| 事実がそろった県(foods・sights・culture・hard)だけ、県のコースができる。いまは47県すべて。
| 事実の正しさ、県庁所在地、となりの県、難読地名の読みは、公開前にOwnerが確認する。
|
*/

return [
    'prefectures' => [
        [
            'key' => 'hokkaido', 'name' => '北海道', 'region' => 'hokkaido-tohoku', 'capital' => '札幌市',
            'neighbors' => [],
            'foods' => ['ジンギスカン', '札幌ラーメン', '石狩鍋', 'スープカレー'],
            'sights' => ['札幌時計台', '旭山動物園', '函館山の夜景', '知床半島'],
            'culture' => ['アイヌ文化', 'さっぽろ雪まつり', '屯田兵'],
            'hard' => [
                ['word' => '室蘭', 'reading' => 'むろらん', 'wrong' => ['しつらん', 'むろあん', 'むろいらん']],
                ['word' => '稚内', 'reading' => 'わっかない', 'wrong' => ['ちない', 'わかない', 'わかうち']],
                ['word' => '苫小牧', 'reading' => 'とまこまい', 'wrong' => ['とまこまき', 'とまごまい', 'ふんこまい']],
            ],
        ],
        [
            'key' => 'aomori', 'name' => '青森県', 'region' => 'hokkaido-tohoku', 'capital' => '青森市',
            'neighbors' => ['iwate', 'akita'],
            'foods' => ['青森りんご', 'ホタテ', 'にんにく', 'せんべい汁'],
            'sights' => ['十和田湖', '奥入瀬渓流', '弘前城', '三内丸山遺跡'],
            'culture' => ['ねぶた祭', '津軽塗', '津軽三味線'],
            'hard' => [
                ['word' => '弘前', 'reading' => 'ひろさき', 'wrong' => ['こうぜん', 'ひろまえ', 'ひろざき']],
                ['word' => '八戸', 'reading' => 'はちのへ', 'wrong' => ['はっこ', 'やと', 'はちど']],
                ['word' => '五所川原', 'reading' => 'ごしょがわら', 'wrong' => ['ごところがわら', 'いつところがわら', 'ごしょかわら']],
            ],
        ],
        [
            'key' => 'iwate', 'name' => '岩手県', 'region' => 'hokkaido-tohoku', 'capital' => '盛岡市',
            'neighbors' => ['aomori', 'akita', 'miyagi'],
            'foods' => ['わんこそば', '盛岡冷麺', 'じゃじゃ麺', '南部せんべい'],
            'sights' => ['中尊寺金色堂', '龍泉洞', '小岩井農場', '浄土ヶ浜'],
            'culture' => ['チャグチャグ馬コ', '南部鉄器', '宮沢賢治'],
            'hard' => [
                ['word' => '一関', 'reading' => 'いちのせき', 'wrong' => ['いちかん', 'ひとせき', 'いっかん']],
                ['word' => '遠野', 'reading' => 'とおの', 'wrong' => ['えんや', 'とおや', 'えんの']],
                ['word' => '久慈', 'reading' => 'くじ', 'wrong' => ['ひさじ', 'きゅうじ', 'ひさしじ']],
            ],
        ],
        [
            'key' => 'miyagi', 'name' => '宮城県', 'region' => 'hokkaido-tohoku', 'capital' => '仙台市',
            'neighbors' => ['iwate', 'akita', 'yamagata', 'fukushima'],
            'foods' => ['牛タン', 'ずんだもち', '笹かまぼこ', '松島のカキ'],
            'sights' => ['松島', '仙台城跡', '蔵王のお釜', '鳴子温泉'],
            'culture' => ['仙台七夕まつり', '伊達政宗', '鳴子こけし'],
            'hard' => [
                ['word' => '石巻', 'reading' => 'いしのまき', 'wrong' => ['いしまき', 'せきまき', 'いわまき']],
                ['word' => '気仙沼', 'reading' => 'けせんぬま', 'wrong' => ['きせんぬま', 'けせんしょう', 'きせんしょう']],
                ['word' => '登米', 'reading' => 'とよま', 'wrong' => ['のぼりこめ', 'とめ', 'とうまい']],
            ],
        ],
        [
            'key' => 'akita', 'name' => '秋田県', 'region' => 'hokkaido-tohoku', 'capital' => '秋田市',
            'neighbors' => ['aomori', 'iwate', 'miyagi', 'yamagata'],
            'foods' => ['きりたんぽ', '稲庭うどん', 'ハタハタ', 'あきたこまち'],
            'sights' => ['田沢湖', '角館の武家屋敷', '男鹿半島', '乳頭温泉'],
            'culture' => ['なまはげ', '竿燈まつり', '大曲の花火'],
            'hard' => [
                ['word' => '大館', 'reading' => 'おおだて', 'wrong' => ['だいかん', 'おおたち', 'おおやかた']],
                ['word' => '鹿角', 'reading' => 'かづの', 'wrong' => ['しかつの', 'ろっかく', 'かつの']],
                ['word' => '能代', 'reading' => 'のしろ', 'wrong' => ['のうだい', 'のうしろ', 'よししろ']],
            ],
        ],
        [
            'key' => 'yamagata', 'name' => '山形県', 'region' => 'hokkaido-tohoku', 'capital' => '山形市',
            'neighbors' => ['akita', 'miyagi', 'fukushima', 'niigata'],
            'foods' => ['さくらんぼ', '芋煮', '米沢牛', 'ラ・フランス'],
            'sights' => ['蔵王の樹氷', '山寺', '銀山温泉', '最上川'],
            'culture' => ['花笠まつり', '天童の将棋の駒', '出羽三山'],
            'hard' => [
                ['word' => '酒田', 'reading' => 'さかた', 'wrong' => ['しゅた', 'さけた', 'さかだ']],
                ['word' => '鶴岡', 'reading' => 'つるおか', 'wrong' => ['かくこう', 'つるがおか', 'つるこう']],
                ['word' => '寒河江', 'reading' => 'さがえ', 'wrong' => ['かんがえ', 'さむかわえ', 'さむがわえ']],
            ],
        ],
        [
            'key' => 'fukushima', 'name' => '福島県', 'region' => 'hokkaido-tohoku', 'capital' => '福島市',
            'neighbors' => ['miyagi', 'yamagata', 'niigata', 'gunma', 'tochigi', 'ibaraki'],
            'foods' => ['福島の桃', '喜多方ラーメン', 'いかにんじん', '円盤餃子'],
            'sights' => ['鶴ヶ城', '大内宿', '磐梯山', '猪苗代湖'],
            'culture' => ['会津塗', '赤べこ', '野口英世'],
            'hard' => [
                ['word' => '喜多方', 'reading' => 'きたかた', 'wrong' => ['きたほう', 'よしたかた', 'きたがた']],
                ['word' => '猪苗代', 'reading' => 'いなわしろ', 'wrong' => ['いのなえしろ', 'ししなえだい', 'いなえしろ']],
                ['word' => '二本松', 'reading' => 'にほんまつ', 'wrong' => ['にほんしょう', 'にもとまつ', 'ふたもとまつ']],
            ],
        ],

        [
            'key' => 'ibaraki', 'name' => '茨城県', 'region' => 'kanto', 'capital' => '水戸市',
            'neighbors' => ['fukushima', 'tochigi', 'saitama', 'chiba'],
            'foods' => ['納豆', '干しいも', 'メロン', 'れんこん'],
            'sights' => ['筑波山', '偕楽園', '国営ひたち海浜公園', '牛久大仏'],
            'culture' => ['水戸黄門', '笠間焼', '日立風流物'],
            'hard' => [
                ['word' => '潮来', 'reading' => 'いたこ', 'wrong' => ['しおき', 'ちょうらい', 'しおくる']],
                ['word' => '取手', 'reading' => 'とりで', 'wrong' => ['とって', 'とりて', 'しゅしゅ']],
                ['word' => '行方', 'reading' => 'なめがた', 'wrong' => ['ゆくえ', 'いきかた', 'ぎょうほう']],
            ],
        ],
        [
            'key' => 'tochigi', 'name' => '栃木県', 'region' => 'kanto', 'capital' => '宇都宮市',
            'neighbors' => ['fukushima', 'ibaraki', 'saitama', 'gunma'],
            'foods' => ['いちご', '宇都宮餃子', 'かんぴょう', '佐野ラーメン'],
            'sights' => ['日光東照宮', '華厳の滝', '那須高原', '足利フラワーパーク'],
            'culture' => ['益子焼', '日光彫', '那須与一'],
            'hard' => [
                ['word' => '鹿沼', 'reading' => 'かぬま', 'wrong' => ['しかぬま', 'ろくぬま', 'かのぬま']],
                ['word' => '烏山', 'reading' => 'からすやま', 'wrong' => ['うやま', 'からすざん', 'とりやま']],
                ['word' => '下野', 'reading' => 'しもつけ', 'wrong' => ['しもの', 'げや', 'しもずけ']],
            ],
        ],
        [
            'key' => 'gunma', 'name' => '群馬県', 'region' => 'kanto', 'capital' => '前橋市',
            'neighbors' => ['fukushima', 'tochigi', 'saitama', 'niigata', 'nagano'],
            'foods' => ['こんにゃく', '焼きまんじゅう', '下仁田ねぎ', '水沢うどん'],
            'sights' => ['草津温泉', '富岡製糸場', '尾瀬', '伊香保温泉の石段'],
            'culture' => ['高崎だるま', '上毛かるた', '新田義貞'],
            'hard' => [
                ['word' => '嬬恋', 'reading' => 'つまごい', 'wrong' => ['つまこい', 'じゅれん', 'おとこい']],
                ['word' => '吾妻', 'reading' => 'あがつま', 'wrong' => ['あずま', 'わがつま', 'ごさい']],
                ['word' => '邑楽', 'reading' => 'おうら', 'wrong' => ['ゆうらく', 'おおら', 'むらら']],
            ],
        ],
        [
            'key' => 'saitama', 'name' => '埼玉県', 'region' => 'kanto', 'capital' => 'さいたま市',
            'neighbors' => ['ibaraki', 'tochigi', 'gunma', 'chiba', 'tokyo', 'yamanashi', 'nagano'],
            'foods' => ['草加せんべい', '深谷ねぎ', '狭山茶', '川越のさつまいも'],
            'sights' => ['川越の蔵造りの町並み', '秩父の芝桜', '鉄道博物館', '長瀞ライン下り'],
            'culture' => ['秩父夜祭', '岩槻の人形', '渋沢栄一'],
            'hard' => [
                ['word' => '越谷', 'reading' => 'こしがや', 'wrong' => ['えつや', 'こしたに', 'こえたに']],
                ['word' => '行田', 'reading' => 'ぎょうだ', 'wrong' => ['こうだ', 'ゆきた', 'いくた']],
                ['word' => '蕨', 'reading' => 'わらび', 'wrong' => ['わらい', 'わらべ', 'かたばみ']],
            ],
        ],
        [
            'key' => 'chiba', 'name' => '千葉県', 'region' => 'kanto', 'capital' => '千葉市',
            'neighbors' => ['ibaraki', 'saitama', 'tokyo'],
            'foods' => ['落花生', 'びわ', 'なめろう', '銚子のしょうゆ'],
            'sights' => ['東京ディズニーリゾート', '成田山新勝寺', '鋸山', '九十九里浜'],
            'culture' => ['佐原の大祭', '伊能忠敬', '南総里見八犬伝'],
            'hard' => [
                ['word' => '木更津', 'reading' => 'きさらづ', 'wrong' => ['きこうづ', 'きさらつ', 'もくさらづ']],
                ['word' => '我孫子', 'reading' => 'あびこ', 'wrong' => ['わがこ', 'わがんこ', 'がまご']],
                ['word' => '匝瑳', 'reading' => 'そうさ', 'wrong' => ['はつさ', 'ちさ', 'たさ']],
            ],
        ],
        [
            'key' => 'tokyo', 'name' => '東京都', 'region' => 'kanto', 'capital' => '新宿区',
            'neighbors' => ['saitama', 'chiba', 'kanagawa', 'yamanashi'],
            'foods' => ['もんじゃ焼き', '江戸前寿司', 'くさや', '深川めし'],
            'sights' => ['東京タワー', '東京スカイツリー', '浅草の雷門', '国会議事堂'],
            'culture' => ['江戸切子', '三社祭', '神田祭'],
            'hard' => [
                ['word' => '小笠原', 'reading' => 'おがさわら', 'wrong' => ['こがさわら', 'おかさはら', 'こかさはら']],
                ['word' => '青梅', 'reading' => 'おうめ', 'wrong' => ['あおうめ', 'せいばい', 'あおばい']],
                ['word' => '御徒町', 'reading' => 'おかちまち', 'wrong' => ['おとちょう', 'ごとまち', 'おかちちょう']],
            ],
        ],
        [
            'key' => 'kanagawa', 'name' => '神奈川県', 'region' => 'kanto', 'capital' => '横浜市',
            'neighbors' => ['tokyo', 'yamanashi', 'shizuoka'],
            'foods' => ['シウマイ', '三崎のまぐろ', '小田原かまぼこ', '湘南のしらす'],
            'sights' => ['横浜中華街', '箱根の大涌谷', '鎌倉の大仏', '江の島'],
            'culture' => ['箱根寄木細工', '小田原提灯', '源頼朝'],
            'hard' => [
                ['word' => '厚木', 'reading' => 'あつぎ', 'wrong' => ['あつき', 'あつぼく', 'こうぼく']],
                ['word' => '座間', 'reading' => 'ざま', 'wrong' => ['すわま', 'ざかん', 'くらま']],
                ['word' => '秦野', 'reading' => 'はだの', 'wrong' => ['はたの', 'しんの', 'はたや']],
            ],
        ],

        [
            'key' => 'niigata', 'name' => '新潟県', 'region' => 'chubu', 'capital' => '新潟市',
            'neighbors' => ['yamagata', 'fukushima', 'gunma', 'nagano', 'toyama'],
            'foods' => ['コシヒカリ', '笹だんご', 'へぎそば', '柿の種'],
            'sights' => ['佐渡島', '弥彦神社', '越後湯沢', '信濃川'],
            'culture' => ['長岡花火', '上杉謙信', '小千谷縮'],
            'hard' => [
                ['word' => '魚沼', 'reading' => 'うおぬま', 'wrong' => ['ぎょぬま', 'さかなぬま', 'うおしょう']],
                ['word' => '十日町', 'reading' => 'とおかまち', 'wrong' => ['じゅうにちまち', 'とうかまち', 'とおかちょう']],
                ['word' => '糸魚川', 'reading' => 'いといがわ', 'wrong' => ['いとうおがわ', 'しぎょがわ', 'いというおがわ']],
            ],
        ],
        [
            'key' => 'toyama', 'name' => '富山県', 'region' => 'chubu', 'capital' => '富山市',
            'neighbors' => ['niigata', 'nagano', 'gifu', 'ishikawa'],
            'foods' => ['ホタルイカ', 'ます寿司', '白えび', '富山ブラック'],
            'sights' => ['黒部ダム', '立山連峰', '五箇山の合掌造り', '高岡大仏'],
            'culture' => ['越中おわら風の盆', '富山の薬売り', '高岡銅器'],
            'hard' => [
                ['word' => '魚津', 'reading' => 'うおづ', 'wrong' => ['ぎょづ', 'さかなづ', 'うおつ']],
                ['word' => '氷見', 'reading' => 'ひみ', 'wrong' => ['こおりみ', 'ひょうみ', 'ひけん']],
                ['word' => '砺波', 'reading' => 'となみ', 'wrong' => ['れいなみ', 'といなみ', 'とば']],
            ],
        ],
        [
            'key' => 'ishikawa', 'name' => '石川県', 'region' => 'chubu', 'capital' => '金沢市',
            'neighbors' => ['toyama', 'gifu', 'fukui'],
            'foods' => ['のどぐろ', '治部煮', '金沢カレー', '加賀野菜'],
            'sights' => ['兼六園', '金沢21世紀美術館', '輪島朝市', '千里浜なぎさドライブウェイ'],
            'culture' => ['九谷焼', '加賀友禅', '輪島塗'],
            'hard' => [
                ['word' => '珠洲', 'reading' => 'すず', 'wrong' => ['たまず', 'しゅす', 'じゅず']],
                ['word' => '羽咋', 'reading' => 'はくい', 'wrong' => ['はぐい', 'はくわ', 'うくい']],
                ['word' => '志賀', 'reading' => 'しか', 'wrong' => ['しが', 'しこが', 'しいか']],
            ],
        ],
        [
            'key' => 'fukui', 'name' => '福井県', 'region' => 'chubu', 'capital' => '福井市',
            'neighbors' => ['ishikawa', 'gifu', 'shiga', 'kyoto'],
            'foods' => ['越前ガニ', 'ソースカツ丼', 'おろしそば', '水ようかん'],
            'sights' => ['東尋坊', '恐竜博物館', '永平寺', '一乗谷朝倉氏遺跡'],
            'culture' => ['越前和紙', '鯖江のめがね', '朝倉義景'],
            'hard' => [
                ['word' => '鯖江', 'reading' => 'さばえ', 'wrong' => ['さばこう', 'さばごう', 'さばや']],
                ['word' => '敦賀', 'reading' => 'つるが', 'wrong' => ['あつが', 'とんが', 'とんがく']],
                ['word' => '小浜', 'reading' => 'おばま', 'wrong' => ['こはま', 'こうはま', 'しょうはま']],
            ],
        ],
        [
            'key' => 'yamanashi', 'name' => '山梨県', 'region' => 'chubu', 'capital' => '甲府市',
            'neighbors' => ['saitama', 'tokyo', 'kanagawa', 'shizuoka', 'nagano'],
            'foods' => ['ぶどう', 'もも', 'ほうとう', '信玄餅'],
            'sights' => ['富士五湖', '河口湖', '昇仙峡', '忍野八海'],
            'culture' => ['武田信玄', '甲州印伝', '吉田の火祭り'],
            'hard' => [
                ['word' => '韮崎', 'reading' => 'にらさき', 'wrong' => ['にらざき', 'にらさい', 'にらがさき']],
                ['word' => '勝沼', 'reading' => 'かつぬま', 'wrong' => ['かつざわ', 'しょうぬま', 'かちぬま']],
                ['word' => '都留', 'reading' => 'つる', 'wrong' => ['とる', 'みやこ', 'とつる']],
            ],
        ],
        [
            'key' => 'nagano', 'name' => '長野県', 'region' => 'chubu', 'capital' => '長野市',
            'neighbors' => ['niigata', 'gunma', 'saitama', 'yamanashi', 'shizuoka', 'aichi', 'gifu', 'toyama'],
            'foods' => ['りんご', '信州そば', 'おやき', '野沢菜'],
            'sights' => ['善光寺', '松本城', '上高地', '軽井沢'],
            'culture' => ['御柱祭', '真田幸村', '木曽漆器'],
            'hard' => [
                ['word' => '小諸', 'reading' => 'こもろ', 'wrong' => ['しょうしょ', 'こしょ', 'おもろ']],
                ['word' => '諏訪', 'reading' => 'すわ', 'wrong' => ['すほう', 'しわ', 'すうわ']],
                ['word' => '飯田', 'reading' => 'いいだ', 'wrong' => ['はんだ', 'めしだ', 'いだ']],
            ],
        ],
        [
            'key' => 'gifu', 'name' => '岐阜県', 'region' => 'chubu', 'capital' => '岐阜市',
            'neighbors' => ['toyama', 'ishikawa', 'fukui', 'shiga', 'mie', 'aichi', 'nagano'],
            'foods' => ['飛騨牛', '朴葉みそ', '五平餅', '鮎の塩焼き'],
            'sights' => ['白川郷', '飛騨高山の古い町並み', '下呂温泉', '岐阜城'],
            'culture' => ['長良川の鵜飼', '郡上おどり', '美濃焼'],
            'hard' => [
                ['word' => '郡上', 'reading' => 'ぐじょう', 'wrong' => ['ぐんじょう', 'こおりうえ', 'ぐんかみ']],
                ['word' => '可児', 'reading' => 'かに', 'wrong' => ['かじ', 'かこ', 'かじか']],
                ['word' => '恵那', 'reading' => 'えな', 'wrong' => ['けいな', 'めぐな', 'えいな']],
            ],
        ],
        [
            'key' => 'shizuoka', 'name' => '静岡県', 'region' => 'chubu', 'capital' => '静岡市',
            'neighbors' => ['kanagawa', 'yamanashi', 'nagano', 'aichi'],
            'foods' => ['静岡茶', 'うなぎ', 'わさび', '桜えび'],
            'sights' => ['三保の松原', '浜名湖', '日本平', '熱海温泉'],
            'culture' => ['徳川家康', '浜松まつり', '登呂遺跡'],
            'hard' => [
                ['word' => '焼津', 'reading' => 'やいづ', 'wrong' => ['やきつ', 'やきづ', 'やけづ']],
                ['word' => '御殿場', 'reading' => 'ごてんば', 'wrong' => ['ごでんば', 'おとのば', 'ごてんじょう']],
                ['word' => '磐田', 'reading' => 'いわた', 'wrong' => ['ばんでん', 'いはた', 'いわだ']],
            ],
        ],
        [
            'key' => 'aichi', 'name' => '愛知県', 'region' => 'chubu', 'capital' => '名古屋市',
            'neighbors' => ['shizuoka', 'nagano', 'gifu', 'mie'],
            'foods' => ['味噌カツ', 'ひつまぶし', 'きしめん', '手羽先'],
            'sights' => ['名古屋城', '熱田神宮', '犬山城', 'トヨタ博物館'],
            'culture' => ['織田信長', '常滑焼', '有松絞り'],
            'hard' => [
                ['word' => '蒲郡', 'reading' => 'がまごおり', 'wrong' => ['かまぐん', 'がまぐん', 'ほぐん']],
                ['word' => '一宮', 'reading' => 'いちのみや', 'wrong' => ['いちみや', 'いっきゅう', 'ひとみや']],
                ['word' => '碧南', 'reading' => 'へきなん', 'wrong' => ['あおみなみ', 'みどりなん', 'へきみなみ']],
            ],
        ],

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

        [
            'key' => 'tottori', 'name' => '鳥取県', 'region' => 'chugoku-shikoku', 'capital' => '鳥取市',
            'neighbors' => ['hyogo', 'okayama', 'hiroshima', 'shimane'],
            'foods' => ['二十世紀梨', '松葉ガニ', 'らっきょう', '牛骨ラーメン'],
            'sights' => ['鳥取砂丘', '水木しげるロード', '大山', '投入堂'],
            'culture' => ['因幡の白うさぎ', 'しゃんしゃん祭', '因州和紙'],
            'hard' => [
                ['word' => '倉吉', 'reading' => 'くらよし', 'wrong' => ['そうきち', 'くらきち', 'そうよし']],
                ['word' => '境港', 'reading' => 'さかいみなと', 'wrong' => ['きょうこう', 'さかいこう', 'さかいがわみなと']],
                ['word' => '米子', 'reading' => 'よなご', 'wrong' => ['こめこ', 'べいし', 'よねこ']],
            ],
        ],
        [
            'key' => 'shimane', 'name' => '島根県', 'region' => 'chugoku-shikoku', 'capital' => '松江市',
            'neighbors' => ['tottori', 'hiroshima', 'yamaguchi'],
            'foods' => ['宍道湖のしじみ', '出雲そば', 'あご野焼き', '隠岐の岩ガキ'],
            'sights' => ['出雲大社', '松江城', '石見銀山', '足立美術館'],
            'culture' => ['神在月', '出雲神楽', '小泉八雲'],
            'hard' => [
                ['word' => '出雲', 'reading' => 'いずも', 'wrong' => ['でぐも', 'しゅつうん', 'いでくも']],
                ['word' => '益田', 'reading' => 'ますだ', 'wrong' => ['えきた', 'ましだ', 'えきだ']],
                ['word' => '隠岐', 'reading' => 'おき', 'wrong' => ['かくれき', 'いんぎ', 'いんき']],
            ],
        ],
        [
            'key' => 'okayama', 'name' => '岡山県', 'region' => 'chugoku-shikoku', 'capital' => '岡山市',
            'neighbors' => ['hyogo', 'tottori', 'hiroshima'],
            'foods' => ['白桃', 'きびだんご', 'マスカット', 'ばら寿司'],
            'sights' => ['後楽園', '岡山城', '倉敷美観地区', '鷲羽山'],
            'culture' => ['桃太郎', '備前焼', '倉敷デニム'],
            'hard' => [
                ['word' => '総社', 'reading' => 'そうじゃ', 'wrong' => ['そうしゃ', 'ふさしゃ', 'そうやしろ']],
                ['word' => '笠岡', 'reading' => 'かさおか', 'wrong' => ['りゅうおか', 'かさがおか', 'かさぎおか']],
                ['word' => '井原', 'reading' => 'いばら', 'wrong' => ['いはら', 'いげん', 'いなばら']],
            ],
        ],
        [
            'key' => 'hiroshima', 'name' => '広島県', 'region' => 'chugoku-shikoku', 'capital' => '広島市',
            'neighbors' => ['tottori', 'shimane', 'okayama', 'yamaguchi'],
            'foods' => ['広島風お好み焼き', 'もみじまんじゅう', '広島のカキ', '尾道ラーメン'],
            'sights' => ['厳島神社', '原爆ドーム', '平和記念公園', '尾道の坂道'],
            'culture' => ['広島カープ', '熊野筆', '管絃祭'],
            'hard' => [
                ['word' => '尾道', 'reading' => 'おのみち', 'wrong' => ['おみち', 'びどう', 'おうどう']],
                ['word' => '呉', 'reading' => 'くれ', 'wrong' => ['ご', 'ごう', 'ごお']],
                ['word' => '三次', 'reading' => 'みよし', 'wrong' => ['さんじ', 'みつぎ', 'みじ']],
            ],
        ],
        [
            'key' => 'yamaguchi', 'name' => '山口県', 'region' => 'chugoku-shikoku', 'capital' => '山口市',
            'neighbors' => ['shimane', 'hiroshima'],
            'foods' => ['ふぐ', '瓦そば', '岩国寿司', '夏みかん'],
            'sights' => ['錦帯橋', '秋芳洞', '角島大橋', '萩の城下町'],
            'culture' => ['吉田松陰', '山口祇園祭', '萩焼'],
            'hard' => [
                ['word' => '下関', 'reading' => 'しものせき', 'wrong' => ['げかん', 'しもせき', 'したのせき']],
                ['word' => '周南', 'reading' => 'しゅうなん', 'wrong' => ['すなん', 'まわりなん', 'しゅうみなみ']],
                ['word' => '岩国', 'reading' => 'いわくに', 'wrong' => ['がんこく', 'いわぐに', 'いわこく']],
            ],
        ],
        [
            'key' => 'tokushima', 'name' => '徳島県', 'region' => 'chugoku-shikoku', 'capital' => '徳島市',
            'neighbors' => ['kagawa', 'ehime', 'kochi'],
            'foods' => ['すだち', '徳島ラーメン', '鳴門わかめ', '半田そうめん'],
            'sights' => ['鳴門の渦潮', '祖谷のかずら橋', '大塚国際美術館', '眉山'],
            'culture' => ['阿波おどり', '藍染', '人形浄瑠璃'],
            'hard' => [
                ['word' => '美馬', 'reading' => 'みま', 'wrong' => ['びば', 'みば', 'うま']],
                ['word' => '阿南', 'reading' => 'あなん', 'wrong' => ['あなみ', 'あみなみ', 'おなん']],
                ['word' => '海陽', 'reading' => 'かいよう', 'wrong' => ['うみひ', 'かいひ', 'うみよう']],
            ],
        ],
        [
            'key' => 'kagawa', 'name' => '香川県', 'region' => 'chugoku-shikoku', 'capital' => '高松市',
            'neighbors' => ['tokushima', 'ehime'],
            'foods' => ['さぬきうどん', 'オリーブ', '骨付鳥', '和三盆'],
            'sights' => ['栗林公園', '金刀比羅宮', '小豆島', '瀬戸大橋'],
            'culture' => ['空海', '丸亀うちわ', '讃岐漆器'],
            'hard' => [
                ['word' => '観音寺', 'reading' => 'かんおんじ', 'wrong' => ['かんのんじ', 'かんおんてら', 'かんのんてら']],
                ['word' => '琴平', 'reading' => 'ことひら', 'wrong' => ['きんぺい', 'ことへい', 'こっぺい']],
                ['word' => '坂出', 'reading' => 'さかいで', 'wrong' => ['さかで', 'さかしゅつ', 'はんしゅつ']],
            ],
        ],
        [
            'key' => 'ehime', 'name' => '愛媛県', 'region' => 'chugoku-shikoku', 'capital' => '松山市',
            'neighbors' => ['kagawa', 'tokushima', 'kochi'],
            'foods' => ['いよかん', '鯛めし', 'じゃこ天', '今治焼き鳥'],
            'sights' => ['道後温泉', '松山城', 'しまなみ海道', '内子座'],
            'culture' => ['坊っちゃん', '今治タオル', '正岡子規'],
            'hard' => [
                ['word' => '今治', 'reading' => 'いまばり', 'wrong' => ['こんじ', 'いまじ', 'いまはり']],
                ['word' => '宇和島', 'reading' => 'うわじま', 'wrong' => ['うわしま', 'うおじま', 'うかしま']],
                ['word' => '八幡浜', 'reading' => 'やわたはま', 'wrong' => ['はちまんはま', 'やはたはま', 'はちまんひん']],
            ],
        ],
        [
            'key' => 'kochi', 'name' => '高知県', 'region' => 'chugoku-shikoku', 'capital' => '高知市',
            'neighbors' => ['tokushima', 'ehime'],
            'foods' => ['カツオのたたき', 'ゆず', 'アイスクリン', 'ミレービスケット'],
            'sights' => ['桂浜', '高知城', '四万十川', 'ひろめ市場'],
            'culture' => ['よさこい祭り', '坂本龍馬', '土佐闘犬'],
            'hard' => [
                ['word' => '四万十', 'reading' => 'しまんと', 'wrong' => ['よんまんと', 'しまんじゅう', 'よんまんじゅう']],
                ['word' => '安芸', 'reading' => 'あき', 'wrong' => ['やすき', 'あんげ', 'あげ']],
                ['word' => '室戸', 'reading' => 'むろと', 'wrong' => ['しつど', 'むろど', 'むろこ']],
            ],
        ],

        [
            'key' => 'fukuoka', 'name' => '福岡県', 'region' => 'kyushu-okinawa', 'capital' => '福岡市',
            'neighbors' => ['saga', 'kumamoto', 'oita'],
            'foods' => ['明太子', 'とんこつラーメン', 'もつ鍋', 'あまおう'],
            'sights' => ['太宰府天満宮', '福岡タワー', '門司港レトロ', '志賀島'],
            'culture' => ['博多祇園山笠', '博多人形', '博多織'],
            'hard' => [
                ['word' => '太宰府', 'reading' => 'だざいふ', 'wrong' => ['たいさいふ', 'だざいぶ', 'おおざいふ']],
                ['word' => '大牟田', 'reading' => 'おおむた', 'wrong' => ['だいむた', 'おおむだ', 'たいむた']],
                ['word' => '糸島', 'reading' => 'いとしま', 'wrong' => ['いとじま', 'いとうしま', 'しじま']],
            ],
        ],
        [
            'key' => 'saga', 'name' => '佐賀県', 'region' => 'kyushu-okinawa', 'capital' => '佐賀市',
            'neighbors' => ['fukuoka', 'nagasaki'],
            'foods' => ['佐賀牛', '呼子のイカ', '佐賀のり', '嬉野茶'],
            'sights' => ['吉野ヶ里遺跡', '唐津城', '虹の松原', '祐徳稲荷神社'],
            'culture' => ['有田焼', '唐津くんち', 'バルーンフェスタ'],
            'hard' => [
                ['word' => '鳥栖', 'reading' => 'とす', 'wrong' => ['とりす', 'ちょうせい', 'とりくり']],
                ['word' => '嬉野', 'reading' => 'うれしの', 'wrong' => ['うれしや', 'よろこびの', 'うれの']],
                ['word' => '神埼', 'reading' => 'かんざき', 'wrong' => ['しんざき', 'かみさき', 'かみざき']],
            ],
        ],
        [
            'key' => 'nagasaki', 'name' => '長崎県', 'region' => 'kyushu-okinawa', 'capital' => '長崎市',
            'neighbors' => ['saga'],
            'foods' => ['カステラ', 'ちゃんぽん', '皿うどん', 'トルコライス'],
            'sights' => ['出島', '軍艦島', 'グラバー園', 'ハウステンボス'],
            'culture' => ['長崎くんち', '隠れキリシタン', 'ハタ揚げ'],
            'hard' => [
                ['word' => '諫早', 'reading' => 'いさはや', 'wrong' => ['かんそう', 'いさわや', 'いさそう']],
                ['word' => '壱岐', 'reading' => 'いき', 'wrong' => ['いちき', 'いっき', 'ひとき']],
                ['word' => '対馬', 'reading' => 'つしま', 'wrong' => ['たいば', 'ついま', 'たいま']],
            ],
        ],
        [
            'key' => 'kumamoto', 'name' => '熊本県', 'region' => 'kyushu-okinawa', 'capital' => '熊本市',
            'neighbors' => ['fukuoka', 'oita', 'miyazaki', 'kagoshima'],
            'foods' => ['馬刺し', 'からしれんこん', '太平燕', 'いきなり団子'],
            'sights' => ['熊本城', '阿蘇山', '草千里ヶ浜', '黒川温泉'],
            'culture' => ['くまモン', '加藤清正', '山鹿灯籠'],
            'hard' => [
                ['word' => '玉名', 'reading' => 'たまな', 'wrong' => ['ぎょくめい', 'たまみょう', 'たまめい']],
                ['word' => '天草', 'reading' => 'あまくさ', 'wrong' => ['てんそう', 'あまぐさ', 'てんくさ']],
                ['word' => '水俣', 'reading' => 'みなまた', 'wrong' => ['すいまた', 'みずまた', 'みなみまた']],
            ],
        ],
        [
            'key' => 'oita', 'name' => '大分県', 'region' => 'kyushu-okinawa', 'capital' => '大分市',
            'neighbors' => ['fukuoka', 'kumamoto', 'miyazaki'],
            'foods' => ['とり天', 'かぼす', '関あじ', 'だんご汁'],
            'sights' => ['別府温泉', '由布院温泉', '地獄めぐり', '宇佐神宮'],
            'culture' => ['別府竹細工', '日田祇園', '大友宗麟'],
            'hard' => [
                ['word' => '日田', 'reading' => 'ひた', 'wrong' => ['にちだ', 'ひだ', 'にた']],
                ['word' => '臼杵', 'reading' => 'うすき', 'wrong' => ['きゅうしょ', 'うすぎ', 'うしょう']],
                ['word' => '杵築', 'reading' => 'きつき', 'wrong' => ['しょうちく', 'きねつき', 'きづき']],
            ],
        ],
        [
            'key' => 'miyazaki', 'name' => '宮崎県', 'region' => 'kyushu-okinawa', 'capital' => '宮崎市',
            'neighbors' => ['oita', 'kumamoto', 'kagoshima'],
            'foods' => ['マンゴー', 'チキン南蛮', '宮崎牛', '地鶏の炭火焼'],
            'sights' => ['高千穂峡', '青島神社', '鵜戸神宮', 'サンメッセ日南'],
            'culture' => ['高千穂神楽', '神武天皇', '飫肥杉'],
            'hard' => [
                ['word' => '日向', 'reading' => 'ひゅうが', 'wrong' => ['にちこう', 'ひなた', 'ひむかい']],
                ['word' => '都城', 'reading' => 'みやこのじょう', 'wrong' => ['とじょう', 'みやこじょう', 'つじょう']],
                ['word' => '延岡', 'reading' => 'のべおか', 'wrong' => ['えんおか', 'のぶおか', 'のびおか']],
            ],
        ],
        [
            'key' => 'kagoshima', 'name' => '鹿児島県', 'region' => 'kyushu-okinawa', 'capital' => '鹿児島市',
            'neighbors' => ['kumamoto', 'miyazaki'],
            'foods' => ['黒豚', 'さつま揚げ', 'かるかん', '鶏飯'],
            'sights' => ['桜島', '屋久島', '指宿の砂むし温泉', '仙巌園'],
            'culture' => ['西郷隆盛', '薩摩切子', '大島紬'],
            'hard' => [
                ['word' => '指宿', 'reading' => 'いぶすき', 'wrong' => ['ゆびすき', 'ゆびやど', 'いしゅく']],
                ['word' => '枕崎', 'reading' => 'まくらざき', 'wrong' => ['ちんざき', 'まくらさき', 'まくさき']],
                ['word' => '種子島', 'reading' => 'たねがしま', 'wrong' => ['しゅしじま', 'たねしま', 'たねじま']],
            ],
        ],
        [
            'key' => 'okinawa', 'name' => '沖縄県', 'region' => 'kyushu-okinawa', 'capital' => '那覇市',
            'neighbors' => [],
            'foods' => ['ゴーヤーチャンプルー', '沖縄そば', '海ぶどう', 'サーターアンダギー'],
            'sights' => ['首里城', '美ら海水族館', '万座毛', '竹富島'],
            'culture' => ['エイサー', '三線', 'シーサー'],
            'hard' => [
                ['word' => '宜野湾', 'reading' => 'ぎのわん', 'wrong' => ['よしのわん', 'ぎやわん', 'ぎのうわん']],
                ['word' => '読谷', 'reading' => 'よみたん', 'wrong' => ['どくたに', 'よみや', 'よみだに']],
                ['word' => '西表', 'reading' => 'いりおもて', 'wrong' => ['にしおもて', 'せいひょう', 'にしひょう']],
            ],
        ],
    ],
];
