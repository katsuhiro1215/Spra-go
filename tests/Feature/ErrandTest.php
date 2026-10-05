<?php

use App\Models\UserProfile;
use App\Support\Garden;
use App\Support\QuestionMemory;
use Illuminate\Support\Carbon;
use Illuminate\Testing\TestResponse;

/*
|--------------------------------------------------------------------------
| 今日のおつかい(docs/design/2026-09-27-spru-wave-d-design.md 3-1)
|--------------------------------------------------------------------------
|
| 1日3つ。1つ目は「問題に5問正解する」、2つ目・3つ目はその日に出せるものから選ぶ。
| 進み具合は今ある記録から数え、やりとげたら［受け取る］で学習ポイントがもらえる。
|
*/

/** 回答APIが正解1問ごとに付ける経験値の行を、答えの記録に付ける */
function recordErrandCorrect(UserProfile $profile, int $times = 1): void
{
    foreach (range(1, $times) as $_) {
        $profile->currencyLedger()->create(['type' => 'xp', 'delta' => 10, 'reason' => 'answer_correct']);
    }
}

function recordErrandStageClear(UserProfile $profile): void
{
    $profile->currencyLedger()->create(['type' => 'point', 'delta' => 50, 'reason' => 'stage_clear']);
}

/** @return list<string> */
function errandKinds(TestResponse $response): array
{
    return collect($response->json('errands.items'))->pluck('kind')->all();
}

/** @return array<string, mixed> */
function errandOf(TestResponse $response, string $kind): array
{
    return collect($response->json('errands.items'))->firstWhere('kind', $kind);
}

it('おつかいは1日3つで、1つ目は「問題に5問正解する」。同じ日に何度開いても変わらない', function () {
    $profile = createActiveProfile();

    $first = $this->getJson('/api/world')->assertOk()
        ->assertJsonCount(3, 'errands.items')
        ->assertJsonPath('errands.items.0.kind', 'correct')
        ->assertJsonPath('errands.items.0.target', 5)
        ->json('errands.items');

    expect($this->getJson('/api/world')->json('errands.items'))->toBe($first)
        ->and($profile->errands()->count())->toBe(3);
});

it('出せるものがステージクリアだけの日は、残りを「問題に10問正解する」にする', function () {
    createActiveProfile();

    $items = $this->getJson('/api/world')->json('errands.items');

    expect(collect($items)->map(fn (array $e) => [$e['kind'], $e['target'], $e['giver']['kind']])->all())
        ->toBe([['correct', 5, 'spru'], ['stage_clear', 1, 'spru'], ['correct', 10, 'spru']]);
});

it('出す条件を満たすおつかいが、2つ目・3つ目に出る', function (string $kind) {
    $profile = createActiveProfile();
    match ($kind) {
        'water' => $profile->seeds()->create(['result_key' => 'momo']),
        // 出す日が来た問題を用意する(docs/design/2026-09-29-spaced-review-design.md 4-7)
        'review' => QuestionMemory::record($profile, createQuestionWithChoices()[0]->id, false, now('Asia/Tokyo')->subDays(9)->toDateString()),
        'decorate' => $profile->worldItems()->create(['shop_item_id' => createDecoration()->id]),
        'family_greet' => createFamilyMember($profile),
    };

    $kinds = array_slice(errandKinds($this->getJson('/api/world')), 1);
    sort($kinds);
    $expected = ['stage_clear', $kind];
    sort($expected);

    expect($kinds)->toBe($expected);
})->with(['water', 'review', 'decorate', 'family_greet']);

it('今日もう水をあげた芽では、水やりのおつかいは出ない', function () {
    $profile = createActiveProfile();
    $profile->seeds()->create(['result_key' => 'momo', 'waterings' => 1, 'last_watered_on' => Garden::today()]);

    expect(errandKinds($this->getJson('/api/world')))->toBe(['correct', 'stage_clear', 'correct']);
});

