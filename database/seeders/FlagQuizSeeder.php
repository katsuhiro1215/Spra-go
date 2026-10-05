<?php

namespace Database\Seeders;

use App\Support\FlagQuiz\FlagCatalog;
use App\Support\FlagQuiz\FlagQuizPlanner;
use App\Support\FlagQuiz\FlagQuizWriter;
use Illuminate\Database\Seeder;

/** 国旗クイズ(docs/design/2026-10-05-flag-quiz-design.md)。何度実行しても重複しない */
class FlagQuizSeeder extends Seeder
{
    public function run(): void
    {
        $result = FlagQuizWriter::write(FlagQuizPlanner::plan(FlagCatalog::all()));

        $this->command?->info("国旗クイズ: コース{$result['courses']}・ステージ{$result['stages']}・問題{$result['questions']}");
    }
}
