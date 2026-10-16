import { describe, expect, it } from "vitest";

import { tokenize } from "./auto-furigana";

// ふりがなを付ける語だけを「語(読み)」の形で並べる
const ruby = (text: string) =>
  tokenize(text)
    .filter((segment) => typeof segment !== "string")
    .map((segment) => `${segment.text}(${segment.reading})`);

describe("自動ふりがな(旅の画面の言葉)", () => {
  it("1文字の読みで誤らないよう、言葉ごとの読みを使う", () => {
    expect(ruby("出発する")).toEqual(["出発(しゅっぱつ)"]);
    expect(ruby("小さな船")).toEqual(["小さな(ちいさな)", "船(ふね)"]);
    expect(ruby("大きな船")).toEqual(["大きな(おおきな)", "船(ふね)"]);
    expect(ruby("自転車")).toEqual(["自転車(じてんしゃ)"]);
    expect(ruby("仏国寺")).toEqual(["仏国寺(ぶっこくじ)"]);
    expect(ruby("もっと学ぶ(中級・上級)")).toEqual(["学ぶ(まなぶ)", "中級(ちゅうきゅう)", "上級(じょうきゅう)"]);
    expect(ruby("インドネシアの初級のボスをクリアしよう")).toEqual(["初級(しょきゅう)"]);
  });

  it("「〜中」は「ちゅう」と読む", () => {
    expect(ruby("じゅんび中")).toEqual(["じゅんび中(じゅんびちゅう)"]);
    expect(ruby("出発中...")).toEqual(["出発中(しゅっぱつちゅう)"]);
    expect(ruby("受け取り中...")).toEqual(["受け取り中(うけとりちゅう)"]);
    expect(ruby("読み込み中...")).toEqual(["読み込み中(よみこみちゅう)"]);
  });

  it("「受け取る」は「うけと」と読む", () => {
    expect(ruby("受け取る")).toEqual(["受け取(うけと)"]);
  });
});

describe("自動ふりがな(せかいの画面の言葉)", () => {
  it("飛行機・空港・倒す・着いた・行ける・学べる", () => {
    expect(ruby("飛行機で行く国")).toEqual(["飛行機(ひこうき)", "行く(いく)", "国(くに)"]);
    expect(ruby("空港から出発！")).toEqual(["空港(くうこう)", "出発(しゅっぱつ)"]);
    expect(ruby("日本の初級のボスを倒すと")).toContain("倒す(たおす)");
    expect(ruby("着いた国")).toEqual(["着いた(ついた)", "国(くに)"]);
    expect(ruby("行ける！")).toEqual(["行ける(いける)"]);
    expect(ruby("着いた国で学べるよ")).toContain("学べる(まなべる)");
  });
});

describe("自動ふりがな(ショップとバッグのタブ)", () => {
  it("名所・お店", () => {
    expect(ruby("名所")).toEqual(["名所(めいしょ)"]);
    expect(ruby("いえ・お店")).toEqual(["お店(おみせ)"]);
  });
});

describe("自動ふりがな(数字の後の日・人)", () => {
  it("日は数に合わせて読む(何日間の読み)", () => {
    expect(ruby("7日続けて学ぶ")).toEqual(["7日(なのか)", "続け(つづけ)", "学ぶ(まなぶ)"]);
    expect(ruby("あと3日")).toEqual(["3日(みっか)"]);
    expect(ruby("あと1日")).toEqual(["1日(いちにち)"]);
    expect(ruby("30日、毎日来てくれて")).toEqual(["30日(さんじゅうにち)", "毎日(まいにち)", "来て(きて)"]);
    expect(ruby("14日")).toEqual(["14日(じゅうよっか)"]);
    expect(ruby("20日")).toEqual(["20日(はつか)"]);
    expect(ruby("17日")).toEqual(["17日(じゅうしちにち)"]);
    expect(ruby("100日連続プレイ！")).toEqual(["100日(ひゃくにち)", "連続(れんぞく)"]);
    expect(ruby("365日")).toEqual(["365日(さんびゃくろくじゅうごにち)"]);
  });

  it("人は数に合わせて読む", () => {
    expect(ruby("仲間が5人そろったね")).toEqual(["仲間(なかま)", "5人(ごにん)"]);
    expect(ruby("1人")).toEqual(["1人(ひとり)"]);
    expect(ruby("2人")).toEqual(["2人(ふたり)"]);
    expect(ruby("4人")).toEqual(["4人(よにん)"]);
  });

  it("日・人が後ろにない数字は、そのまま", () => {
    expect(ruby("レベル10になる")).toEqual([]);
    expect(tokenize("レベル10になる")).toEqual(["レベル10になる"]);
  });
});

