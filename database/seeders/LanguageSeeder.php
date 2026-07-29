<?php

namespace Database\Seeders;

use App\Models\Language;
use Illuminate\Database\Seeder;

class LanguageSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $languages = [
            [
                'code' => 'ja',
                'name' => '日本語',
                'name_en' => 'Japanese',
            ],
            [
                'code' => 'en',
                'name' => '英語',
                'name_en' => 'English',
            ],
            [
                'code' => 'fr',
                'name' => 'フランス語',
                'name_en' => 'French',
            ],
            [
                'code' => 'es',
                'name' => 'スペイン語',
                'name_en' => 'Spanish',
            ],
            [
                'code' => 'it',
                'name' => 'イタリア語',
                'name_en' => 'Italian',
            ],
            [
                'code' => 'pt',
                'name' => 'ポルトガル語',
                'name_en' => 'Portuguese',
            ],
            [
                'code' => 'id',
                'name' => 'インドネシア語',
                'name_en' => 'Indonesian',
            ],
            [
                'code' => 'th',
                'name' => 'タイ語',
                'name_en' => 'Thai',
            ],
            [
                'code' => 'ar',
                'name' => 'アラビア語',
                'name_en' => 'Arabic',
            ],
            [
                'code' => 'ko',
                'name' => '韓国語',
                'name_en' => 'Korean',
            ],
            [
                'code' => 'vi',
                'name' => 'ベトナム語',
                'name_en' => 'Vietnamese',
            ],
            [
                'code' => 'ru',
                'name' => 'ロシア語',
                'name_en' => 'Russian',
            ],
            [
                'code' => 'de',
                'name' => 'ドイツ語',
                'name_en' => 'German',
            ],
            [
                'code' => 'tr',
                'name' => 'トルコ語',
                'name_en' => 'Turkish',
            ],
            [
                'code' => 'pl',
                'name' => 'ポーランド語',
                'name_en' => 'Polish',
            ],
            [
                'code' => 'nl',
                'name' => 'オランダ語',
                'name_en' => 'Dutch',
            ],
            [
                'code' => 'sv',
                'name' => 'スウェーデン語',
                'name_en' => 'Swedish',
            ],
            [
                'code' => 'no',
                'name' => 'ノルウェー語',
                'name_en' => 'Norwegian',
            ],
            [
                'code' => 'fi',
                'name' => 'フィンランド語',
                'name_en' => 'Finnish',
            ],
            [
                'code' => 'da',
                'name' => 'デンマーク語',
                'name_en' => 'Danish',
            ],
            [
                'code' => 'cs',
                'name' => 'チェコ語',
                'name_en' => 'Czech',
            ],
            [
                'code' => 'hu',
                'name' => 'ハンガリー語',
                'name_en' => 'Hungarian',
            ],
            [
                'code' => 'ro',
                'name' => 'ルーマニア語',
                'name_en' => 'Romanian',
            ],
            [
                'code' => 'sk',
                'name' => 'スロバキア語',
                'name_en' => 'Slovak',
            ],
            [
                'code' => 'sl',
                'name' => 'スロベニア語',
                'name_en' => 'Slovenian',
            ],
            [
                'code' => 'hr',
                'name' => 'クロアチア語',
                'name_en' => 'Croatian',
            ],
            [
                'code' => 'sr',
                'name' => 'セルビア語',
                'name_en' => 'Serbian',
            ],
            [
                'code' => 'bg',
                'name' => 'ブルガリア語',
                'name_en' => 'Bulgarian',
            ],
            [
                'code' => 'uk',
                'name' => 'ウクライナ語',
                'name_en' => 'Ukrainian',
            ],
            [
                'code' => 'he',
                'name' => 'ヘブライ語',
                'name_en' => 'Hebrew',
            ],
            [
                'code' => 'fa',
                'name' => 'ペルシャ語',
                'name_en' => 'Persian',
            ],
            [
                'code' => 'hi',
                'name' => 'ヒンディー語',
                'name_en' => 'Hindi',
            ],
            [
                'code' => 'bn',
                'name' => 'ベンガル語',
                'name_en' => 'Bengali',
            ],
            [
                'code' => 'pa',
                'name' => 'パンジャブ語',
                'name_en' => 'Punjabi',
            ],
            [
                'code' => 'gu',
                'name' => 'グジャラート語',
                'name_en' => 'Gujarati',
            ],
            [
                'code' => 'ta',
                'name' => 'タミル語',
                'name_en' => 'Tamil',
            ],
            [
                'code' => 'te',
                'name' => 'テルグ語',
                'name_en' => 'Telugu',
            ],
            [
                'code' => 'kn',
                'name' => 'カンナダ語',
                'name_en' => 'Kannada',
            ],
            [
                'code' => 'ml',
                'name' => 'マラヤーラム語',
                'name_en' => 'Malayalam',
            ],
            [
                'code' => 'mr',
                'name' => 'マラーティー語',
                'name_en' => 'Marathi',
            ],
        ];

        foreach ($languages as $language) {
            Language::query()->firstOrCreate(['code' => $language['code']], $language);
        }
    }
}
