#!/bin/sh
# 英語の原稿(company/spra/spra-go/content/english)を、取り込み用に database/data/english へコピーする。
# 旧版(sentences/levels/11-30-elementary)は使わない。コンテナから company/ は見えないので、コピーしてから english:import を実行する
set -e
SRC="${1:-../../company/spra/spra-go/content/english}"
DEST="$(dirname "$0")/../../database/data/english"

rm -rf "$DEST"
mkdir -p "$DEST/words" "$DEST/sentences" "$DEST/word-details"

for dir in "$SRC"/words/levels/*/; do
  name=$(basename "$dir")
  cp "$dir/questions.csv" "$DEST/words/$name.csv"
done

for dir in "$SRC"/sentences/levels/*/; do
  name=$(basename "$dir")
  [ "$name" = "11-30-elementary" ] && continue
  cp "$dir/questions.csv" "$DEST/sentences/$name.csv"
done

# 単語の内容の原稿(発音記号・例文など)。あるときだけ
if [ -d "$SRC/words/details" ]; then
  cp "$SRC"/words/details/*.csv "$DEST/word-details/" 2>/dev/null || true
fi

echo "コピーしました: $(ls "$DEST/words" | wc -l | tr -d ' ') 個の単語CSV、$(ls "$DEST/sentences" | wc -l | tr -d ' ') 個の文章CSV"
