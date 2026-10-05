import { Fragment } from "react";

import { Furigana } from "@/components/app/furigana";
import furiganaDictionary from "@/lib/furigana-dictionary.json";

import { counterAt } from "./counter-reading";

// JSONのキー順(挿入順)は文字数の長い語から並んでいる前提
// (frontend/src/lib/furigana-dictionary.json生成時に保証済み)。
// 長い語から先にマッチさせないと「日本語」が「日本」+「語」に
// 分割されてしまうなど、誤ったルビ分割になる。
const dictionaryEntries = Object.entries(
  furiganaDictionary as Record<string, string>,
);

type Segment = string | { text: string; reading: string };

/**
 * 辞書の最長一致で、ふりがなを付ける語と、そのままの文字に分ける(テストでも使う)。
 * plain に入れた語(難読地名の問題の、問われる漢字)は、辞書にあっても、ふりがなを付けずにそのまま出す
 */
export function tokenize(text: string, plain: string[] = []): Segment[] {
  const segments: Segment[] = [];
  let i = 0;

  outer: while (i < text.length) {
    const plainWord = plain.find((word) => word !== "" && text.startsWith(word, i));
    if (plainWord) {
      const last = segments[segments.length - 1];
      if (typeof last === "string") {
        segments[segments.length - 1] = last + plainWord;
      } else {
        segments.push(plainWord);
      }
      i += plainWord.length;
      continue;
    }
    // 数字の後の「日」「人」は、数によって読みが変わるので辞書より先に見る(7日=なのか、5人=ごにん)。
    // 数字の途中(「17日」の「7」)から始めないよう、前の文字が数字のときは見ない
    const counter = /\d/.test(text[i - 1] ?? "") ? null : counterAt(text, i);
    if (counter) {
      segments.push({ text: text.slice(i, i + counter.length), reading: counter.reading });
      i += counter.length;
      continue;
    }
    for (const [word, reading] of dictionaryEntries) {
      if (text.startsWith(word, i)) {
        segments.push({ text: word, reading });
        i += word.length;
        continue outer;
      }
    }

    const last = segments[segments.length - 1];
    if (typeof last === "string") {
      segments[segments.length - 1] = last + text[i];
    } else {
      segments.push(text[i]);
    }
    i += 1;
  }

  return segments;
}

/**
 * 動的なクイズ本文(DBから取得したテキスト)に、辞書ベースで自動的にふりがなを
 * 付けるコンポーネント。728問すべてに手作業で注釈するのではなく、
 * frontend/src/lib/furigana-dictionary.json(コンテンツ制作担当が作成)の
 * 用語辞書を使い、表示側で変換する(元のprompt/choiceテキストは一切変更しない)。
 * 表示/非表示の切り替え自体はFuriganaコンポーネント側(CSSの data-furigana)が担う。
 */
export function AutoFurigana({ text, plain }: { text: string; plain?: string[] }) {
  const segments = tokenize(text, plain);

  return (
    <>
      {segments.map((segment, index) =>
        typeof segment === "string" ? (
          <Fragment key={index}>{segment}</Fragment>
        ) : (
          <Furigana key={index} text={segment.text} reading={segment.reading} />
        ),
      )}
    </>
  );
}
