#!/usr/bin/env bash
#
# Spra Go の本番デプロイ(Lightsail 上で実行)。docs/ops/production-runbook.md 参照。
#   cd ~/Spra-go && scripts/deploy.sh            # 取り込み・ビルド・マイグレーション・再作成・確認
#   scripts/deploy.sh --no-pull                  # git pull を飛ばす(手元で直したとき)
#   scripts/deploy.sh --pull-base                # 土台のイメージ(php・node・caddy)を取り直し、キャッシュなしで作る(PHP・Node の更新のとき)
#   (--no-pull と --pull-base は、いっしょに付けてよい)
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

GIT_PULL=1
BUILD_ARGS=()
for arg in "$@"; do
  case "$arg" in
    --no-pull) GIT_PULL=0 ;;
    # 公式の php・node のイメージが更新されたとき(セキュリティの修正など)は、サーバーに残った古い土台を使わないようにする
    --pull-base) BUILD_ARGS=(--pull --no-cache) ;;
    *) echo "知らない引数です: $arg" >&2; exit 1 ;;
  esac
done

if [[ "$GIT_PULL" == "1" ]]; then
  git pull --ff-only
fi

# Tane(静的ファイル)。Tane のリポジトリを ~/tane に置いてあるときだけ、いっしょに作って配る(無ければ Spra Go だけ)。
# 場所を変えるときは TANE_SRC=<tane/frontend の絶対パス> を付けて実行する
SERVICES=(app caddy next)
UP_SERVICES=(app scheduler caddy next)
TANE_SRC="${TANE_SRC:-$REPO_DIR/../tane/frontend}"
if [[ -f "$TANE_SRC/package.json" ]]; then
  TANE_SRC="$(cd "$TANE_SRC" && pwd)"
  export TANE_SRC
  export COMPOSE_PROFILES=tane
  if [[ "$GIT_PULL" == "1" ]]; then
    git -C "$TANE_SRC/.." pull --ff-only
  fi
  SERVICES+=(tane)
  UP_SERVICES+=(tane)
  echo "Tane も配ります: $TANE_SRC"
fi

echo "== ビルド(1つずつ。メモリを食うので並列にしない) =="
for service in "${SERVICES[@]}"; do
  "${COMPOSE[@]}" build ${BUILD_ARGS[@]+"${BUILD_ARGS[@]}"} "$service"
done

echo "== データベースを起動してマイグレーション =="
"${COMPOSE[@]}" up -d mysql
"${COMPOSE[@]}" run --rm app php artisan migrate --force

echo "== 再作成 =="
"${COMPOSE[@]}" up -d --force-recreate "${UP_SERVICES[@]}"
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
