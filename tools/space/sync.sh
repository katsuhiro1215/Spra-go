#!/bin/sh
# 宇宙の問題の原稿(company/spra/spra-go/content/space)を、取り込み用に database/data/space へコピーする。
# コンテナから company/ は見えないので、コピーしてから space:import を実行する
set -e
SRC="${1:-../../company/spra/spra-go/content/space}"
DEST="$(dirname "$0")/../../database/data/space"

mkdir -p "$DEST"
cp "$SRC/questions.csv" "$SRC/pictures.csv" "$DEST/"

echo "コピーしました: $(wc -l < "$DEST/questions.csv" | tr -d ' ') 行の問題CSV、$(wc -l < "$DEST/pictures.csv" | tr -d ' ') 行の絵CSV"
