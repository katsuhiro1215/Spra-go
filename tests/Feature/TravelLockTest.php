<?php

use App\Models\Category;
use App\Models\Country;
use App\Models\ProfileStageProgress;
use App\Models\Region;
use App\Models\Stage;
use App\Models\UserProfile;

/*
|--------------------------------------------------------------------------
| 学ぶの鍵とチケットの知らせ(docs/design/2026-09-28-travel-tickets-design.md 3-6・4-3)
|--------------------------------------------------------------------------
|
| 鍵の国(旅の行き先のうち、まだ着いていない国)は、国・地域の画面もステージも開けない。
| 日本・着いた国・行き先でない国・国のないステージは開ける。
|
*/

/** そのステージに問題を1つ付ける(ステージを開くAPIは問題がないと404のため) */
function withQuestion(Stage $stage): Stage
{
    [$question] = createQuestionWithChoices();
    $stage->questions()->attach($question->id, ['order' => 1]);

    return $stage;
}

function beginnerStage(Country $country, bool $boss = false): Stage
{
    return withQuestion(Stage::query()->where('country_id', $country->id)->where('difficulty', '初級')->where('is_boss', $boss)->firstOrFail());
}

function landIn(UserProfile $profile, string $key): void
{
    $profile->trips()->create(['destination' => $key, 'arrived_at' => now()]);
}

it('鍵の国のステージは、開くのも終えるのも403', function () {
    createActiveProfile();
    $stage = beginnerStage(createTravelCountry('us', 'アメリカ'));

    $this->getJson("/api/stages/{$stage->id}")->assertForbidden()->assertJsonPath('message', 'まだこの国に着いていません。');
    $this->postJson("/api/stages/{$stage->id}/complete", ['score' => 1])->assertForbidden();

    expect(ProfileStageProgress::query()->count())->toBe(0);
});

it('鍵の国の画面と地域の画面は403', function () {
    createActiveProfile();
    $us = createTravelCountry('us', 'アメリカ');
    $region = Region::create(['country_id' => $us->id, 'name' => 'ニューヨーク']);

    $this->getJson("/api/countries/{$us->id}")->assertForbidden();
    $this->getJson("/api/regions/{$region->id}")->assertForbidden();
});

it('日本・着いた国・行き先でない国・国のないステージは開ける', function () {
    $profile = createActiveProfile();
    $japan = createTravelCountry('jp', '日本');
    $us = createTravelCountry('us', 'アメリカ');
    $italy = createTravelCountry('it', 'イタリア');
    $noCountry = withQuestion(Stage::create(['category_id' => Category::create(['name' => '国なし'])->id, 'difficulty' => '初級', 'stage_number' => 1]));
    landIn($profile, 'us');

    foreach ([beginnerStage($japan), beginnerStage($us), beginnerStage($italy), $noCountry] as $stage) {
        $this->getJson("/api/stages/{$stage->id}")->assertOk();
    }
    $this->getJson("/api/countries/{$japan->id}")->assertOk();
    $this->getJson("/api/countries/{$us->id}")->assertOk();
});

it('ほかのプロフィールが着いた国は鍵のまま', function () {
    $profile = createActiveProfile();
    $stage = beginnerStage(createTravelCountry('us', 'アメリカ'));
    landIn(createFamilyMember($profile), 'us');

    $this->getJson("/api/stages/{$stage->id}")->assertForbidden();
});

it('ミニアプリの一覧から鍵の国のステージを外す(アメリカとイギリスが共有する英語を学ぶ)', function () {
    $profile = createActiveProfile();
    $us = createTravelCountry('us', 'アメリカ');
    $gb = createTravelCountry('gb', 'イギリス');
    $english = Category::create(['name' => '英語を学ぶ', 'is_language_mode' => true]);
    $usStage = Stage::create(['category_id' => $english->id, 'country_id' => $us->id, 'difficulty' => '初級', 'stage_number' => 1]);
    $gbStage = Stage::create(['category_id' => $english->id, 'country_id' => $gb->id, 'difficulty' => '初級', 'stage_number' => 1]);
    landIn($profile, 'gb');

    $ids = collect($this->getJson("/api/categories/{$english->id}/stages")->assertOk()->json('0.stages'))->pluck('id')->all();

    expect($ids)->toBe([$gbStage->id])->and($ids)->not->toContain($usStage->id);
});

it('日本の初級のボスを初めて倒すと ticket_earned が true。2回目とふつうのステージは false', function () {
    createActiveProfile();
    $japan = createTravelCountry('jp', '日本');
    $boss = beginnerStage($japan, true);
    $normal = beginnerStage($japan);

    $this->postJson("/api/stages/{$normal->id}/complete", ['score' => 1])->assertOk()->assertJsonPath('ticket_earned', false);
    $this->postJson("/api/stages/{$boss->id}/complete", ['score' => 1])->assertOk()->assertJsonPath('ticket_earned', true);
    $this->postJson("/api/stages/{$boss->id}/complete", ['score' => 1])->assertOk()->assertJsonPath('ticket_earned', false);
});

it('チケットが0のままなら ticket_earned は false(着いた国がもらった数より多いとき)', function () {
    $profile = createActiveProfile();
    $boss = beginnerStage(createTravelCountry('jp', '日本'), true);
    landIn($profile, 'us');
    landIn($profile, 'gb');

    $this->postJson("/api/stages/{$boss->id}/complete", ['score' => 1])->assertOk()->assertJsonPath('ticket_earned', false);
});

it('5か国ぜんぶ着いたあとは、ボスを倒しても ticket_earned は false', function () {
    $profile = createActiveProfile();
    $boss = beginnerStage(createTravelCountry('jp', '日本'), true);
    foreach (['id', 'kr', 'us', 'gb', 'fr'] as $key) {
        landIn($profile, $key);
    }

    $this->postJson("/api/stages/{$boss->id}/complete", ['score' => 1])->assertOk()->assertJsonPath('ticket_earned', false);
});
