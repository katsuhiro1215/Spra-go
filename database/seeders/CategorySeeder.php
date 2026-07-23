<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Category;

class CategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = [
            ['name' => '国旗'],
            ['name' => '世界地図'],
            ['name' => '日本地図'],
            ['name' => '動物'],
            ['name' => '食べ物'],
            ['name' => 'スポーツ'],
            ['name' => 'アニメ'],
            ['name' => '歴史'],
            ['name' => '世界遺産'],
            ['name' => '音楽'],
            ['name' => '建物'],
            ['name' => '映画'],
            ['name' => '文学'],
            ['name' => '科学'],
            ['name' => 'テクノロジー'],
            ['parent_id' => 1, 'name' => '日本'],
            ['parent_id' => 1, 'name' => 'アメリカ'],
            ['parent_id' => 1, 'name' => 'イギリス'],
            ['parent_id' => 1, 'name' => 'フランス'],
            ['parent_id' => 1, 'name' => 'ドイツ'],
            ['parent_id' => 1, 'name' => 'イタリア'],
            ['parent_id' => 1, 'name' => 'カナダ'],
            ['parent_id' => 1, 'name' => 'オーストラリア'],
            ['parent_id' => 1, 'name' => 'ブラジル'],
            ['parent_id' => 1, 'name' => 'ロシア'],
            ['parent_id' => 1, 'name' => '中国'],
            ['parent_id' => 1, 'name' => 'インド'],
            ['parent_id' => 1, 'name' => 'メキシコ'],
            ['parent_id' => 1, 'name' => 'スペイン'],
            ['parent_id' => 1, 'name' => '韓国'],
            ['parent_id' => 1, 'name' => 'タイ'],
            ['parent_id' => 1, 'name' => 'マレーシア'],
            ['parent_id' => 1, 'name' => 'インドネシア'],
            ['parent_id' => 1, 'name' => 'フィリピン'],
            ['parent_id' => 1, 'name' => 'ベトナム'],
            ['parent_id' => 1, 'name' => 'シンガポール'],
            ['parent_id' => 1, 'name' => 'ニュージーランド'],
            ['parent_id' => 1, 'name' => '南アフリカ'],
            ['parent_id' => 1, 'name' => 'エジプト'],
            ['parent_id' => 1, 'name' => 'トルコ'],
            ['parent_id' => 1, 'name' => 'アラブ首長国連邦'],
            ['parent_id' => 1, 'name' => 'サウジアラビア'],
            ['parent_id' => 1, 'name' => 'イスラエル'],
            ['parent_id' => 1, 'name' => 'ギリシャ'],
            ['parent_id' => 1, 'name' => 'スウェーデン'],
            ['parent_id' => 1, 'name' => 'ノルウェー'],
            ['parent_id' => 1, 'name' => 'デンマーク'],
            ['parent_id' => 1, 'name' => 'フィンランド'],
            ['parent_id' => 1, 'name' => 'ポーランド'],
            ['parent_id' => 1, 'name' => 'チェコ共和国'],
            ['parent_id' => 1, 'name' => 'ハンガリー'],
            ['parent_id' => 1, 'name' => 'ルーマニア'],
        ];

        foreach ($categories as $category) {
            Category::query()->firstOrCreate(
                ['parent_id' => $category['parent_id'] ?? null, 'name' => $category['name']]
            );
        }
    }
}
