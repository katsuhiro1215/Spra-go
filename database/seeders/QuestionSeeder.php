<?php

namespace Database\Seeders;

use App\Models\Quiz;
use Illuminate\Database\Seeder;

class QuestionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $questionsByQuiz = [
            'あいさつを覚えよう' => [
                '「おはよう」の意味は？',
                '「ありがとう」は英語で何と言う？',
                '日本語で「さようなら」はどんな時に使う？',
            ],
            '首都当てクイズ' => [
                'フランスの首都は？',
                '日本の首都は？',
                'スペインの首都は？',
            ],
        ];

        foreach ($questionsByQuiz as $quizTitle => $prompts) {
            $quiz = Quiz::query()->where('title', $quizTitle)->first();

            if (! $quiz) {
                continue;
            }

            foreach ($prompts as $index => $prompt) {
                $quiz->questions()->firstOrCreate(
                    ['prompt' => $prompt],
                    ['order' => $index]
                );
            }
        }
    }
}
