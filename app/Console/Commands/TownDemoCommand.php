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
        ['bakery', 4, 1], ['fire_station', 6, 1], ['mailbox', 8, 1], ['street_lamp', 8, 2], ['tree', 5, 0], ['flowerbed', 6, 0], ['tulip', 7, 0],
        // ブロックC(10-16,0-2): 名所(竹林のほう)
        ['sakura', 11, 1], ['sakura', 11, 0], ['sakura', 11, 2], ['chief_hall', 12, 0], ['bush', 15, 2], ['bush', 16, 2], ['stone_lantern', 10, 2],
        // ブロックD(0-2,4-8): 住宅
        ['station_hut', 0, 4], ['flowerbed', 2, 4], ['flowerbed', 2, 5], ['tree', 0, 6], ['bench', 1, 6], ['tulip', 2, 6],
        ['red_house', 0, 8], ['leaf_cottage', 1, 8], ['blue_flower_cottage', 2, 8], ['street_lamp', 2, 7],
        // ブロックE(4-8,4-8): 公園
        ['fountain', 5, 5], ['sakura', 4, 4], ['tree', 8, 4], ['pine', 4, 6], ['bench', 7, 5], ['bench', 7, 6], ['flowerbed', 4, 7], ['tulip', 5, 7], ['flowerbed', 6, 7], ['well', 8, 6], ['momiji', 8, 8], ['leaf_lamp', 4, 8], ['leaf_lamp', 8, 7],
        // ブロックF(10-16,4-8): お城と五重塔
        ['castle', 11, 6], ['pagoda', 14, 5], ['tree', 10, 4], ['pine', 10, 6], ['bush', 10, 7], ['sakura', 16, 4], ['stone_lantern', 15, 8], ['bamboo', 10, 5],
        // ブロックG(0-2,10-16): 商店街
        ['flower_shop', 0, 10], ['clinic', 0, 12], ['street_lamp', 1, 14], ['street_lamp', 2, 12], ['street_lamp', 2, 14], ['bench', 2, 16], ['tree', 2, 10],
        // ブロックH(4-8,10-16): モールと畑
        ['small_school', 4, 10], ['seed_storehouse', 6, 10], ['spru_mall', 6, 11], ['wheat_field', 4, 13], ['carrot_field', 4, 15], ['tree', 4, 12], ['large_tree', 7, 15], ['street_lamp', 8, 10], ['flowerbed', 6, 16], ['tulip', 6, 15],
        // ブロックI(10-16,10-16): ランドマーク広場
        ['pagoda', 11, 11], ['tower', 15, 10], ['lighthouse', 14, 12], ['big_ben', 10, 14], ['arc_de_triomphe', 12, 14], ['palm', 10, 10],
        ['tree', 10, 12], ['palm', 16, 12],
        // 追加分(2026-10-12): 花・木・街の備品・暮らし。空いているマスに
        ['lavender', 5, 4], ['cosmos', 6, 4], ['hydrangea', 7, 4], ['rose_bed', 4, 5], ['hedge_square', 8, 5], ['topiary_ball', 0, 7], ['ginkgo', 1, 7],
        ['birch', 5, 8], ['plum_tree', 6, 8], ['fir_tree', 7, 8], ['willow', 7, 10], ['small_pond', 10, 11],
        ['wooden_fence', 11, 4], ['low_stone_wall', 12, 4], ['signpost', 13, 4], ['drinking_fountain', 14, 4], ['flower_arch', 15, 4], ['trash_bin', 12, 5],
        ['scarecrow', 13, 5], ['handcart', 11, 10], ['barrels_crates', 12, 10], ['firewood_pile', 13, 10], ['haystack', 14, 10], ['laundry_line', 14, 11],
        // 追加分2(2026-10-13): 小さな生き物・柵と塀
        ['cat_sitting', 10, 0], ['dog_sitting', 7, 7], ['hen', 10, 8], ['sheep', 14, 8], ['birdhouse', 5, 12], ['beehive', 16, 8],
        ['hedge_long', 6, 14], ['fence_corner', 7, 14], ['fence_gate', 8, 14], ['wooden_fence_b', 10, 16], ['low_stone_wall_b', 11, 16], ['stone_wall_corner', 12, 16],
    ];

    /**
     * バッグに入れておく物(町に置くのは LAYOUT。これは自分で置いて確かめる)
     *
     * @var list<string>
     */
    private const AUTO = [
        'potato_field', 'onion_field', 'cabbage_field', 'tomato_field', 'cucumber_field', 'pumpkin_field', 'corn_field', 'eggplant_field', 'watermelon_field',
        'car_red', 'taxi', 'motorbike', 'ambulance', 'bus_small', 'fire_truck', 'delivery_truck', 'tractor', 'train_engine', 'hot_air_balloon', 'sailboat', 'cart_horse_free',
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

        // 畑・乗り物は、町がいっぱいなので、バッグに入れておく(自分で置いて、大きさや見た目を確かめる)
        $bagged = [];
        foreach (self::AUTO as $key) {
            $shopItem = ShopItem::query()->where('type', 'decoration')->get()->first(fn (ShopItem $item) => $item->assetKey() === $key);
            if ($shopItem === null) {
                $failures[] = "{$key}: ショップにありません(WorldItemSeeder を流してください)";

                continue;
            }
            $profile->worldItems()->create(['shop_item_id' => $shopItem->id]);
            $bagged[] = $key;
        }

        $this->info("置きました: {$placed}個（土地 ".WorldLand::width().'×'.WorldLand::height().'）。ログイン: '.self::EMAIL.' / '.self::PASSWORD);
        if ($bagged !== []) {
            $this->line('バッグに入れました(自分で置いて確かめる): '.implode('、', $bagged));
        }
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
