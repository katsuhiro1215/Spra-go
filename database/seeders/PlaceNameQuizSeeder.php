<?php

namespace Database\Seeders;

use App\Support\FlagQuiz\FlagQuizWriter;
use App\Support\Prefecture\PlaceNameQuizPlanner;
use App\Support\Prefecture\PrefectureCatalog;
use Illuminate\Database\Seeder;

/** 県ごとの地名コース(docs/design/2026-10-06-prefecture-master-design.md)。何度実行しても重複しない */
class PlaceNameQuizSeeder extends Seeder
{
    public function run(): void
    {
        $result = FlagQuizWriter::writeTree(PrefectureQuizSeeder::ROOT_NAME, PlaceNameQuizPlanner::plan(PrefectureCatalog::all()));

        $this->command?->info("地名コース: コース{$result['courses']}・ステージ{$result['stages']}・問題{$result['questions']}");
    }
}