it('3つ目は相棒が頼み、1つ目・2つ目はスプルが頼む', function () {
    $profile = createActiveProfile();
    $profile->companions()->create(['companion_key' => 'momo', 'nickname' => 'モモ']);
    $profile->update(['partner_companion_key' => 'momo']);

    $this->getJson('/api/world')
        ->assertJsonPath('errands.items.0.giver', ['kind' => 'spru', 'key' => null, 'name' => 'スプル'])
        ->assertJsonPath('errands.items.1.giver.kind', 'spru')
        ->assertJsonPath('errands.items.2.giver', ['kind' => 'partner', 'key' => 'momo', 'name' => 'モモ']);
});

it('おつかいは日本時間の0時で新しくなる', function () {
    $profile = createActiveProfile();

    $this->travelTo(Carbon::parse('2026-09-27 14:59:00', 'UTC')); // 日本時間 23:59
    $this->getJson('/api/world')->assertJsonPath('errands.date', '2026-09-27');

    $this->travelTo(Carbon::parse('2026-09-27 15:00:00', 'UTC')); // 日本時間 翌日の0:00
    $this->getJson('/api/world')->assertJsonPath('errands.date', '2026-09-28');

    expect($profile->errands()->count())->toBe(6);
});

it('正解の数は今日の分だけ数え、やり直しは数えない', function () {
    $profile = createActiveProfile();
    [$question, $correct] = createQuestionWithChoices();

    $this->travelTo(Carbon::parse('2026-09-27 14:30:00', 'UTC')); // 日本時間 23:30
    recordErrandCorrect($profile);
    $this->travelTo(Carbon::parse('2026-09-27 15:30:00', 'UTC')); // 日本時間 翌日の0:30
    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $correct->id])->assertOk();
    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $correct->id, 'practice' => true])->assertOk();

    $this->getJson('/api/world')->assertJsonPath('errands.items.0.progress', 1);
});

it('進み具合は目標で止まる', function () {
    $profile = createActiveProfile();
    recordErrandCorrect($profile, 7);

    $this->getJson('/api/world')
        ->assertJsonPath('errands.items.0.progress', 5)
        ->assertJsonPath('errands.items.2.progress', 7);
});

it('ステージクリアと水やりを数える', function () {
    $profile = createActiveProfile();
    $seed = $profile->seeds()->create(['result_key' => 'momo']);
    $before = $this->getJson('/api/world');
    expect(errandOf($before, 'water')['progress'])->toBe(0)
        ->and(errandOf($before, 'stage_clear')['progress'])->toBe(0);

    recordErrandStageClear($profile);
    $seed->update(['waterings' => 1, 'last_watered_on' => Garden::today()]);

    $after = $this->getJson('/api/world');
    expect(errandOf($after, 'water')['progress'])->toBe(1)
        ->and(errandOf($after, 'stage_clear')['progress'])->toBe(1);
});

it('復習をやりきると数える', function () {
    $profile = createActiveProfile();
    [$question] = createQuestionWithChoices();
    QuestionMemory::record($profile, $question->id, false, now('Asia/Tokyo')->subDays(9)->toDateString());
    $this->getJson('/api/world');

    $this->postJson('/api/review/complete')->assertOk();

    expect(errandOf($this->getJson('/api/world'), 'review')['progress'])->toBe(1);
});

it('家族の町にあいさつすると数える', function () {
    $profile = createActiveProfile();
    $sister = createFamilyMember($profile);
    $this->getJson('/api/world');

    $this->postJson("/api/family/{$sister->id}/greet", ['stamp' => 'hello'])->assertOk();

    expect(errandOf($this->getJson('/api/world'), 'family_greet')['progress'])->toBe(1);
});

