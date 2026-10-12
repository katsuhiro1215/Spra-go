<?php

namespace App\Console\Commands;

use App\Models\ProfileWorldItem;
use App\Models\ShopItem;
use App\Models\User;
use App\Models\UserProfile;
use App\Support\LevelCurve;
use App\Support\WorldLand;
use App\Support\WorldPlacement;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

/**
 * Lv30の町を再現するデモ(開発用)。いろんなアイテムを置いて、町として足りない物・大きさのずれを見つけるために使う。
 * 何度流しても同じ状態に戻る(デモ用プロフィールの置いた物を作り直す)。
 */
class TownDemoCommand extends Command
{
    protected $signature = 'town:demo';

    protected $description = 'Lv30のデモ用プロフィールを作り、町にアイテムをたくさん置く(開発用)';

    public const EMAIL = 'demo-lv30@example.test';

    public const PASSWORD = 'demo-lv30-pass';

    /**
     * 置く物: [絵のキー, x, y]。2×2・3×3は (x, y) が奥のマス。道(y=3の横の道・x=3の縦の道)と目印は避けてある。
     * 区画: はじまりの町(0-6,0-6)・竹林(7-11,0-6)・海辺(0-6,7-11)・丘(7-11,7-11)・川辺(12-16,0-11)・高原(0-11,12-16)・離島(12-16,12-16)
     *
     * @var list<array{0: string, 1: int, 2: int}>
     */
    private const LAYOUT = [
        // はじまりの町: 道の南に店と家、北に小さな家と花
        ['cottage', 0, 0], ['red_house', 1, 0], ['leaf_cottage', 0, 1], ['street_lamp', 5, 0], ['tree', 6, 0],
        ['resident_cottage', 4, 1], ['bakery', 5, 1], ['mailbox', 4, 2],
        ['japanese_house', 0, 4], ['flowerbed', 2, 4], ['leaf_lamp', 2, 5], ['bench', 2, 6], ['tulip', 0, 6], ['flower_pots', 1, 6],
        ['chief_hall', 4, 4], ['well', 3, 4], ['vending', 3, 5], ['young_tree', 3, 6],
        // 竹林: 金閣寺・五重塔・鳥居と竹
        ['kinkakuji', 7, 1], ['bamboo', 9, 0], ['bamboo', 10, 0], ['bamboo', 9, 1], ['stone_lantern', 9, 2], ['sakura', 10, 2], ['woodland_torii', 7, 0],
        ['big_ben', 11, 0], ['pagoda', 8, 4], ['sakura', 7, 4], ['momiji', 7, 5], ['pine', 7, 6], ['bamboo', 11, 4], ['bamboo', 11, 6],
        // 海辺: 灯台・船・パラソル・屋台
        ['lighthouse', 1, 8], ['boat_large', 0, 10], ['palm', 0, 7], ['palm', 1, 7], ['palm', 2, 7], ['parasol', 0, 8], ['parasol', 0, 9], ['parasol', 2, 10],
        ['cafe', 4, 8], ['stall', 4, 7], ['bicycle', 5, 7], ['boat_small', 6, 10], ['palm', 4, 10], ['palm', 5, 10], ['parasol', 6, 7], ['pathside_stone', 6, 11], ['chochin', 6, 8],
        // 丘: お城と木
        ['castle', 8, 8], ['tree', 7, 7], ['broadleaf_tree', 8, 7], ['sakura', 9, 7], ['tree', 10, 7], ['pine', 7, 8], ['rock', 7, 9], ['bush', 7, 10], ['sunflower', 7, 11],
        ['tulip', 8, 11], ['tulip', 9, 11], ['flowerbed', 10, 11], ['pathside_flowers', 11, 8], ['pathside_flowers', 11, 9], ['bush', 11, 10], ['rock', 11, 11],
        // 川辺: モール・風車・小川
        ['saku_mall', 13, 0], ['spru_mall', 12, 4], ['stone_tower_hall', 15, 4], ['windmill_garden', 13, 8], ['stream', 16, 7], ['stream', 16, 8],
        ['stream', 16, 9], ['stream', 16, 10], ['spring', 15, 7], ['wooden_bridge', 12, 7], ['tree', 12, 2], ['tree', 16, 0], ['tree', 16, 1], ['bush', 16, 2],
        ['broadleaf_tree', 12, 8], ['bench', 12, 9], ['sunflower', 12, 10], ['tulip', 12, 11],
        // 高原: 商店街と畑
        ['greengrocer', 0, 12], ['fish_shop', 0, 14], ['meat_shop', 4, 12], ['produce_shop', 4, 14], ['seed_storehouse', 6, 12],
        ['vegetable_bed', 6, 15], ['vegetable_bed', 7, 15], ['vegetable_bed', 8, 15], ['vegetable_bed', 8, 14], ['fountain', 6, 13], ['bush', 7, 12], ['large_tree', 8, 12], ['arc_de_triomphe', 10, 12],
        ['sungnyemun', 10, 14], ['sakura', 6, 16], ['tree', 7, 16], ['pine', 8, 16], ['street_lamp', 2, 12], ['street_lamp', 2, 14], ['bench', 2, 16],
        // 離島: タワーとヤシ
        ['tower', 12, 12], ['palm', 15, 12], ['palm', 16, 12], ['parasol', 12, 14], ['parasol', 13, 14], ['boat_small', 16, 14], ['boat_large', 14, 14], ['palm', 12, 16], ['palm', 16, 16],
    ];

    public function handle(): int
    {
        if (app()->isProduction()) {
            $this->error('本番では動かしません(試験用のアカウントを作るため)。');

            return self::FAILURE;
        }

        $profile = $this->profile();
        $profile->worldItems()->delete();

        $failures = [];
        $placed = 0;
        foreach (self::LAYOUT as [$key, $x, $y]) {
            $shopItem = ShopItem::query()->where('type', 'decoration')->get()->first(fn (ShopItem $item) => $item->assetKey() === $key);
            if ($shopItem === null) {
                $failures[] = "{$key}: ショップに無い";

                continue;
            }
            $item = $profile->worldItems()->create(['shop_item_id' => $shopItem->id]);
            try {
                WorldPlacement::check($profile, $item, $x, $y);
            } catch (\Throwable $e) {
                $item->delete();
                $failures[] = "{$key} ({$x},{$y}): ".$e->getMessage();

                continue;
            }
            $item->update(['x' => $x, 'y' => $y]);
            $placed++;
        }

        $this->info("置きました: {$placed}個（土地 ".WorldLand::width().'×'.WorldLand::height().'）。ログイン: '.self::EMAIL.' / '.self::PASSWORD);
        foreach ($failures as $line) {
            $this->warn(" - {$line}");
        }

        return $failures === [] ? self::SUCCESS : self::FAILURE;
    }

    private function profile(): UserProfile
    {
        $user = User::firstOrCreate(
            ['email' => self::EMAIL],
            ['name' => 'まちデモ家族', 'password' => Hash::make(self::PASSWORD), 'email_verified_at' => now()],
        );
        $schema = $user->schema ?? $user->schema()->create(['name' => 'まちデモ家族']);
        $profile = $schema->profiles()->firstOrCreate(['name' => 'まちデモ']);
        $profile->forceFill([
            'level' => 30,
            'xp' => LevelCurve::totalXpFor(30),
            'points' => 100000,
            'coins' => 100000,
            'world_welcomed_at' => now(),
            'world_plots_seen' => array_column(WorldLand::plots(), 'key'),
        ])->save();

        return $profile;
    }
}
