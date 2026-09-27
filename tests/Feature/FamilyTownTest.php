<?php

use App\Models\ProfileGreeting;
use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Support\Carbon;

/*
|--------------------------------------------------------------------------
| 家族の町とあいさつ(docs/design/2026-09-27-spru-wave-d-design.md 3-4)
|--------------------------------------------------------------------------
|
| 同じ家族アカウントのほかのプレイヤーの町を「見るだけ」で見に行き、
| 決まったことばで1人に1日1回あいさつを送れる。
|
*/

function createOtherFamilyProfile(): UserProfile
{
    $user = User::factory()->create();

    return $user->schema()->create(['name' => 'よその家族'])->profiles()->create(['name' => 'よその子']);
}

/** 同じログインのまま、選んでいるプロフィールを替える */
function actAsProfile(UserProfile $profile): void
{
    test()->withSession(['active_profile_id' => $profile->id]);
}

it('家族の一覧は、同じ家族の自分以外を作った順に出す', function () {
    $me = createActiveProfile();
    $sister = createFamilyMember($me, 'いもうと');
    $brother = createFamilyMember($me, 'おにいちゃん');
    createOtherFamilyProfile();

    $this->getJson('/api/family')->assertOk()->assertExactJson([
        ['id' => $sister->id, 'name' => 'いもうと', 'level' => 1, 'greeted_today' => false],
        ['id' => $brother->id, 'name' => 'おにいちゃん', 'level' => 1, 'greeted_today' => false],
    ]);
});

it('町のAPIに、家族のほかのプレイヤーの数が出る', function () {
    $me = createActiveProfile();
    $this->getJson('/api/world')->assertJsonPath('family_count', 0);

    createFamilyMember($me);

    $this->getJson('/api/world')->assertJsonPath('family_count', 1);
});

it('家族の町は、置いたアイテム・仲間・スプル・畑の見た目だけを見せる', function () {
    $me = createActiveProfile();
    $sister = createFamilyMember($me, 'いもうと');
    $sister->update(['level' => 5, 'bloom_base_level' => 4, 'points' => 500]);
    $bench = createDecoration();
    $placed = $sister->worldItems()->create(['shop_item_id' => $bench->id, 'x' => 5, 'y' => 5]);
    $sister->worldItems()->create(['shop_item_id' => $bench->id]);
    $sister->seeds()->create(['result_key' => 'momo', 'waterings' => 1]);
    $sister->companions()->create(['companion_key' => 'lumi', 'nickname' => 'ピカ']);
    $sister->update(['partner_companion_key' => 'lumi']);

    $response = $this->getJson("/api/family/{$sister->id}")->assertOk()
        ->assertJsonPath('profile', ['id' => $sister->id, 'name' => 'いもうと', 'level' => 5])
        ->assertJsonCount(1, 'items')
        ->assertJsonPath('items.0.id', $placed->id)
        ->assertJsonPath('spru.growth', 1)
        ->assertJsonPath('garden', ['x' => 1, 'y' => 2, 'state' => 'sprout'])
        ->assertJsonPath('companions.0.name', 'ピカ')
        ->assertJsonPath('companions.0.is_partner', true)
        ->assertJsonPath('land.width', 12)
        ->assertJsonPath('greeted_today', false);

    expect(array_keys($response->json()))->toEqualCanonicalizing(['profile', 'land', 'items', 'spru', 'garden', 'companions', 'greeted_today'])
        ->and($response->getContent())->not->toContain('momo');
});

it('ほかの家族の町は見つからず、自分の町は開けない', function () {
    $me = createActiveProfile();
    $other = createOtherFamilyProfile();

    $this->getJson("/api/family/{$other->id}")->assertNotFound();
    $this->getJson("/api/family/{$me->id}")->assertStatus(422)->assertJsonPath('message', '自分の町だよ');
    $this->getJson('/api/family/999999')->assertNotFound();
});

