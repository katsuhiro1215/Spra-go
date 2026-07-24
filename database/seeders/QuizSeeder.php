<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Country;
use App\Models\Quiz;
use Illuminate\Database\Seeder;

class QuizSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $quizzes = [
            [
                'title' => 'あいさつを覚えよう',
                'difficulty' => '初級',
                'country_code' => 'jp',
                'is_published' => true,
                'categories' => ['国旗'],
            ],
            [
                'title' => '首都当てクイズ',
                'difficulty' => '初級',
                'country_code' => 'fr',
                'is_published' => true,
                'categories' => ['国旗', '世界地図'],
            ],
            [
                'title' => 'レストランでの会話',
                'difficulty' => '中級',
                'country_code' => 'es',
                'is_published' => false,
                'categories' => ['国旗', '食べ物'],
            ],
            [
                'title' => '歴史クイズ:ルネサンス',
                'difficulty' => '上級',
                'country_code' => 'it',
                'is_published' => false,
                'categories' => ['国旗', '歴史'],
            ],
            [
                'title' => '屋台グルメ単語帳',
                'difficulty' => '初級',
                'country_code' => 'th',
                'is_published' => false,
                'categories' => ['国旗', '食べ物'],
            ],
        ];

        foreach ($quizzes as $quizData) {
            $quiz = Quiz::query()->updateOrCreate(
                ['title' => $quizData['title']],
                [
                    'difficulty' => $quizData['difficulty'],
                    'country_id' => Country::query()->where('code', $quizData['country_code'])->value('id'),
                    'is_published' => $quizData['is_published'],
                ]
            );

            $categoryIds = Category::query()
                ->whereIn('name', $quizData['categories'])
                ->whereNull('parent_id')
                ->pluck('id');
            $quiz->categories()->sync($categoryIds);
        }
    }
}
