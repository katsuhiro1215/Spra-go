<?php

namespace Database\Seeders;

use App\Models\Event;
use Illuminate\Database\Seeder;

class EventSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $events = [
            ['title' => '夏休みスペシャルイベント', 'starts_at' => '2026-07-15', 'ends_at' => '2026-08-31'],
            ['title' => '世界遺産ウィーク', 'starts_at' => '2026-09-01', 'ends_at' => '2026-09-07'],
            ['title' => 'ハロウィンイベント', 'starts_at' => '2026-10-25', 'ends_at' => '2026-10-31'],
            ['title' => '春の国旗チャレンジ', 'starts_at' => '2026-03-01', 'ends_at' => '2026-03-31'],
        ];

        foreach ($events as $event) {
            Event::query()->firstOrCreate(['title' => $event['title']], $event);
        }
    }
}