describe("自動ふりがな(レアスプルと特別な種の言葉)", () => {
  it("1文字ずつ読むと誤る言葉を、言葉ごとに読む", () => {
    expect(ruby("今日の復習")).toEqual(["今日(きょう)", "復習(ふくしゅう)"]);
    expect(ruby("町に出す")).toEqual(["町(まち)", "出す(だす)"]);
    expect(ruby("町に出せるよ")).toEqual(["町(まち)", "出せる(だせる)"]);
    expect(ruby("琥珀・思い出")).toEqual(["思い出(おもいで)"]);
    expect(ruby("大切なしんゆう")).toEqual(["大切(たいせつ)"]);
    expect(ruby("水晶・集中")).toEqual(["水晶(すいしょう)", "集中(しゅうちゅう)"]);
    expect(ruby("全問正解")).toEqual(["全問(ぜんもん)", "正解(せいかい)"]);
    expect(ruby("最高のしんゆう")).toEqual(["最高(さいこう)"]);
    expect(ruby("一番のしんゆう")).toEqual(["一番(いちばん)"]);
    expect(ruby("なかまの一覧")).toEqual(["一覧(いちらん)"]);
    expect(ruby("会えてうれしい")).toEqual(["会えて(あえて)"]);
    expect(ruby("会いに来たよ")).toEqual(["会いに(あいに)", "来た(きた)"]);
    expect(ruby("何度も")).toEqual(["何度(なんど)"]);
    expect(ruby("景色")).toEqual(["景色(けしき)"]);
    expect(ruby("大きくなる")).toEqual(["大きく(おおきく)"]);
    expect(ruby("小さな一歩")).toEqual(["小さな(ちいさな)", "一歩(いっぽ)"]);
    expect(ruby("宝物")).toEqual(["宝物(たからもの)"]);
    expect(ruby("白金")).toEqual(["白金(はっきん)"]);
    expect(ruby("あと1か国")).toEqual(["か国(かこく)"]);
  });
});

describe("自動ふりがな(ふりがなを付けない語。難読地名の問題)", () => {
  const rubyPlain = (text: string, plain: string[]) =>
    tokenize(text, plain)
      .filter((segment) => typeof segment !== "string")
      .map((segment) => `${segment.text}(${segment.reading})`);

  it("plain の語は、辞書にあっても、ふりがなを付けずにそのまま出す。ほかの語には付く", () => {
    // 「大阪」「京都」は辞書にある語。問われる語だけ読みを隠す
    expect(rubyPlain("大阪府の『京都』は、なんて よむ？", ["京都"])).toEqual(["大阪(おおさか)", "府(ふ)"]);
    expect(tokenize("大阪府の『京都』は", ["京都"]).map((segment) => (typeof segment === "string" ? segment : segment.text)).join("")).toBe("大阪府の『京都』は"); // 文字は変わらない
  });

  it("plain がなければ、これまでどおり", () => {
    expect(rubyPlain("大阪府の『京都』は", [])).toEqual(rubyPlain("大阪府の『京都』は", []));
    expect(ruby("大阪府の『京都』は")).toContain("京都(きょうと)");
    expect(tokenize("大阪の京都", undefined)).toEqual(tokenize("大阪の京都"));
  });

  it("plain の語は、長い辞書の語の一部でも、その語として出す", () => {
    // 「京都」を含む「京都府」より先に、plain の「京都」を見る
    expect(rubyPlain("京都府と京都", ["京都"])).not.toContain("京都(きょうと)");
  });
});

