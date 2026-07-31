<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $rootCategories = [
            '国旗', '世界地図', '日本地図', '言語', '動物', '食べ物',
            'スポーツ', 'アニメ', '歴史', '世界遺産', '音楽', '宇宙',
        ];

        foreach ($rootCategories as $name) {
            Category::query()->firstOrCreate(['parent_id' => null, 'name' => $name]);
        }

        $countryCategories = [
            '日本', 'アメリカ', 'イギリス', 'フランス', 'ドイツ', 'イタリア', 'カナダ',
            'オーストラリア', 'ブラジル', 'ロシア', '中国', 'インド', 'メキシコ', 'スペイン',
            '韓国', 'タイ', 'マレーシア', 'インドネシア', 'フィリピン', 'ベトナム', 'シンガポール',
        ];

        $flagCategoryId = Category::query()
            ->whereNull('parent_id')
            ->where('name', '国旗')
            ->value('id');

        foreach ($countryCategories as $name) {
            Category::query()->firstOrCreate(['parent_id' => $flagCategoryId, 'name' => $name]);
        }

        // 言語学習モード用のルートカテゴリー(SPEC.md 4-4a)。国について学ぶ(トリビア)とは
        // 別軸で、is_language_modeフラグでフロント側の表示振り分けに使う。
        Category::query()->firstOrCreate(
            ['parent_id' => null, 'name' => '英語を学ぶ'],
            ['is_language_mode' => true]
        );
    }
}
