<?php

namespace App\Console\Commands;

use App\Support\Language\EnglishCourseImporter;
use Illuminate\Console\Command;

/** 英語コースを、原稿のCSVから作る(docs/design/2026-10-07-english-levels-design.md 4-1)。course:build は英語を並べ直さない */
class ImportEnglishCommand extends Command
{
    protected $signature = 'english:import {--path= : 原稿のフォルダ(既定: database/data/english)} {--fresh : 今の英語コースを消してから作る} {--force : 消す前の確認を省く}';

    protected $description = '英語のコース(級ごとの問題と10ステージ)を、原稿のCSVから作る';

    public function handle(): int
    {
        $path = $this->option('path') ?: base_path('database/data/english');
        if (! is_dir("{$path}/words")) {
            $this->error("原稿のフォルダが見つかりません: {$path}/words");

            return self::FAILURE;
        }

        $titles = [];
        if (EnglishCourseImporter::hasOldContent()) {
            if (! $this->option('fresh')) {
                $this->error('古い英語コースがあります。置き換えるには --fresh を付けてください(英語コースの問題・進み具合・覚え具合が消えます)。');

                return self::FAILURE;
            }
            if (! $this->option('force') && ! $this->confirm('今の英語コースの問題・進み具合・覚え具合を消して、作り直します。よろしいですか？')) {
                return self::FAILURE;
            }
            $titles = EnglishCourseImporter::wipe();
        } elseif ($this->option('fresh')) {
            $titles = EnglishCourseImporter::wipe();
        }

        $result = EnglishCourseImporter::import($path, $titles);
        $this->info("英語コース: 問題{$result['questions']}・ステージ{$result['stages']}・単語の内容{$result['details']['applied']}語");
        foreach ($result['details']['problems'] as $problem) {
            $this->warn($problem);
        }

        return self::SUCCESS;
    }
}