describe("問題ごとの読み(readings)", () => {
  const rubyWith = (text: string, readings: Record<string, string>, plain: string[] = []) =>
    tokenize(text, plain, readings)
      .filter((segment) => typeof segment !== "string")
      .map((segment) => `${segment.text}(${segment.reading})`);

  it("問題ごとの読みを付ける。同じ名前でも、問題ごとに別の読みにできる", () => {
    expect(rubyWith("朝日町は、山形県にあるよ。", { 朝日町: "あさひまち" })).toContain("朝日町(あさひまち)");
    expect(rubyWith("朝日町は、三重県にあるよ。", { 朝日町: "あさひちょう" })).toContain("朝日町(あさひちょう)");
  });

  it("辞書の語のほうが長いときは、辞書を使う(秋田の読みで、秋田犬が分かれない)", () => {
    expect(rubyWith("秋田犬", { 秋田: "あきた" })).toEqual(["秋田犬(あきたいぬ)"]);
  });

  it("同じ長さなら、問題ごとの読みを先にする。plain の語は、読みがあっても付けない", () => {
    expect(rubyWith("北海道", { 北海道: "ほっかいどう" })).toEqual(["北海道(ほっかいどう)"]);
    expect(rubyWith("『旭川』は", { 旭川: "あさひかわ" }, ["旭川"])).toEqual([]);
  });
});

describe("自動ふりがな(単語帳と、子ども向けの画面の言葉)", () => {
  it("単語帳は、帳まで読みが付く(一部だけ付かないと行がずれる)", () => {
    expect(ruby("単語帳")).toEqual(["単語(たんご)", "帳(ちょう)"]);
    expect(ruby("単語帳に保存")).toEqual(["単語(たんご)", "帳(ちょう)", "保存(ほぞん)"]);
  });

  it("町・置く・買う・遊ぶ・難しさ・復習・問題", () => {
    expect(ruby("町にもどる")).toEqual(["町(まち)"]);
    expect(ruby("「置く」を押す")).toEqual(["置く(おく)", "押す(おす)"]);
    expect(ruby("学習ポイントで買う")).toEqual(["学習(がくしゅう)", "買う(かう)"]);
    expect(ruby("家族が遊びに来てくれたよ")).toEqual(["家族(かぞく)", "遊(あそ)", "来て(きて)"]);
    expect(ruby("難しさを変える")).toContain("難し(むずかし)");
    expect(ruby("まちがえた問題")).toContain("問題(もんだい)");
    expect(ruby("もう一度メールを送る")).toEqual(["一度(いちど)", "送る(おくる)"]);
  });
});

describe("自動ふりがな(1文字の読みで誤る言葉)", () => {
  it("学校・上手・大変・元気・来る・消す は、言葉ごとに読む", () => {
    expect(ruby("学校")).toEqual(["学校(がっこう)"]);
    expect(ruby("上手に")).toEqual(["上手(じょうず)"]);
    expect(ruby("大変だ")).toEqual(["大変(たいへん)"]);
    expect(ruby("元気")).toEqual(["元気(げんき)"]);
    expect(ruby("明日来る")).toContain("来る(くる)");
    expect(ruby("消すと消えます")).toEqual(["消す(けす)", "消え(きえ)"]);
  });
});

