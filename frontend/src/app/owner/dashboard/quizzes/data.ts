export type Difficulty = "初級" | "中級" | "上級";

export type Quiz = {
  id: string;
  title: string;
  countryCode: string;
  countryName: string;
  difficulty: Difficulty;
  questionCount: number;
};

export const quizzes: Quiz[] = [
  {
    id: "1",
    title: "あいさつを覚えよう",
    countryCode: "jp",
    countryName: "日本",
    difficulty: "初級",
    questionCount: 10,
  },
  {
    id: "2",
    title: "首都当てクイズ",
    countryCode: "fr",
    countryName: "フランス",
    difficulty: "初級",
    questionCount: 8,
  },
  {
    id: "3",
    title: "レストランでの会話",
    countryCode: "es",
    countryName: "スペイン",
    difficulty: "中級",
    questionCount: 12,
  },
  {
    id: "4",
    title: "歴史クイズ:ルネサンス",
    countryCode: "it",
    countryName: "イタリア",
    difficulty: "上級",
    questionCount: 15,
  },
  {
    id: "5",
    title: "屋台グルメ単語帳",
    countryCode: "th",
    countryName: "タイ",
    difficulty: "初級",
    questionCount: 10,
  },
];
