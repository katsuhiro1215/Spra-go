<?php

use App\Models\Admin;
use App\Models\Country;
use App\Models\Owner;
use App\Models\Question;
use App\Models\Stage;
use App\Models\User;
use App\Models\Word;

/*
|--------------------------------------------------------------------------
| 本番の初回の中身の入れ方(docs/design/2026-10-10-production-env-design.md 11章)
| まっさらなDBに `production:bootstrap` を流して、開発のDBとほぼ同じ中身になることを確かめる(予行演習で確認した手順を固定)
|--------------------------------------------------------------------------
*/

it('production:bootstrap は、まっさらなDBに中身を最後まで入れ、試験用アカウントは作らず、2回流しても増えない', function () {
    $this->artisan('production:bootstrap')->assertSuccessful();

    // 件数は、開発のDB(問題 13,862・ステージ 730・英語の単語 3,500)に近い。コンテンツが増えたらこの下限を上げる
    expect(Question::count())->toBeGreaterThan(13000)
        ->and(Stage::count())->toBeGreaterThan(700)
        ->and(Word::count())->toBe(3500)
        ->and(Country::count())->toBeGreaterThan(40)
        ->and(User::count() + Owner::count() + Admin::count())->toBe(0);
    $first = Question::count();

    // 本番で内容を足したあとに流し直しても、壊れず増えない
    $this->artisan('production:bootstrap')->assertSuccessful();

    expect(Question::count())->toBe($first);
})->group('bootstrap');