describe("自動ふりがな(月・別れる)", () => {
  it("数字の後の月は「がつ」と読む。数字のない月は「つき」", () => {
    expect(ruby("10月")).toEqual(["10月(じゅうがつ)"]);
    expect(ruby("4月と7月と9月")).toEqual(["4月(しがつ)", "7月(しちがつ)", "9月(くがつ)"]);
    expect(ruby("12月")).toEqual(["12月(じゅうにがつ)"]);
    expect(ruby("月を見る")).toContain("月(つき)");
    expect(ruby("今月")).toEqual(["今月(こんげつ)"]);
  });

  it("別れる は「わかれる」。特別は「とくべつ」のまま", () => {
    expect(ruby("友達と別れます")).toContain("別れ(わかれ)");
    expect(ruby("特別")).toEqual(["特別(とくべつ)"]);
  });
});

describe("自動ふりがな(英語の問題でよく出る言葉)", () => {
  it("表す・入る・大きい・小さい・面白い・会った・書き直す は、送りがなまで含めて読む", () => {
    expect(ruby("「特売」を表す英単語は？")).toContain("表す(あらわす)");
    expect(ruby("「　」に入る語は？")).toContain("入る(はいる)");
    expect(ruby("大きい")).toEqual(["大きい(おおきい)"]);
    expect(ruby("小さい")).toEqual(["小さい(ちいさい)"]);
    expect(ruby("面白い")).toEqual(["面白い(おもしろい)"]);
    expect(ruby("初めて会った人")).toContain("会った(あった)");
    expect(ruby("書き直す")).toEqual(["書き直(かきなお)"]);
  });
});

describe("自動ふりがな(形態素解析で作った辞書)", () => {
  it("手の辞書にない語も、作った辞書で読む", () => {
    expect(ruby("具体的な計画")).toEqual(["具体(ぐたい)", "的(てき)", "計画(けいかく)"]);
    expect(ruby("問題を解決する")).toContain("解決(かいけつ)");
    expect(ruby("友達と別れます")).toEqual(["友達(ともだち)", "別れ(わかれ)"]);
  });

  it("同じ語は手の辞書が勝つ(Sudachiの「難しい=がたし」「言う=ゆう」に引きずられない)", () => {
    expect(ruby("難しい")).toEqual(["難しい(むずかしい)"]);
    expect(ruby("英語で言う")).toContain("言う(いう)");
    expect(ruby("好む人")).toContain("人(ひと)");
  });
});

