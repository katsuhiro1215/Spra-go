<?php

use App\Models\ProfileZukan;
use App\Support\Zukan;
use Illuminate\Database\UniqueConstraintViolationException;

/*
|--------------------------------------------------------------------------
| パンとやさいのずかん(docs/design/2026-10-05-bread-zukan-design.md)
|--------------------------------------------------------------------------
|
| 一覧は config/zukan.php の15点。今日のおつかい3つをそろえた日に、まだ持っていない物から1つ贈る。
|
*/

it('設定: 15点で、すべてに日本語・英語・種類があり、キーは重ならない', function () {
    $items = config('zukan.items');

    expect($items)->toHaveCount(15);
    foreach ($items as $key => $item) {
        expect($item['name'])->not->toBe('')
            ->and($item['english'])->not->toBe('')
            ->and($item['kind'])->toBeIn(['bread', 'crop']);
    }
    expect(collect($items)->where('kind', 'bread'))->toHaveCount(10);
});

it('贈る: 持っていない物から1つ贈り、記録が1つ増える。14回目まで毎回違う物', function () {
    $profile = createActiveProfile();
    $keys = [];

    foreach (range(1, 15) as $i) {
        $gift = Zukan::gift($profile);
        expect($gift)->toHaveKeys(['key', 'name', 'english', 'kind']);
        $keys[] = $gift['key'];
        expect($profile->zukan()->count())->toBe($i);
    }

    expect(array_unique($keys))->toHaveCount(15);
});

it('贈る: 15個そろったら null で、記録は増えない', function () {
    $profile = createActiveProfile();
    foreach (array_keys(config('zukan.items')) as $key) {
        $profile->zukan()->create(['item_key' => $key, 'received_at' => now()]);
    }

    expect(Zukan::gift($profile))->toBeNull()
        ->and($profile->zukan()->count())->toBe(15);
});

it('記録: 同じ物は2つ入らない(一意の制約)', function () {
    $profile = createActiveProfile();
    $profile->zukan()->create(['item_key' => 'melon_bread', 'received_at' => now()]);

    expect(fn () => $profile->zukan()->create(['item_key' => 'melon_bread', 'received_at' => now()]))
        ->toThrow(UniqueConstraintViolationException::class);
});

it('一覧: 持っていない物の名前・英語・日付は null、持っている物は入る。数が合い、ほかのプロフィールは混ざらない', function () {
    $profile = createActiveProfile();
    $other = createFamilyMember($profile);
    $profile->zukan()->create(['item_key' => 'melon_bread', 'received_at' => now()]);
    $other->zukan()->create(['item_key' => 'anpan', 'received_at' => now()]);

    $list = Zukan::list($profile);
    $items = collect($list['items'])->keyBy('key');

    expect($list['owned_count'])->toBe(1)->and($list['total'])->toBe(15)->and($list['items'])->toHaveCount(15);
    expect($items['melon_bread'])->toMatchArray(['owned' => true, 'name' => 'メロンパン', 'english' => 'melon bread', 'kind' => 'bread']);
    expect($items['melon_bread']['received_at'])->not->toBeNull();
    expect($items['anpan'])->toMatchArray(['owned' => false, 'name' => null, 'english' => null, 'received_at' => null]);
    // 表示の順は設定の順
    expect(array_column($list['items'], 'key'))->toBe(array_keys(config('zukan.items')));
});
