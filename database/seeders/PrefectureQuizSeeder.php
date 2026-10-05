<?php

namespace Database\Seeders;

use App\Support\FlagQuiz\FlagQuizWriter;
use App\Support\Prefecture\PrefectureCatalog;
use App\Support\Prefecture\PrefectureQuizPlanner;
use Illuminate\Database\Seeder;

/** 都道府県クイズ(docs/design/2026-10-05-prefecture-quiz-design.md)。何度実行しても重複しない */
class PrefectureQuizSeeder extends Seeder
{
    public const ROOT_NAME = '都道府県クイズ';

    public function run(): void
    {
        $result = FlagQuizWriter::writeTree(self::ROOT_NAME, PrefectureQuizPlanner::plan(PrefectureCatalog::all()));

        $this->command?->info("都道府県クイズ: コース{$result['courses']}・ステージ{$result['stages']}・問題{$result['questions']}");
    }
}
