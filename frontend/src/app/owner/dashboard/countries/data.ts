export type Country = {
  code: string;
  name: string;
  language: string;
  stages: number;
};

export const countries: Country[] = [
  { code: "jp", name: "日本", language: "日本語", stages: 12 },
  { code: "us", name: "アメリカ", language: "英語", stages: 20 },
  { code: "fr", name: "フランス", language: "フランス語", stages: 8 },
  { code: "es", name: "スペイン", language: "スペイン語", stages: 10 },
  { code: "it", name: "イタリア", language: "イタリア語", stages: 6 },
  { code: "pt", name: "ポルトガル", language: "ポルトガル語", stages: 4 },
  { code: "id", name: "インドネシア", language: "インドネシア語", stages: 3 },
  { code: "th", name: "タイ", language: "タイ語", stages: 5 },
];
