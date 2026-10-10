#!/usr/bin/env bash
#
# バックアップから戻す「復元の練習」用。本番のDBは上書きせず、別のデータベースに戻す。
#   scripts/restore-db.sh ~/db-backups/spra-go/spra-go-db-XXXX.sql.gz [戻し先のデータベース名]
# 戻し先を省略すると spra_go_restore_check。戻したあと、テーブル数と利用者数を表示する。
# 本番のデータベースに戻すとき(障害のとき)だけ、第2引数に本番のDB名を明示する。

set -euo pipefail

FILE="${1:?バックアップのファイル(.sql.gz)を指定してください}"
TARGET="${2:-spra_go_restore_check}"

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"
COMPOSE=(docker compose --env-file .env.production -f compose.prod.yaml)

PROD_DB="$(grep -E '^DB_DATABASE=' .env.production | cut -d= -f2-)"
if [[ "$TARGET" == "$PROD_DB" ]]; then
  read -r -p "本番のデータベース($PROD_DB)を上書きします。よければ 'yes' と入力: " answer
  [[ "$answer" == "yes" ]] || { echo "中止しました。"; exit 1; }
fi

"${COMPOSE[@]}" exec -T spra-go-mysql sh -c \
  "mysql -uroot -p\"\$MYSQL_ROOT_PASSWORD\" -e 'CREATE DATABASE IF NOT EXISTS \`$TARGET\` CHARACTER SET utf8mb4;'"
gzip -dc "$FILE" | "${COMPOSE[@]}" exec -T spra-go-mysql sh -c \
  "mysql -uroot -p\"\$MYSQL_ROOT_PASSWORD\" \"$TARGET\""

echo "== 戻した結果($TARGET) =="
"${COMPOSE[@]}" exec -T spra-go-mysql sh -c \
  "mysql -uroot -p\"\$MYSQL_ROOT_PASSWORD\" \"$TARGET\" -e 'SELECT COUNT(*) AS tables_count FROM information_schema.tables WHERE table_schema=DATABASE(); SELECT COUNT(*) AS users FROM users;'"
