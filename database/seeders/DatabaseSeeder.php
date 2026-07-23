<?php

namespace Database\Seeders;

use App\Models\Admin;
use App\Models\Category;
use App\Models\ContentItem;
use App\Models\Country;
use App\Models\Event;
use App\Models\Owner;
use App\Models\QuestionTheme;
use App\Models\Quiz;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        User::query()->firstOrCreate(
            ['email' => 'test@example.com'],
            User::factory()->raw(['name' => 'Test User'])
        );

        Admin::query()->firstOrCreate(
            ['email' => 'admin@example.com'],
            Admin::factory()->raw(['name' => 'Test Admin'])
        );

        Owner::query()->firstOrCreate(
            ['email' => 'owner@example.com'],
            Owner::factory()->raw(['name' => 'Test Owner'])
        );

        $rootCategories = [
            '国旗', '世界地図', '日本地図', '動物', '食べ物',
            'スポーツ', 'アニメ', '歴史', '世界遺産', '音楽', '建物',
        ];

        foreach ($rootCategories as $index => $name) {
            Category::query()->firstOrCreate(
                ['parent_id' => null, 'name' => $name],
                ['order' => $index]
            );
        }

        $countries = [
            ['code' => 'jp', 'name' => '日本', 'language' => '日本語', 'stages' => 12],
            ['code' => 'us', 'name' => 'アメリカ', 'language' => '英語', 'stages' => 20],
            ['code' => 'fr', 'name' => 'フランス', 'language' => 'フランス語', 'stages' => 8],
            ['code' => 'es', 'name' => 'スペイン', 'language' => 'スペイン語', 'stages' => 10],
            ['code' => 'it', 'name' => 'イタリア', 'language' => 'イタリア語', 'stages' => 6],
            ['code' => 'pt', 'name' => 'ポルトガル', 'language' => 'ポルトガル語', 'stages' => 4],
            ['code' => 'id', 'name' => 'インドネシア', 'language' => 'インドネシア語', 'stages' => 3],
            ['code' => 'th', 'name' => 'タイ', 'language' => 'タイ語', 'stages' => 5],
        ];

        foreach ($countries as $index => $country) {
            Country::query()->firstOrCreate(
                ['code' => $country['code']],
                [...$country, 'order' => $index]
            );
        }

        $events = [
            ['title' => '夏休みスペシャルイベント', 'starts_at' => '2026-07-15', 'ends_at' => '2026-08-31'],
            ['title' => '世界遺産ウィーク', 'starts_at' => '2026-09-01', 'ends_at' => '2026-09-07'],
            ['title' => 'ハロウィンイベント', 'starts_at' => '2026-10-25', 'ends_at' => '2026-10-31'],
            ['title' => '春の国旗チャレンジ', 'starts_at' => '2026-03-01', 'ends_at' => '2026-03-31'],
        ];

        foreach ($events as $event) {
            Event::query()->firstOrCreate(['title' => $event['title']], $event);
        }

        $contentItems = [
            ['title' => '基本のあいさつ100選', 'type' => '単語', 'country_code' => 'jp'],
            ['title' => 'カフェでの注文フレーズ', 'type' => '会話', 'country_code' => 'fr'],
            ['title' => '闘牛とフラメンコ', 'type' => '文化', 'country_code' => 'es'],
            ['title' => 'ルネサンス期の歴史', 'type' => '歴史', 'country_code' => 'it'],
            ['title' => 'リアス式海岸の地理', 'type' => '地理', 'country_code' => 'pt'],
            ['title' => '国旗の由来', 'type' => '国旗', 'country_code' => 'id'],
            ['title' => 'アユタヤ遺跡', 'type' => '世界遺産', 'country_code' => 'th'],
        ];

        foreach ($contentItems as $item) {
            ContentItem::query()->firstOrCreate(
                ['title' => $item['title']],
                [
                    'type' => $item['type'],
                    'country_id' => Country::query()->where('code', $item['country_code'])->value('id'),
                ]
            );
        }

        $quizzes = [
            [
                'title' => 'あいさつを覚えよう',
                'difficulty' => '初級',
                'country_code' => 'jp',
                'is_published' => true,
                'categories' => ['国旗'],
                'questions' => [
                    [
                        'prompt' => '「おはよう」の意味は？',
                        'choices' => [
                            'Good morning' => true,
                            'Good night' => false,
                            'Thank you' => false,
                            'Goodbye' => false,
                        ],
                    ],
                    [
                        'prompt' => '「ありがとう」は英語で何と言う？',
                        'choices' => [
                            'Thank you' => true,
                            'Sorry' => false,
                            'Please' => false,
                            'Hello' => false,
                        ],
                    ],
                    [
                        'prompt' => '日本語で「さようなら」はどんな時に使う？',
                        'choices' => [
                            '別れる時' => true,
                            '出会った時' => false,
                            '食事の前' => false,
                            'お礼を言う時' => false,
                        ],
                    ],
                ],
            ],
            [
                'title' => '首都当てクイズ',
                'difficulty' => '初級',
                'country_code' => 'fr',
                'is_published' => true,
                'categories' => ['国旗', '世界地図'],
                'questions' => [
                    [
                        'prompt' => 'フランスの首都は？',
                        'choices' => [
                            'パリ' => true,
                            'ロンドン' => false,
                            'ベルリン' => false,
                            'マドリード' => false,
                        ],
                    ],
                    [
                        'prompt' => '日本の首都は？',
                        'choices' => [
                            '東京' => true,
                            '大阪' => false,
                            '京都' => false,
                            '名古屋' => false,
                        ],
                    ],
                    [
                        'prompt' => 'スペインの首都は？',
                        'choices' => [
                            'マドリード' => true,
                            'バルセロナ' => false,
                            'リスボン' => false,
                            'セビリア' => false,
                        ],
                    ],
                ],
            ],
            [
                'title' => 'レストランでの会話',
                'difficulty' => '中級',
                'country_code' => 'es',
                'is_published' => false,
                'categories' => ['国旗', '食べ物'],
                'questions' => [],
            ],
            [
                'title' => '歴史クイズ:ルネサンス',
                'difficulty' => '上級',
                'country_code' => 'it',
                'is_published' => false,
                'categories' => ['国旗', '歴史'],
                'questions' => [],
            ],
            [
                'title' => '屋台グルメ単語帳',
                'difficulty' => '初級',
                'country_code' => 'th',
                'is_published' => false,
                'categories' => ['国旗', '食べ物'],
                'questions' => [],
            ],
        ];

        $questionThemes = [
            ['key' => 'flag_to_country', 'label' => '国旗→国名', 'description' => '国旗を見て国名を答える、最も基本的な形式。'],
            ['key' => 'country_to_flag', 'label' => '国名→国旗', 'description' => '国名から正しい国旗を選ぶ、視点を逆にした形式。'],
            ['key' => 'geography', 'label' => '地理', 'description' => 'その国がどの大陸・地域にあるかを問う形式。'],
            ['key' => 'capital', 'label' => '首都', 'description' => 'その国の首都を問う形式。'],
            ['key' => 'language', 'label' => '言語・あいさつ', 'description' => 'あいさつなど、言語そのものに踏み込む形式。'],
        ];

        foreach ($questionThemes as $theme) {
            QuestionTheme::query()->firstOrCreate(['key' => $theme['key']], $theme);
        }

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

            foreach ($quizData['questions'] as $index => $questionData) {
                $question = $quiz->questions()->firstOrCreate(
                    ['prompt' => $questionData['prompt']],
                    ['order' => $index]
                );

                if ($question->choices()->exists()) {
                    continue;
                }

                $choiceIndex = 0;
                foreach ($questionData['choices'] as $label => $isCorrect) {
                    $question->choices()->create([
                        'label' => $label,
                        'is_correct' => $isCorrect,
                        'order' => $choiceIndex++,
                    ]);
                }
            }
        }
    }
}
