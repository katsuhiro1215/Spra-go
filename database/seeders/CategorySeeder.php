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
    }
}
