import { Fragment } from "react";

import { Furigana } from "@/components/app/furigana";
import furiganaDictionary from "@/lib/furigana-dictionary.json";

// JSONのキー順(挿入順)は文字数の長い語から並んでいる前提
// (frontend/src/lib/furigana-dictionary.json生成時に保証済み)。
// 長い語から先にマッチさせないと「日本語」が「日本」+「語」に
// 分割されてしまうなど、誤ったルビ分割になる。
const dictionaryEntries = Object.entries(
  furiganaDictionary as Record<string, string>,
);

type Segment = string | { text: string; reading: string };

function tokenize(text: string): Segment[] {
  const segments: Segment[] = [];
  let i = 0;

  outer: while (i < text.length) {
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
export function AutoFurigana({ text }: { text: string }) {
  const segments = tokenize(text);

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
