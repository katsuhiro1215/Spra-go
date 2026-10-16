import { Fragment } from "react";

import { Furigana } from "@/components/app/furigana";
import furiganaDictionary from "@/lib/furigana-dictionary.json";
import generatedDictionary from "@/lib/furigana-generated.json";

import { counterAt } from "./counter-reading";

// 辞書 = 形態素解析で作った辞書(furigana-generated.json。tools/furigana/build_generated.py)に、
// 手で直した辞書(furigana-dictionary.json)を上書きしたもの。同じ語は手の辞書が勝つ。
// 長い語から先にマッチさせないと「日本語」が「日本」+「語」に分割されてしまうなど、
// 誤ったルビ分割になるので、長い語が先。最初の1文字ごとの索引を作り、全語を順に調べない
const merged: Record<string, string> = {
  ...(generatedDictionary as Record<string, string>),
  ...(furiganaDictionary as Record<string, string>),
};
const dictionaryIndex = new Map<string, [string, string][]>();
for (const entry of Object.entries(merged).sort((a, b) => b[0].length - a[0].length)) {
  const list = dictionaryIndex.get(entry[0][0]);
  if (list) list.push(entry);
  else dictionaryIndex.set(entry[0][0], [entry]);
}

type Segment = string | { text: string; reading: string };

const KANJI = /[一-龥々ヶ〆]/;
const KANA = /[ぁ-ゖァ-ヶー]/;
/** 読みを括弧に書いても、その読みを使わない語(「武蔵」の語呂を、語呂の読みと取りちがえる) */
const PAREN_SKIP = new Set(["語呂"]);

const toHiragana = (text: string) => text.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));

/**
 * 本文の「漢字（よみ）」を、読みをふりがなにして括弧は出さない形にする(山脈（さんみゃく）→ 山脈に「さんみゃく」)。
 * ふりがなを付けると、読みが二重に出てしまうため。text の i 文字目が、漢字で始まる語の先頭のときだけ見る。
 * 語は、漢字とかなの並びで、漢字で始まる。かなの部分は読みと同じ文字、漢字の部分は1文字以上の読みに当たるときだけ合う
 * (「那智の滝（なちのたき）」「加賀れんこん（かがれんこん）」)。合わなければ null で、括弧はそのまま出す
 */
export function parenthesizedReadingAt(text: string, i: number): { length: number; text: string; reading: string } | null {
  // 漢字のまとまりの先頭だけ(「語呂（むさし）」の「呂」から始めない)
  if (!KANJI.test(text[i]) || KANJI.test(text[i - 1] ?? "")) return null;
  // 語の終わり(括弧の始まり)を探す。漢字とかなが続く間だけ
  let end = i;
  while (end < text.length && end - i < 16 && (KANJI.test(text[end]) || KANA.test(text[end]))) end++;
  const open = text[end];
  if (open !== "（" && open !== "(") return null;
  const close = text.indexOf(open === "（" ? "）" : ")", end + 1);
  if (close < 0) return null;
  const reading = text.slice(end + 1, close);
  const word = text.slice(i, end);
  if (!/^[ぁ-ゖー・]+$/.test(reading) || PAREN_SKIP.has(word)) return null;

  const kanjiCount = [...word].filter((c) => KANJI.test(c)).length;
  if (reading.length < kanjiCount) return null;
  const pattern = [...word]
    .map((c) => (KANJI.test(c) ? "[ぁ-ゖー・]+?" : toHiragana(c).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
    .join("");
  if (!new RegExp(`^${pattern}$`).test(reading)) return null;

  return { length: close + 1 - i, text: word, reading };
}

/**
 * 辞書の最長一致で、ふりがなを付ける語と、そのままの文字に分ける(テストでも使う)。
 * plain に入れた語(難読地名の問題の、問われる漢字)は、辞書にあっても、ふりがなを付けずにそのまま出す。
 * readings は、その問題だけの読み(地名など。同じ名前でも県で読みが違うので、辞書でなく問題に持たせる)。
 * 辞書の語と readings の語が同じ位置で当たるときは、長いほうを使う(同じ長さなら readings)
 */
export function tokenize(text: string, plain: string[] = [], readings: Record<string, string> = {}): Segment[] {
  const readingWords = Object.keys(readings).sort((a, b) => b.length - a.length);
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
    // 本文に書かれた「漢字（よみ）」は、読みをふりがなにして括弧を消す
    const parenthesized = parenthesizedReadingAt(text, i);
    if (parenthesized) {
      segments.push({ text: parenthesized.text, reading: parenthesized.reading });
      i += parenthesized.length;
      continue;
    }
    // 数字の後の数え方(7日=なのか、5人=ごにん、一つ=ひとつ、13本=じゅうさんぼん)は、数によって読みが変わるので、
    // 1文字の辞書より先に見る。ただし、問題ごとの読み・辞書に、もっと長い語があれば、そちら
    // (八頭町=やずちょう、八つ橋=やつはし、三日月=みかづき)。同じ長さなら、数え方 → 問題ごとの読み → 辞書の順。
    // 数の途中(「17日」の「7」、「二十三日」の「三」)から始めないよう、前の文字が数のときは見ない
    const entry = dictionaryIndex.get(text[i])?.find(([word]) => text.startsWith(word, i));
    const ownWord = readingWords.find((word) => word !== "" && text.startsWith(word, i));
    const counter = /[\d一二三四五六七八九十百千万]/.test(text[i - 1] ?? "") ? null : counterAt(text, i);
    const longest = Math.max(counter?.length ?? 0, ownWord?.length ?? 0, entry?.[0].length ?? 0);
    if (counter && counter.length === longest) {
      segments.push({ text: text.slice(i, i + counter.length), reading: counter.reading });
      i += counter.length;
      continue;
    }
    if (ownWord && ownWord.length === longest) {
      segments.push({ text: ownWord, reading: readings[ownWord] });
      i += ownWord.length;
      continue outer;
    }
    if (entry) {
      segments.push({ text: entry[0], reading: entry[1] });
      i += entry[0].length;
      continue outer;
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
export function AutoFurigana({ text, plain, readings }: { text: string; plain?: string[]; readings?: Record<string, string> }) {
  const segments = tokenize(text, plain, readings);

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
