/**
 * 漢字にふりがな(ルビ)を付けるコンポーネント。ネイティブの<ruby>/<rt>タグを使うため
 * 追加依存なし・スクリーンリーダーにも自然に読み上げられる。
 * 表示/非表示はAccessibilityProviderが<html data-furigana="on|off">を切り替え、
 * globals.cssのCSSルールで一括制御する(このコンポーネント自体はDOM構造のみ担当)。
 * data-rt は、ボタンの中でふりがなを文字の上に浮かせるときに、CSSが読む(ボタンの中のふりがなの説明は globals.css)。
 */
export function Furigana({
  text,
  reading,
}: {
  text: string;
  reading: string;
}) {
  return (
    <ruby data-rt={reading}>
      {text}
      <rt>{reading}</rt>
    </ruby>
  );
}
