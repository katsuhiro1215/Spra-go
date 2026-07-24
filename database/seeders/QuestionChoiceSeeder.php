<?php

namespace Database\Seeders;

use App\Models\Question;
use Illuminate\Database\Seeder;

class QuestionChoiceSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $choicesByPrompt = [
            '「おはよう」の意味は？' => [
                'Good morning' => true,
                'Good night' => false,
                'Thank you' => false,
                'Goodbye' => false,
            ],
            '「ありがとう」は英語で何と言う？' => [
                'Thank you' => true,
                'Sorry' => false,
                'Please' => false,
                'Hello' => false,
            ],
            '日本語で「さようなら」はどんな時に使う？' => [
                '別れる時' => true,
                '出会った時' => false,
                '食事の前' => false,
                'お礼を言う時' => false,
            ],
            'フランスの首都は？' => [
                'パリ' => true,
                'ロンドン' => false,
                'ベルリン' => false,
                'マドリード' => false,
            ],
            '日本の首都は？' => [
                '東京' => true,
                '大阪' => false,
                '京都' => false,
                '名古屋' => false,
            ],
            'スペインの首都は？' => [
                'マドリード' => true,
                'バルセロナ' => false,
                'リスボン' => false,
                'セビリア' => false,
            ],
        ];

        foreach ($choicesByPrompt as $prompt => $choices) {
            $question = Question::query()->where('prompt', $prompt)->first();

            if (! $question || $question->choices()->exists()) {
                continue;
            }

            $order = 0;
            foreach ($choices as $label => $isCorrect) {
                $question->choices()->create([
                    'label' => $label,
                    'is_correct' => $isCorrect,
                    'order' => $order++,
                ]);
            }
        }
    }
}