it('もようがえは置く・動かすを数え、バッグにしまっただけは数えない', function () {
    $profile = createActiveProfile();
    $this->travelTo(Carbon::parse('2026-09-26 03:00:00', 'UTC')); // 前の日に置いておく
    $item = $profile->worldItems()->create(['shop_item_id' => createDecoration()->id, 'x' => 5, 'y' => 5]);
    $this->travelTo(Carbon::parse('2026-09-27 03:00:00', 'UTC'));
    expect(errandOf($this->getJson('/api/world'), 'decorate')['progress'])->toBe(0);

    $this->patchJson("/api/world/items/{$item->id}", ['x' => null, 'y' => null])->assertOk();
    expect(errandOf($this->getJson('/api/world'), 'decorate')['progress'])->toBe(0);

    $this->patchJson("/api/world/items/{$item->id}", ['x' => 5, 'y' => 4])->assertOk();
    expect(errandOf($this->getJson('/api/world'), 'decorate')['progress'])->toBe(1);
});

it('やりとげていないおつかいは受け取れない', function () {
    createActiveProfile();

    $this->postJson('/api/errands/1/claim')->assertStatus(422)->assertJsonPath('message', 'まだおつかいが終わっていないよ');
});

it('受け取ると学習ポイント+20と記録が付き、2回目は受け取れない', function () {
    $profile = createActiveProfile();
    recordErrandCorrect($profile, 5);

    $this->postJson('/api/errands/1/claim')->assertOk()
        ->assertJsonPath('points', 20)
        ->assertJsonPath('gained', ['points' => 20, 'bonus' => 0, 'bond' => 0])
        ->assertJsonPath('partner', null)
        ->assertJsonPath('errands.items.0.claimed', true);

    $this->postJson('/api/errands/1/claim')->assertStatus(422)->assertJsonPath('message', 'もう受け取ったよ');
    expect($profile->fresh()->points)->toBe(20)
        ->and((int) $profile->currencyLedger()->where('reason', 'errand')->sum('delta'))->toBe(20);
});

it('相棒のおつかいは、受け取った時点の相棒のなかよし度も+3する', function () {
    $profile = createActiveProfile();
    $momo = $profile->companions()->create(['companion_key' => 'momo', 'bond' => 18]);
    $lumi = $profile->companions()->create(['companion_key' => 'lumi', 'bond' => 18]);
    $profile->update(['partner_companion_key' => 'momo']);
    $this->getJson('/api/world')->assertJsonPath('errands.items.2.giver.key', 'momo');
    $this->postJson('/api/world/partner', ['key' => 'lumi'])->assertOk();
    recordErrandCorrect($profile, 10);

    $this->postJson('/api/errands/3/claim')->assertOk()
        ->assertJsonPath('gained.bond', 3)
        ->assertJsonPath('partner.key', 'lumi')
        ->assertJsonPath('partner.hearts_up', true);

    expect($lumi->fresh()->bond)->toBe(21)
        ->and($momo->fresh()->bond)->toBe(18);
});

it('3つ目を受け取ると、おまけの+30も付く', function () {
    $profile = createActiveProfile();
    recordErrandCorrect($profile, 10);
    recordErrandStageClear($profile);

    $this->postJson('/api/errands/1/claim')->assertJsonPath('gained.bonus', 0);
    $this->postJson('/api/errands/2/claim')->assertJsonPath('gained.bonus', 0);
    $this->postJson('/api/errands/3/claim')->assertOk()
        ->assertJsonPath('gained.bonus', 30)
        ->assertJsonPath('errands.bonus', ['amount' => 30, 'claimed' => true, 'gift_left' => 14]);

    expect($profile->fresh()->points)->toBe(90)
        ->and($profile->currencyLedger()->where('reason', 'errand_bonus')->count())->toBe(1);
});

it('ほかのプロフィールの記録やおつかいには触れない', function () {
    $me = createActiveProfile();
    $sister = createFamilyMember($me);
    recordErrandCorrect($sister, 5);

    $this->postJson('/api/errands/1/claim')->assertStatus(422);

    $this->withSession(['active_profile_id' => $sister->id]);
    $this->postJson('/api/errands/1/claim')->assertOk();
    expect($me->errands()->whereNotNull('claimed_at')->count())->toBe(0);
});