describe("自動ふりがな(数え方の読み: 〜つ・本・分・階・回など)", () => {
  it("一つ・二つ…九つ は、ひとつ・ふたつ・みっつ…ここのつ(「いちつ」にならない)", () => {
    expect(ruby("一つだけ")).toEqual(["一つ(ひとつ)"]);
    expect(ruby("二つ")).toEqual(["二つ(ふたつ)"]);
    expect(ruby("三つ")).toEqual(["三つ(みっつ)"]);
    expect(ruby("四つ")).toEqual(["四つ(よっつ)"]);
    expect(ruby("五つ")).toEqual(["五つ(いつつ)"]);
    expect(ruby("六つ")).toEqual(["六つ(むっつ)"]);
    expect(ruby("七つ")).toEqual(["七つ(ななつ)"]);
    expect(ruby("八つ")).toEqual(["八つ(やっつ)"]);
    expect(ruby("九つ")).toEqual(["九つ(ここのつ)"]);
  });

  it("数字の1つ・2つ…も同じ読みにする。「つ」でない数字は、そのまま", () => {
    expect(ruby("2つの")).toEqual(["2つ(ふたつ)"]);
    expect(ruby("3つ")).toEqual(["3つ(みっつ)"]);
    expect(ruby("4つ")).toEqual(["4つ(よっつ)"]);
    expect(ruby("9つ")).toEqual(["9つ(ここのつ)"]);
    expect(ruby("10つ")).toEqual([]);
  });

  it("八つ橋のように、辞書の長い語があるときは、辞書の読みを使う", () => {
    expect(ruby("八つ橋")).toEqual(["八つ橋(やつはし)"]);
  });

  it("日付の1日は「ついたち」、日数の1日は「いちにち」", () => {
    expect(ruby("1月1日は何の日？")).toContain("1日(ついたち)");
    expect(ruby("1月1日は何の日？")).toContain("1月(いちがつ)");
    expect(ruby("11月23日")).toEqual(["11月(じゅういちがつ)", "23日(にじゅうさんにち)"]);
    expect(ruby("あと1日")).toEqual(["1日(いちにち)"]);
    expect(ruby("四日")).toEqual(["四日(よっか)"]);
    expect(ruby("三日")).toEqual(["三日(みっか)"]);
    expect(ruby("十日")).toEqual(["十日(とおか)"]);
    expect(ruby("二十日")).toEqual(["二十日(はつか)"]);
  });

  it("三日月・九十九里浜のような語を、数え方として読まない", () => {
    expect(ruby("三日月")).toEqual(["三日月(みかづき)"]);
    expect(ruby("九十九里浜")).toEqual(["九十九里浜(くじゅうくりはま)"]);
  });

  it("一人・二人 は、ひとり・ふたり。三人からは「〜にん」", () => {
    expect(ruby("一人で")).toEqual(["一人(ひとり)"]);
    expect(ruby("二人")).toEqual(["二人(ふたり)"]);
    expect(ruby("三人")).toEqual(["三人(さんにん)"]);
    expect(ruby("八人")).toEqual(["八人(はちにん)"]);
    expect(ruby("930万人")).not.toContain("万人(ひと)");
  });

  it("本・匹・杯は、数で「ほん/ぽん/ぼん」などに変わる", () => {
    expect(ruby("13本")).toEqual(["13本(じゅうさんぼん)"]);
    expect(ruby("8本")).toEqual(["8本(はっぽん)"]);
    expect(ruby("20本")).toEqual(["20本(にじゅっぽん)"]);
    expect(ruby("16本")).toEqual(["16本(じゅうろっぽん)"]);
    expect(ruby("12本")).toEqual(["12本(じゅうにほん)"]);
    expect(ruby("1本")).toEqual(["1本(いっぽん)"]);
    expect(ruby("3本")).toEqual(["3本(さんぼん)"]);
    expect(ruby("5本")).toEqual(["5本(ごほん)"]);
    expect(ruby("一本")).toEqual(["一本(いっぽん)"]);
    expect(ruby("二本")).toEqual(["二本(にほん)"]);
    expect(ruby("六本")).toEqual(["六本(ろっぽん)"]);
    expect(ruby("3匹")).toEqual(["3匹(さんびき)"]);
    expect(ruby("1匹")).toEqual(["1匹(いっぴき)"]);
    expect(ruby("3杯")).toEqual(["3杯(さんばい)"]);
    expect(ruby("1杯")).toEqual(["1杯(いっぱい)"]);
  });

  it("分は、数で「ふん/ぷん」に変わる。「十分」(じゅうぶん)は数え方にしない", () => {
    expect(ruby("3分")).toEqual(["3分(さんぷん)"]);
    expect(ruby("5分")).toEqual(["5分(ごふん)"]);
    expect(ruby("10分")).toEqual(["10分(じゅっぷん)"]);
    expect(ruby("1分")).toEqual(["1分(いっぷん)"]);
    expect(ruby("4分")).toEqual(["4分(よんぷん)"]);
    expect(ruby("十分な")).not.toContain("十分(じっぷん)");
    expect(ruby("5分の1")).toEqual(["5分(ごふん)"]);
  });

  it("階・回・個・冊・歳・頭 は、数で読みが変わる", () => {
    expect(ruby("2階")).toEqual(["2階(にかい)"]);
    expect(ruby("3階")).toEqual(["3階(さんがい)"]);
    expect(ruby("一回")).toEqual(["一回(いっかい)"]);
    expect(ruby("三回")).toEqual(["三回(さんかい)"]);
    expect(ruby("七回")).toEqual(["七回(ななかい)"]);
    expect(ruby("二冊")).toEqual(["二冊(にさつ)"]);
    expect(ruby("八頭")).toEqual(["八頭(はっとう)"]);
    expect(ruby("二十歳")).toEqual(["二十歳(はたち)"]);
    expect(ruby("三歳")).toEqual(["三歳(さんさい)"]);
    expect(ruby("一個")).toEqual(["一個(いっこ)"]);
  });

  it("数字の後に数え方がない文字は、これまでどおり(九州・四国・一般・一緒)", () => {
    expect(ruby("九州")).not.toContain("九(く)");
    expect(ruby("四国")).toEqual(["四国(しこく)"]);
    expect(ruby("一緒に")).toContain("一緒(いっしょ)");
  });
});

