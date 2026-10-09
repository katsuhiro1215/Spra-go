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
