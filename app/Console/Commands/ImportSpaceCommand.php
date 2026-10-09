<?php

namespace App\Console\Commands;

use App\Support\FlagQuiz\FlagQuizWriter;
use App\Support\Space\SpaceCatalog;
use App\Support\Space\SpaceQuizPlanner;
use Illuminate\Console\Command;

/**
 * 宇宙の問題(CSV)を、「宇宙」クイズとして取り込む(docs/design/2026-10-09-space-quiz-design.md 5章)。
 * 先に tools/space/sync.sh で、原稿を database/data/space へコピーする。何度流しても重複しない。
 * 絵が届いていない絵の問題は外す(絵を frontend/public/space/ に置いて、もう一度流すと増える)
 */
class ImportSpaceCommand extends Command
{
    protected $signature = 'space:import {--path=database/data/space : 原稿のフォルダ} {--images=frontend/public/space : 絵のフォルダ} {--dry-run : 検証と件数だけ見て、書かない}';

    protected $description = '宇宙の問題の原稿を検証し、「宇宙」クイズとして取り込む';

    public function handle(): int
    {
        $catalog = SpaceCatalog::load($this->absolute($this->option('path')));

        if ($catalog['errors'] !== []) {
            $this->error('原稿の検証に失敗しました（何も書いていません）:');
            foreach ($catalog['errors'] as $error) {
                $this->line(" - {$error}");
            }

            return self::FAILURE;
        }

        $plan = SpaceQuizPlanner::plan($catalog['questions'], $catalog['pictures'], $this->availableImages());
        $stages = array_sum(array_map(fn (array $level) => count($level['stages']), $plan['nodes'][0]['levels']));
        $questions = count($catalog['questions']) - count($plan['skipped']);

        if ($this->option('dry-run')) {
            $this->comment("--dry-run のため書き込みません。ステージ{$stages}・問題{$questions}（絵が無くて外す問題: ".count($plan['skipped']).'）');

            return self::SUCCESS;
        }

        $result = FlagQuizWriter::writeTree(SpaceQuizPlanner::ROOT_NAME, $plan['nodes']);

        $this->info("取り込みました: コース{$result['courses']}・ステージ{$result['stages']}・問題{$result['questions']}");
        if ($plan['skipped'] !== []) {
            $this->warn('絵が無くて外した問題: '.count($plan['skipped']).'問（'.implode('、', $plan['skipped']).'）');
        }

        return self::SUCCESS;
    }

    /** @return list<string> 絵が届いているキー(ファイル名から .webp を除いたもの) */
    private function availableImages(): array
    {
        $dir = $this->absolute($this->option('images'));
        if (! is_dir($dir)) {
            return [];
        }

        return array_values(array_map(fn (string $file) => basename($file, '.webp'), glob("{$dir}/*.webp") ?: []));
    }

    private function absolute(string $path): string
    {
        return str_starts_with($path, '/') ? $path : base_path($path);
    }
}
