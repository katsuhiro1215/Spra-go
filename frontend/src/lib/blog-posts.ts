export type BlogBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "list"; items: string[] };

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string; // YYYY-MM-DD
  countryCode?: string; // /world/[code] への誘導リンク用
  body: BlogBlock[];
};

/**
 * ブログ記事はコンテンツ制作担当がクイズ原稿(docs/content/drafts/)のために
 * 調査した内容を再利用して作成する(docs/company/MarketingPlan.mdの方針)。
 * 事実は元のクイズ原稿と同じ調査に基づく。
 */
export const blogPosts: BlogPost[] = [
  {
    slug: "similar-flags",
    title: "似ている国旗を見分けるコツ",
    description:
      "日章旗とパラオ・バングラデシュの国旗、フランスとイタリアの国旗——似ている国旗を見分けるポイントをSpraGoのクイズ原稿の調査から紹介します。",
    publishedAt: "2026-07-29",
    countryCode: "jp",
    body: [
      {
        type: "paragraph",
        text: "世界には200近い国旗がありますが、実はよく似たデザインの国旗がいくつも存在します。今回はSpraGoのクイズ原稿を作る過程で調べた中から、特に間違えやすい組み合わせを紹介します。",
      },
      { type: "heading", text: "日本・パラオ・バングラデシュ" },
      {
        type: "paragraph",
        text: "日本の「日章旗」は白地に赤い丸というシンプルなデザインですが、同じく丸を配置した国旗が他にもあります。",
      },
      {
        type: "list",
        items: [
          "日本: 白地に赤い丸（丸は旗の中央、直径は旗の縦の5分の3）",
          "パラオ: 水色地に黄色の丸（丸はやや旗竿寄り）",
          "バングラデシュ: 緑地に赤い丸（丸はやや旗竿寄り）",
        ],
      },
      {
        type: "paragraph",
        text: "地色と丸の色の組み合わせを覚えておけば、この3つはすぐに見分けられます。",
      },
      { type: "heading", text: "フランス・イタリア" },
      {
        type: "paragraph",
        text: "縦じまの三色旗もよく混同されます。フランスの国旗（トリコロール）は旗竿側から青・白・赤の順ですが、イタリアの国旗は緑・白・赤の順です。色そのものが違うので、色の名前で覚えるのが確実です。",
      },
      {
        type: "paragraph",
        text: "こうした国旗の豆知識は、SpraGoの「国旗→国名」「国名→国旗」クイズでも実際に出題しています。気になった方はぜひ挑戦してみてください。",
      },
    ],
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug);
}
