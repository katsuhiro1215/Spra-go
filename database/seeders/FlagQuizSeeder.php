<?php

namespace Database\Seeders;

use App\Support\FlagQuiz\FlagCatalog;
use App\Support\FlagQuiz\FlagCatchPlanner;
use App\Support\FlagQuiz\FlagQuizPlanner;
use App\Support\FlagQuiz\FlagQuizWriter;
use Illuminate\Database\Seeder;

/** 国旗クイズ(docs/design/2026-10-05-flag-quiz-design.md)。何度実行しても重複しない */
class FlagQuizSeeder extends Seeder
{
    public function run(): void
    {
        $catalog = FlagCatalog::all();
        $quiz = FlagQuizWriter::write(FlagQuizPlanner::plan($catalog));
        $catch = FlagQuizWriter::writeCatch(FlagCatchPlanner::plan($catalog));

        $this->command?->info("国旗クイズ: コース{$quiz['courses']}・ステージ{$quiz['stages']}・問題{$quiz['questions']}");
        $this->command?->info("国旗キャッチ: クイズ{$catch['quizzes']}・問題{$catch['questions']}");
    }
}
