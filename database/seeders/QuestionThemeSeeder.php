<?php

namespace Database\Seeders;

use App\Models\QuestionTheme;
use Illuminate\Database\Seeder;

class QuestionThemeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $questionThemes = [
            ['key' => 'flag_to_country', 'label' => '国旗→国名', 'description' => '国旗を見て国名を答える、最も基本的な形式。'],
            ['key' => 'country_to_flag', 'label' => '国名→国旗', 'description' => '国名から正しい国旗を選ぶ、視点を逆にした形式。'],
            ['key' => 'geography', 'label' => '地理', 'description' => 'その国がどの大陸・地域にあるかを問う形式。'],
            ['key' => 'capital', 'label' => '首都', 'description' => 'その国の首都を問う形式。'],
            ['key' => 'language', 'label' => '言語・あいさつ', 'description' => 'あいさつなど、言語そのものに踏み込む形式。'],
            ['key' => 'vocabulary', 'label' => '単語', 'description' => '言語学習モード: 単語の意味・スペルを問う形式。'],
            ['key' => 'phrase', 'label' => 'フレーズ・表現', 'description' => '言語学習モード: 日常会話でよく使うフレーズ・言い回しを問う形式。'],
            ['key' => 'grammar', 'label' => '文法', 'description' => '言語学習モード: 基本的な文法・文の組み立てを問う形式。'],
        ];

        foreach ($questionThemes as $theme) {
            QuestionTheme::query()->firstOrCreate(['key' => $theme['key']], $theme);
        }
    }
}
