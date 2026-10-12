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
     * 置く物: [絵のキー, x, y]。2×2・3×3は (x, y) が奥のマス。道(横は y=3・y=9、縦は x=3・x=9)と目印は避けてある。
     * 区画: はじまりの町(0-6,0-6)・竹林(7-11,0-6)・海辺(0-6,7-11)・丘(7-11,7-11)・川辺(12-16,0-11)・高原(0-11,12-16)・離島(12-16,12-16)
     *
     * @var list<array{0: string, 1: int, 2: int}>
     */
    private const LAYOUT = [
        // 道は横が y=3・y=9、縦が x=3・x=9。ブロックごとに、道に面して家・店を置き、あいだに木や花
        // ブロックA(0-2,0-2): スプルの家のまわり
        ['cottage', 0, 0], ['red_house', 1, 0], ['leaf_cottage', 0, 1],
        // ブロックB(4-8,0-2): 商店
        ['bakery', 4, 1], ['cafe', 6, 1], ['mailbox', 8, 1], ['street_lamp', 8, 2], ['tree', 5, 0], ['flowerbed', 6, 0], ['tulip', 7, 0],
        // ブロックC(10-16,0-2): 名所(竹林のほう)
        ['kinkakuji', 11, 1], ['sakura', 11, 0], ['sakura', 12, 0], ['chief_hall', 13, 0], ['tree', 16, 0], ['bush', 16, 1], ['bush', 16, 2], ['stone_lantern', 10, 2],
        // ブロックD(0-2,4-8): 住宅
        ['japanese_house', 0, 4], ['flowerbed', 2, 4], ['flowerbed', 2, 5], ['tree', 0, 6], ['bench', 1, 6], ['tulip', 2, 6],
        ['red_house', 0, 8], ['leaf_cottage', 1, 8], ['blue_flower_cottage', 2, 8], ['street_lamp', 2, 7],
        // ブロックE(4-8,4-8): 公園
        ['fountain', 5, 5], ['sakura', 4, 4], ['tree', 8, 4], ['pine', 4, 6], ['bench', 7, 5], ['bench', 7, 6], ['flowerbed', 4, 7], ['tulip', 5, 7], ['flowerbed', 6, 7], ['well', 8, 6], ['momiji', 8, 8], ['leaf_lamp', 4, 8], ['leaf_lamp', 8, 7],
        // ブロックF(10-16,4-8): お城と五重塔
        ['castle', 11, 6], ['pagoda', 14, 5], ['tree', 10, 4], ['pine', 10, 6], ['bush', 10, 7], ['sakura', 16, 4], ['stone_lantern', 15, 8], ['bamboo', 10, 5],
        // ブロックG(0-2,10-16): 商店街
        ['greengrocer', 0, 10], ['fish_shop', 0, 12], ['meat_shop', 0, 14], ['street_lamp', 2, 12], ['street_lamp', 2, 14], ['bench', 2, 16], ['tree', 2, 10],
        // ブロックH(4-8,10-16): モールと畑
        ['produce_shop', 4, 10], ['seed_storehouse', 6, 10], ['spru_mall', 6, 11], ['vegetable_bed', 4, 13], ['vegetable_bed', 5, 13], ['vegetable_bed', 4, 14], ['vegetable_bed', 5, 14],
        ['vegetable_bed', 4, 15], ['vegetable_bed', 5, 15], ['tree', 4, 12], ['large_tree', 7, 15], ['street_lamp', 8, 10], ['flowerbed', 6, 16], ['tulip', 6, 15],
        // ブロックI(10-16,10-16): ランドマーク広場
        ['pagoda', 11, 11], ['tower', 15, 10], ['lighthouse', 14, 12], ['big_ben', 10, 14], ['arc_de_triomphe', 12, 14], ['sungnyemun', 14, 14], ['palm', 10, 10],
        ['boat_small', 16, 16], ['tree', 10, 12], ['palm', 16, 12],
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
