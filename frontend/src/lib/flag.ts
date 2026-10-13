/**
 * 国のカード・一覧などの国旗の絵。ファイルは `public/flag/{国コードの小文字}.svg`。
 * 本番(Linux)はファイル名の大文字・小文字を区別するので、国コード(JP・GB など)は小文字にして呼ぶ
 */
export function flagSrc(code: string): string {
  return `/flag/${code.toLowerCase()}.svg`;
}
