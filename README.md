# Spra Go（スプラ・ゴー）

> **現在: β版**（招待制の限定公開・無料）  
> https://go.spra.jp

世界を冒険しながら、国旗・言語・地理・文化を楽しく学ぶ、子ども向けのクイズゲーム（PWA）。運営は「かつコード」。

## 公開の段階

| 段階 | 内容 | 状態 |
|---|---|---|
| **β版** | 招待制の限定公開。課金なし（コイン購入はOFF）。知人・家族・親戚の子どもなどに触ってもらう | **今ここ**（2026-10-13〜） |
| α版 | Stripe による課金を始める（申請・審査のあと） | 未着手 |
| 正式リリース | 問題がなければ、一般に公開 | 未着手 |
| ネイティブアプリ | 正式リリースで広がったら、React Native などでスマホアプリへ | 未着手 |

## 構成

- フロントエンド: Next.js（`frontend/`）／ React ／ TypeScript ／ Tailwind CSS
- バックエンド: Laravel（PHP）／ MySQL ／ Pest
- 本番: AWS Lightsail（東京）＋ Docker Compose（Caddy・app・next・scheduler・mysql）
- 国旗の画像: [Flagpack](https://github.com/Yummygum/flagpack-core)（MIT。`frontend/public/flag/LICENSE-flagpack.txt`）

## ドキュメント

- 仕様と実装状況: [`SPEC.md`](SPEC.md)
- 実行タスク: [`TASKS.md`](TASKS.md)
- 本番の運用手順: [`docs/ops/production-runbook.md`](docs/ops/production-runbook.md)
- 設計書: [`docs/design/`](docs/design/)
- 法務の下書き: [`docs/legal/`](docs/legal/)

## 開発

Laravel Sail で動かす。

```bash
./vendor/bin/sail up -d
./vendor/bin/sail artisan migrate --seed
cd frontend && npm install && npm run dev   # http://localhost:3000
```

テスト: `./vendor/bin/sail test`（Pest）／ `cd frontend && npx vitest run && npx tsc --noEmit`
