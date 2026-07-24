<?php

namespace Database\Seeders;

use App\Models\ContentItem;
use App\Models\Country;
use Illuminate\Database\Seeder;

class ContentItemSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
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
    }
}
