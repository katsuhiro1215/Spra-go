#!/usr/bin/env bash
#
# Spra Go の本番デプロイ(Lightsail 上で実行)。docs/ops/production-runbook.md 参照。
#   cd ~/Spra-go && scripts/deploy.sh            # 取り込み・ビルド・マイグレーション・再作成・確認
#   scripts/deploy.sh --no-pull                  # git pull を飛ばす(手元で直したとき)
#
# 失敗したらそこで止まる(set -e)。ビルドのメモリが足りないときは、先にスワップを足す(runbook 3章)。

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

ENV_FILE=".env.production"
COMPOSE=(docker compose --env-file "$ENV_FILE" -f compose.prod.yaml)
HEALTH_URL="${HEALTH_URL:-https://api.go.spra.jp/up}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "$ENV_FILE がありません。.env.production.example をコピーして埋めてください。" >&2
  exit 1
fi
if grep -Eq '^(APP_KEY|DB_PASSWORD)=$' "$ENV_FILE"; then
  echo "$ENV_FILE の APP_KEY または DB_PASSWORD が空です。" >&2
  exit 1
fi

if [[ "${1:-}" != "--no-pull" ]]; then
  git pull --ff-only
fi

echo "== ビルド(1つずつ。メモリを食うので並列にしない) =="
for service in app spra-go-web spra-go-next; do
  "${COMPOSE[@]}" build "$service"
done

echo "== データベースを起動してマイグレーション =="
"${COMPOSE[@]}" up -d spra-go-mysql
"${COMPOSE[@]}" run --rm app php artisan migrate --force

echo "== 再作成 =="
"${COMPOSE[@]}" up -d --force-recreate app scheduler spra-go-web spra-go-next
"${COMPOSE[@]}" exec -T app php artisan optimize

echo "== 確認 =="
sleep 5
for i in 1 2 3 4 5 6; do
  if curl -fsS -o /dev/null "$HEALTH_URL"; then
    echo "OK: $HEALTH_URL"
    exit 0
  fi
  sleep 5
done
echo "NG: $HEALTH_URL が返事をしません。docker compose logs を確認してください。" >&2
exit 1