it('日が変わった後の受け取りは、新しい日のおつかいで確かめる', function () {
    $profile = createActiveProfile();
    $this->travelTo(Carbon::parse('2026-09-27 03:00:00', 'UTC'));
    recordErrandCorrect($profile, 5);
    $this->getJson('/api/world');

    $this->travelTo(Carbon::parse('2026-09-28 03:00:00', 'UTC'));
    $this->postJson('/api/errands/1/claim')->assertStatus(422)->assertJsonPath('message', 'まだおつかいが終わっていないよ');

    // 画面は町の情報を読み直し、新しい日のおつかいを出す
    $this->getJson('/api/world')
        ->assertJsonPath('errands.date', '2026-09-28')
        ->assertJsonPath('errands.items.0.progress', 0)
        ->assertJsonPath('errands.items.0.claimed', false);
});

it('無い番号のおつかいは見つからない', function () {
    createActiveProfile();

    $this->postJson('/api/errands/4/claim')->assertNotFound();
});

// パンとやさいのずかん(docs/design/2026-10-05-bread-zukan-design.md)
it('3つ目を受け取ると、ずかんのおくりものが1つ付く。1つ目・2つ目では付かない', function () {
    $profile = createActiveProfile();
    recordErrandCorrect($profile, 10);
    recordErrandStageClear($profile);

    $this->postJson('/api/errands/1/claim')->assertOk()->assertJsonPath('gift', null);
    $this->postJson('/api/errands/2/claim')->assertOk()->assertJsonPath('gift', null);
    expect($profile->zukan()->count())->toBe(0);

    $response = $this->postJson('/api/errands/3/claim')->assertOk()
        ->assertJsonPath('gained', ['points' => 20, 'bonus' => 30, 'bond' => 0])
        ->assertJsonStructure(['gift' => ['key', 'name', 'english', 'kind']]);

    expect($profile->zukan()->pluck('item_key')->all())->toBe([$response->json('gift.key')]);
});

it('同じおつかいをもう一度受け取ろうとしても、おくりものは増えない', function () {
    $profile = createActiveProfile();
    recordErrandCorrect($profile, 10);
    recordErrandStageClear($profile);
    foreach ([1, 2, 3] as $slot) {
        $this->postJson("/api/errands/{$slot}/claim")->assertOk();
    }

    $this->postJson('/api/errands/3/claim')->assertStatus(422)->assertJsonPath('message', 'もう受け取ったよ');

    expect($profile->zukan()->count())->toBe(1);
});

it('ずかんが15個そろっている日は、おくりものは null で、ポイントとおまけは今までどおり', function () {
    $profile = createActiveProfile();
    foreach (array_keys(config('zukan.items')) as $key) {
        $profile->zukan()->create(['item_key' => $key, 'received_at' => now()]);
    }
    recordErrandCorrect($profile, 10);
    recordErrandStageClear($profile);

    $this->postJson('/api/errands/1/claim')->assertOk();
    $this->postJson('/api/errands/2/claim')->assertOk();
    $this->postJson('/api/errands/3/claim')->assertOk()
        ->assertJsonPath('gift', null)
        ->assertJsonPath('gained.bonus', 30)
        ->assertJsonPath('errands.bonus.gift_left', 0);

    expect($profile->zukan()->count())->toBe(15)->and($profile->fresh()->points)->toBe(90);
});

it('町の窓口のおつかいに、あと何個贈れるか(gift_left)が出る', function () {
    $profile = createActiveProfile();
    $profile->zukan()->create(['item_key' => 'melon_bread', 'received_at' => now()]);
    $profile->zukan()->create(['item_key' => 'anpan', 'received_at' => now()]);

    $this->getJson('/api/world')->assertOk()->assertJsonPath('errands.bonus.gift_left', 13);
});
