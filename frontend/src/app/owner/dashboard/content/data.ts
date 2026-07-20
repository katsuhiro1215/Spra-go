export type ContentType =
  | "単語"
  | "会話"
  | "文化"
  | "歴史"
  | "地理"
  | "国旗"
  | "世界遺産";

export type ContentItem = {
  id: string;
  title: string;
  type: ContentType;
  countryName: string;
};

export const contentItems: ContentItem[] = [
  { id: "1", title: "基本のあいさつ100選", type: "単語", countryName: "日本" },
  { id: "2", title: "カフェでの注文フレーズ", type: "会話", countryName: "フランス" },
  { id: "3", title: "闘牛とフラメンコ", type: "文化", countryName: "スペイン" },
  { id: "4", title: "ルネサンス期の歴史", type: "歴史", countryName: "イタリア" },
  { id: "5", title: "リアス式海岸の地理", type: "地理", countryName: "ポルトガル" },
  { id: "6", title: "国旗の由来", type: "国旗", countryName: "インドネシア" },
  { id: "7", title: "アユタヤ遺跡", type: "世界遺産", countryName: "タイ" },
];
