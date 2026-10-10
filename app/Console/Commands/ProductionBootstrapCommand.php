<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

/**
 * 本番の初回に、中身(国・問題・ステージ・英語・宇宙・地名など)を決まった順に入れる
 * (docs/design/2026-10-10-production-env-design.md 11章)。手元の予行演習で、開発のDBとほぼ同じ件数になることを確かめた順番。
 * - 試験用のOwner・Admin・利用者は作らない(ProductionSeeder)。Ownerは owner:create で作る
 * - 何度流しても同じ(取り込みは、問題の文言や meta のキーで既存を見つけて更新する)。本番で内容を足したあとに流しても壊れない
 * - 古い英語の原稿(*_english_*.json)は入れない。英語は english:import の新しいコース
 */
class ProductionBootstrapCommand extends Command
{
    protected $signature = 'production:bootstrap {--drafts= : 国のクイズ原稿のフォルダ(既定: docs/content/drafts)}';

    protected $description = '本番の初回に、中身(国・問題・ステージ・英語・宇宙・地名など)を決まった順に入れる(試験用アカウントは作らない)';

    public function handle(): int
    {
        $drafts = (string) ($this->option('drafts') ?: base_path('docs/content/drafts'));
        $files = collect(glob("{$drafts}/*.json") ?: [])
            ->reject(fn (string $file) => str_contains(basename($file), '_english_'))
            ->sort()->values();
        if ($files->isEmpty()) {
            $this->error("国のクイズ原稿が見つかりません: {$drafts}");

            return self::FAILURE;
        }

        $steps = [
            ['中身のシーダー', 'db:seed', ['--class' => 'ProductionSeeder', '--force' => true]],
            ...$files->map(fn (string $file) => ['国のクイズ '.basename($file), 'content:import', ['file' => $file]])->all(),
            ['英語のコース', 'english:import', []],
            ['宇宙のクイズ', 'space:import', []],
            ['地名のクイズ', 'db:seed', ['--class' => 'PlaceNameQuizSeeder', '--force' => true]],
            ['コースの並べ直し', 'course:build', []],
            ['町の整合', 'world:repair', []],
        ];

        foreach ($steps as $index => [$label, $command, $arguments]) {
            $this->line(sprintf('[%d/%d] %s', $index + 1, count($steps), $label));
            if ($this->callSilently($command, $arguments) !== self::SUCCESS) {
                $this->error("失敗しました: {$label}（{$command}）。ここで止めます。直してから、もう一度流してください（何度流しても同じです）。");

                return self::FAILURE;
            }
        }

        $this->info('中身を入れました。つぎは owner:create でOwnerを作り、公開設定で招待コードを入れます。');

        return self::SUCCESS;
    }
}
