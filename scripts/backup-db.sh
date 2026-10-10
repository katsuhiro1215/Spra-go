#!/usr/bin/env bash
#
# Spra Go 本番DBの毎日のバックアップ(本体の scripts/backup-db.sh と同じ方式)。
# mysqldump → gzip → ~/db-backups/spra-go。14日分を保持する(子どものデータなので、本体の7日より長く)。
#
# cron(日本時間 3:30。サーバーの時刻がUTCなら 18:30):
#   30 18 * * * /home/ubuntu/Spra-go/scripts/backup-db.sh >> /home/ubuntu/db-backups/spra-go/backup.log 2>&1

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$HOME/db-backups/spra-go}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

mkdir -p "$BACKUP_DIR"
cd "$REPO_DIR"

DEST="$BACKUP_DIR/spra-go-db-$(date +%Y%m%d-%H%M%S).sql.gz"

docker compose --env-file .env.production -f compose.prod.yaml exec -T spra-go-mysql sh -c \
  'exec mysqldump --single-transaction --no-tablespaces -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' \
  | gzip > "$DEST"

# 空のダンプ(失敗)を残さない
if [[ ! -s "$DEST" ]] || [[ "$(gzip -dc "$DEST" | wc -c)" -lt 1000 ]]; then
  rm -f "$DEST"
  echo "$(date '+%F %T') Backup FAILED (empty dump)" >&2
  exit 1
fi

find "$BACKUP_DIR" -name 'spra-go-db-*.sql.gz' -mtime "+${RETENTION_DAYS}" -delete

echo "$(date '+%F %T') Backup created: $DEST"