it('あいさつは1人に1日1回で、送ると一覧と町に印が付く', function () {
    $me = createActiveProfile();
    $sister = createFamilyMember($me);

    $this->postJson("/api/family/{$sister->id}/greet", ['stamp' => 'hello'])->assertOk()->assertJsonPath('greeted_today', true);
    $this->postJson("/api/family/{$sister->id}/greet", ['stamp' => 'cheer'])
        ->assertStatus(422)
        ->assertJsonPath('message', '今日はもうあいさつしたよ');

    $this->getJson('/api/family')->assertJsonPath('0.greeted_today', true);
    $this->getJson("/api/family/{$sister->id}")->assertJsonPath('greeted_today', true);
    expect(ProfileGreeting::query()->count())->toBe(1);
});

it('あいさつは日本時間の0時を過ぎると、また送れる', function () {
    $me = createActiveProfile();
    $sister = createFamilyMember($me);

    $this->travelTo(Carbon::parse('2026-09-27 14:59:00', 'UTC')); // 日本時間 23:59
    $this->postJson("/api/family/{$sister->id}/greet", ['stamp' => 'hello'])->assertOk();

    $this->travelTo(Carbon::parse('2026-09-27 15:00:00', 'UTC')); // 日本時間 翌日の0:00
    $this->postJson("/api/family/{$sister->id}/greet", ['stamp' => 'hello'])->assertOk();
});

it('決まったことば以外・自分宛て・ほかの家族へは送れない', function () {
    $me = createActiveProfile();
    $sister = createFamilyMember($me);
    $other = createOtherFamilyProfile();

    $this->postJson("/api/family/{$sister->id}/greet", ['stamp' => 'こんにちは'])->assertStatus(422);
    $this->postJson("/api/family/{$sister->id}/greet", [])->assertStatus(422);
    $this->postJson("/api/family/{$me->id}/greet", ['stamp' => 'hello'])->assertStatus(422);
    $this->postJson("/api/family/{$other->id}/greet", ['stamp' => 'hello'])->assertNotFound();

    expect(ProfileGreeting::query()->count())->toBe(0);
});

it('届いたあいさつは受け取った人の町のAPIに出て、見た印を付けると出なくなる', function () {
    $me = createActiveProfile();
    $sister = createFamilyMember($me, 'いもうと');
    actAsProfile($sister);
    $this->postJson("/api/family/{$me->id}/greet", ['stamp' => 'nice_town'])->assertOk();

    actAsProfile($me);
    $greeting = $this->getJson('/api/world')->assertJsonCount(1, 'greetings')->json('greetings.0');
    expect($greeting)->toMatchArray([
        'from' => ['id' => $sister->id, 'name' => 'いもうと'],
        'stamp' => 'nice_town',
        'text' => 'すてきな町だね！',
    ]);

    $this->postJson('/api/world/greetings/seen', ['ids' => [$greeting['id']]])->assertOk()->assertJsonPath('greetings', []);
    $this->getJson('/api/world')->assertJsonPath('greetings', []);
});

it('ほかの人宛てのあいさつには、見た印を付けられない', function () {
    $me = createActiveProfile();
    $sister = createFamilyMember($me);
    $this->postJson("/api/family/{$sister->id}/greet", ['stamp' => 'hello'])->assertOk();
    $greeting = ProfileGreeting::query()->firstOrFail();

    $this->postJson('/api/world/greetings/seen', ['ids' => [$greeting->id]])->assertOk();

    expect($greeting->fresh()->seen_at)->toBeNull();
});

it('町のAPIに出すあいさつは、新しい順に10件まで', function () {
    $me = createActiveProfile();
    $sister = createFamilyMember($me);
    foreach (range(1, 12) as $day) {
        ProfileGreeting::create([
            'from_profile_id' => $sister->id,
            'to_profile_id' => $me->id,
            'stamp' => 'hello',
            'greeted_on' => sprintf('2026-09-%02d', $day),
        ]);
    }

    $greetings = $this->getJson('/api/world')->assertJsonCount(10, 'greetings')->json('greetings');

    expect($greetings[0]['greeted_on'])->toBe('2026-09-12');
});
