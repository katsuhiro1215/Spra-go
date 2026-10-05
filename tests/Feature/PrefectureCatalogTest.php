<?php

use App\Support\Prefecture\PrefectureCatalog;

/*
|--------------------------------------------------------------------------
| 都道府県の一覧(docs/design/2026-10-05-prefecture-quiz-design.md 4章)
|--------------------------------------------------------------------------
*/

it('47都道府県そろい、key・nameの重複がなく、バッジの絵が実在する', function () {
    $all = PrefectureCatalog::all();

    expect($all)->toHaveCount(47);
    expect(collect($all)->pluck('name')->unique())->toHaveCount(47);
    foreach ($all as $key => $prefecture) {
        expect($prefecture['key'])->toBe($key);
        expect(is_file(base_path("frontend/public/badge/pref/{$key}.webp")))->toBeTrue("バッジがない: {$key}");
    }
});

it('すべての県に地方があり、地方ごとの数が 7・7・9・7・9・8', function () {
    expect(array_keys(PrefectureCatalog::REGIONS))->toBe(['hokkaido-tohoku', 'kanto', 'chubu', 'kinki', 'chugoku-shikoku', 'kyushu-okinawa']);

    $counts = collect(PrefectureCatalog::all())->countBy('region');
    expect($counts->only(array_keys(PrefectureCatalog::REGIONS))->values()->all())->toBe([7, 7, 9, 7, 9, 8]);
    expect($counts->sum())->toBe(47);
});

it('となりの県は47県の中にあり、互いにそろっていて、自分自身を含まない。北海道と沖縄は空', function () {
    $all = PrefectureCatalog::all();

    foreach ($all as $key => $prefecture) {
        foreach ($prefecture['neighbors'] as $neighbor) {
            expect($neighbor)->not->toBe($key);
            expect($all)->toHaveKey($neighbor);
            expect($all[$neighbor]['neighbors'])->toContain($key);
        }
        expect($prefecture['capital'])->not->toBe('');
    }
    expect($all['hokkaido']['neighbors'])->toBe([]);
    expect($all['okinawa']['neighbors'])->toBe([]);
});

it('事実がそろった県は、いまは中国・四国をのぞく5地方の38県(地方を足すたびに、ここを直す)', function () {
    $all = collect(PrefectureCatalog::all());
    $ready = $all->filter(fn ($p) => PrefectureCatalog::isReady($p));

    expect($ready)->toHaveCount(38);
    expect($ready->pluck('region')->unique()->sort()->values()->all())->toBe(['chubu', 'hokkaido-tohoku', 'kanto', 'kinki', 'kyushu-okinawa']);
    // 残りは、中国・四国の9県
    expect($all->reject(fn ($p) => PrefectureCatalog::isReady($p))->pluck('region')->unique()->values()->all())->toBe(['chugoku-shikoku']);
});

it('事実がそろった県は、事実に重複がなく、難読地名のまちがいの読みが3つで重ならない', function () {
    foreach (PrefectureCatalog::all() as $prefecture) {
        if (! PrefectureCatalog::isReady($prefecture)) {
            continue;
        }
        foreach (['foods', 'sights', 'culture'] as $kind) {
            expect($prefecture[$kind])->toBe(array_values(array_unique($prefecture[$kind])));
        }
        foreach ($prefecture['hard'] as $hard) {
            expect($hard['wrong'])->toHaveCount(3);
            expect(array_unique($hard['wrong']))->toHaveCount(3);
            expect($hard['wrong'])->not->toContain($hard['reading']);
            expect($hard['word'])->toMatch('/\p{Han}/u');
            expect($hard['reading'])->toMatch('/^[\x{3041}-\x{3096}ー]+$/u');
        }
    }
});

it('準備の判定: 事実の数が足りなければ準備できていない', function () {
    $base = ['foods' => ['a', 'b', 'c', 'd'], 'sights' => ['a', 'b', 'c', 'd'], 'culture' => ['a', 'b', 'c'], 'hard' => [1, 2, 3]];

    expect(PrefectureCatalog::isReady($base))->toBeTrue();
    expect(PrefectureCatalog::isReady([...$base, 'foods' => ['a', 'b', 'c']]))->toBeFalse();
    expect(PrefectureCatalog::isReady([...$base, 'sights' => ['a']]))->toBeFalse();
    expect(PrefectureCatalog::isReady([...$base, 'culture' => ['a', 'b']]))->toBeFalse();
    expect(PrefectureCatalog::isReady([...$base, 'hard' => [1, 2]]))->toBeFalse();
});

it('称号とバッジの対応', function () {
    expect(PrefectureCatalog::title('大阪府'))->toBe('大阪府はかせ');
    expect(PrefectureCatalog::badgeForTitle('大阪府はかせ'))->toBe('/badge/pref/osaka.webp');
    expect(PrefectureCatalog::badgeForTitle('近畿はかせ'))->toBeNull();
    expect(PrefectureCatalog::badgeForTitle('アジアの国旗はかせ'))->toBeNull();
    expect(PrefectureCatalog::badgeForTitle(null))->toBeNull();
    expect(PrefectureCatalog::badgeForName('北海道'))->toBe('/badge/pref/hokkaido.webp');
    expect(PrefectureCatalog::badgeForName('アジア'))->toBeNull();
});
