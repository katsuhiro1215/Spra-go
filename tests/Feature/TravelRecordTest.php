<?php

use App\Models\ProfileStageProgress;
use App\Models\Stage;
use App\Support\Travel;
use Illuminate\Support\Carbon;

/*
|--------------------------------------------------------------------------
| 今のデータの記録とパスポートの旅した国(docs/design/2026-09-28-travel-tickets-design.md 3-7・4-3)
|--------------------------------------------------------------------------
*/

it('ステージをクリアしている行き先の国を、最初にクリアした日に着いた国として記録する', function () {
    $profile = createActiveProfile();
    $us = createTravelCountry('us', 'アメリカ');
    $stages = Stage::query()->where('country_id', $us->id)->get();
    ProfileStageProgress::create(['user_profile_id' => $profile->id, 'stage_id' => $stages[1]->id, 'cleared_at' => Carbon::parse('2026-09-20 10:00:00')]);
    ProfileStageProgress::create(['user_profile_id' => $profile->id, 'stage_id' => $stages[0]->id, 'cleared_at' => Carbon::parse('2026-09-10 09:00:00')]);

    Travel::recordTripsForClearedCountries();

    $trip = $profile->trips()->sole();
    expect($trip->destination)->toBe('us')
        ->and($trip->arrived_at->toDateTimeString())->toBe('2026-09-10 09:00:00');
});

it('クリアしていない国・行き先でない国・日本は記録しない', function () {
    $profile = createActiveProfile();
    createTravelCountry('gb', 'イギリス');
    clearCountryStage($profile, createTravelCountry('it', 'イタリア'), '初級', false);
    clearCountryStage($profile, createTravelCountry('jp', '日本'), '初級', true);
    ProfileStageProgress::create([
        'user_profile_id' => $profile->id,
        'stage_id' => Stage::query()->where('country_id', createTravelCountry('fr', 'フランス')->id)->firstOrFail()->id,
        'cleared_at' => null,
    ]);

    Travel::recordTripsForClearedCountries();

    expect($profile->trips()->count())->toBe(0);
});

it('もう着いている国は足さず、着いた日も変えない', function () {
    $profile = createActiveProfile();
    $profile->trips()->create(['destination' => 'us', 'arrived_at' => Carbon::parse('2026-09-27 12:00:00')]);
    clearCountryStage($profile, createTravelCountry('us', 'アメリカ'), '初級', false);

    Travel::recordTripsForClearedCountries();

    expect($profile->trips()->count())->toBe(1)
        ->and($profile->trips()->sole()->arrived_at->toDateTimeString())->toBe('2026-09-27 12:00:00');
});

it('パスポートの trips は、着いた国を着いた順に乗り物つきで返す', function () {
    $profile = createActiveProfile();
    $profile->trips()->create(['destination' => 'kr', 'arrived_at' => Carbon::parse('2026-09-21 10:00:00')]);
    $profile->trips()->create(['destination' => 'us', 'arrived_at' => Carbon::parse('2026-09-20 10:00:00')]);

    $this->getJson('/api/passport')->assertOk()->assertJsonPath('trips', [
        ['key' => 'us', 'name' => 'アメリカ', 'flag' => '/flag/us.svg', 'transport' => 'plane', 'arrived_at' => '2026-09-20'],
        ['key' => 'kr', 'name' => '韓国', 'flag' => '/flag/kr.svg', 'transport' => 'ship', 'arrived_at' => '2026-09-21'],
    ]);
});

it('プロフィールを選んでいなければ、パスポートの trips は空', function () {
    $profile = createActiveProfile();
    $profile->trips()->create(['destination' => 'us', 'arrived_at' => now()]);

    $this->withSession(['active_profile_id' => null])->getJson('/api/passport')->assertOk()->assertJsonPath('trips', []);
});
