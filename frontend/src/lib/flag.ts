/**
 * 国のカード・一覧などの国旗の絵。ファイルは `public/flag/{国コードの小文字}.svg`。
 * 本番(Linux)はファイル名の大文字・小文字を区別するので、国コード(JP・GB など)は小文字にして呼ぶ。
 * 国コードでなく国名がコードに入っているデータ(Belgium・Georgia)は、2文字のコードのファイルへ読み替える
 */
const NAME_AS_CODE: Record<string, string> = { belgium: "be", georgia: "ge" };

export function flagSrc(code: string): string {
  const lower = code.toLowerCase();
  return `/flag/${NAME_AS_CODE[lower] ?? lower}.svg`;
}
