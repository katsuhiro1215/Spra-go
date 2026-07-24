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
            '国旗', '世界地図', '日本地図', '動物', '食べ物',
            'スポーツ', 'アニメ', '歴史', '世界遺産', '音楽', '建物',
            '映画', '文学', '科学', 'テクノロジー',
        ];

        foreach ($rootCategories as $name) {
            Category::query()->firstOrCreate(['parent_id' => null, 'name' => $name]);
        }

        $countryCategories = [
            '日本', 'アメリカ', 'イギリス', 'フランス', 'ドイツ', 'イタリア', 'カナダ',
            'オーストラリア', 'ブラジル', 'ロシア', '中国', 'インド', 'メキシコ', 'スペイン',
            '韓国', 'タイ', 'マレーシア', 'インドネシア', 'フィリピン', 'ベトナム', 'シンガポール',
            'ニュージーランド', '南アフリカ', 'エジプト', 'トルコ', 'アラブ首長国連邦',
            'サウジアラビア', 'イスラエル', 'ギリシャ', 'スウェーデン', 'ノルウェー',
            'デンマーク', 'フィンランド', 'ポーランド', 'チェコ共和国', 'ハンガリー', 'ルーマニア',
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