describe("自動ふりがな(本文に書かれた「漢字（読み）」は、読みをふりがなにして、括弧を消す)", () => {
  it("山脈（さんみゃく）→ 山脈に「さんみゃく」。括弧は出さない", () => {
    expect(tokenize("山脈（さんみゃく）は、一つだけの山")).toEqual([
      { text: "山脈", reading: "さんみゃく" },
      "は、",
      { text: "一つ", reading: "ひとつ" },
      "だけの",
      { text: "山", reading: "やま" },
    ]);
  });

  it("半角の括弧も同じ", () => {
    expect(tokenize("山脈(さんみゃく)")).toEqual([{ text: "山脈", reading: "さんみゃく" }]);
  });

  it("読みが「の」を含む名前は、「の」の前の漢字までふりがなにする(那智の滝・沖ノ鳥島)", () => {
    expect(tokenize("那智の滝（なちのたき）がある県は？")[0]).toEqual({ text: "那智の滝", reading: "なちのたき" });
    expect(tokenize("沖ノ鳥島（おきのとりしま）")).toEqual([{ text: "沖ノ鳥島", reading: "おきのとりしま" }]);
  });

  it("送りがな・ひらがなを含む語(加賀れんこん・有り難し)も、まとめて読む", () => {
    expect(tokenize("加賀れんこん（かがれんこん）で知られる県は？")[0]).toEqual({ text: "加賀れんこん", reading: "かがれんこん" });
    expect(tokenize("有り難し（ありがたし）")).toEqual([{ text: "有り難し", reading: "ありがたし" }]);
  });

  it("括弧の読みを、辞書の読みより優先する(松阪牛は、まつさかうし)", () => {
    expect(tokenize("松阪牛（まつさかうし）で知られる")[0]).toEqual({ text: "松阪牛", reading: "まつさかうし" });
  });

  it("「の」で前の語とつながる読みでないときは、漢字の1語だけ(東の京（みやこ）)", () => {
    expect(tokenize("「東の京（みやこ）」という意味").filter((s) => typeof s !== "string")).toContainEqual({ text: "京", reading: "みやこ" });
    expect(ruby("「東の京（みやこ）」という意味")).not.toContain("東の京(みやこ)");
  });

  it("読みが短すぎて合わない(佐渡島（さど）)ときは、括弧をそのまま出す", () => {
    expect(tokenize("佐渡島（さど）の金山").some((s) => typeof s === "string" && s.includes("（さど）"))).toBe(true);
  });

  it("漢字の語でないもの(Yes（そうです）・語呂（むさし）)は、そのまま", () => {
    expect(tokenize("Yes（そうです）")).toEqual(["Yes（そうです）"]);
    expect(tokenize("「武蔵国」の語呂（むさし）に通じる").some((s) => typeof s === "string" && s.includes("（むさし）"))).toBe(true);
  });
});

describe("数え方と、問題ごとの読み(readings)", () => {
  it("問題ごとの読みのほうが長い語のときは、数え方より、その読みを使う(八頭町は、やずちょう)", () => {
    expect(tokenize("八頭町", [], { 八頭町: "やずちょう" })).toEqual([{ text: "八頭町", reading: "やずちょう" }]);
  });

  it("辞書にない「二本松」は、にほん・まつ(数え方の読みで、結果として正しい)", () => {
    expect(tokenize("二本松").map((s) => (typeof s === "string" ? s : s.reading)).join("")).toBe("にほんまつ");
  });
});
