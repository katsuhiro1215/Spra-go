<?php

use App\Models\Category;
use App\Models\ProfileQuestionMemory;
use App\Models\ProfileWord;
use App\Models\Question;
use App\Models\Stage;
use App\Models\UserProfile;
use App\Support\QuestionMemory;
use App\Support\Review;
use App\Support\ReviewPicker;
use Illuminate\Support\Carbon;

/*
|--------------------------------------------------------------------------
| 復習の出し方の優先順位(docs/design/2026-10-09-review-priority-design.md)
|--------------------------------------------------------------------------
|
| 枠: 最近まちがえた(7日以内)・苦手の語(出す日前でも3日あければ)・あと1回で覚える(段階5)。
| 残りは、出す日が古い順(いちばん遅れている問題)。
|
*/

beforeEach(function () {
    $this->travelTo(Carbon::parse('2026-10-09 03:00:00', 'UTC')); // 日本時間 10/09 12:00
});

/** 覚え具合の行を直接作る(段階・出す日などを自由に決める)。既定は「10/08が出す日・段階1」 */
function pickerMemory(UserProfile $profile, array $attributes = [], ?Question $question = null): Question
{
    $question ??= createQuestionWithChoices()[0];
    ProfileQuestionMemory::create($attributes + [
        'user_profile_id' => $profile->id,
        'question_id' => $question->id,
        'level' => 1,
        'due_on' => '2026-10-08',
        'mastered_on' => null,
        'last_answered_on' => '2026-10-07',
        'wrong_on' => null,
    ]);

    return $question;
}

/** 苦手にした語の問題を作る(meta.word_id つき)。$memory はその問題の覚え具合 */
function pickerWeak(UserProfile $profile, array $memory = [], string $status = 'weak'): Question
{
    [$question] = createQuestionWithChoices();
    $word = makeWord('picker'.uniqid());
    $question->update(['meta' => ['kind' => 'word', 'word' => $word->word, 'word_id' => $word->id]]);
    ProfileWord::create(['user_profile_id' => $profile->id, 'word_id' => $word->id, 'seen_at' => now(), 'status' => $status]);

    return pickerMemory($profile, $memory, $question);
}

it('最近まちがえた問題: 7日以内にまちがえて、出す日が来ているものを、新しい順に出す', function () {
    $profile = createActiveProfile();
    $older = pickerMemory($profile, ['wrong_on' => '2026-10-03', 'due_on' => '2026-10-04']);
    $newer = pickerMemory($profile, ['wrong_on' => '2026-10-08', 'due_on' => '2026-10-09']);
    pickerMemory($profile, ['wrong_on' => '2026-10-01', 'due_on' => '2026-10-02']); // 8日前: 最近ではない
    pickerMemory($profile, ['wrong_on' => '2026-10-09', 'due_on' => '2026-10-10']); // 今日まちがえた: 出す日は明日
    pickerMemory($profile); // まちがえていない

    expect(QuestionMemory::slotIds($profile, 'recent_wrong', 10))->toBe([$newer->id, $older->id]);
});

it('あと1回で覚える問題: 段階5で出す日が来ているものだけ。出す日が古い順', function () {
    $profile = createActiveProfile();
    $second = pickerMemory($profile, ['level' => 5, 'due_on' => '2026-10-07']);
    $first = pickerMemory($profile, ['level' => 5, 'due_on' => '2026-10-01']);
    pickerMemory($profile, ['level' => 4, 'due_on' => '2026-10-01']);
    pickerMemory($profile, ['level' => 5, 'due_on' => '2026-10-10']); // まだ

    expect(QuestionMemory::slotIds($profile, 'almost', 10))->toBe([$first->id, $second->id]);
});

it('苦手の語: 出す日が来ていれば出る。来ていなくても、最後に答えてから3日あいていれば出る(2日では出ない)', function () {
    $profile = createActiveProfile();
    $due = pickerWeak($profile, ['due_on' => '2026-10-08', 'last_answered_on' => '2026-10-08']);
    $gap3 = pickerWeak($profile, ['level' => 3, 'due_on' => '2026-10-14', 'last_answered_on' => '2026-10-06']);
    pickerWeak($profile, ['level' => 3, 'due_on' => '2026-10-14', 'last_answered_on' => '2026-10-07']); // 2日
    $mastered = pickerWeak($profile, ['level' => 5, 'due_on' => null, 'mastered_on' => '2026-09-01', 'last_answered_on' => '2026-09-01']);

    // 最後に答えた日が古い順
    expect(QuestionMemory::slotIds($profile, 'weak', 10))->toBe([$mastered->id, $gap3->id, $due->id]);
});

it('苦手の語: 覚えたマークの語・語のない問題は、出す日が来ていなければ出ない。語のない問題でも壊れない', function () {
    $profile = createActiveProfile();
    pickerWeak($profile, ['level' => 3, 'due_on' => '2026-10-14', 'last_answered_on' => '2026-09-20'], 'learned');
    pickerMemory($profile, ['level' => 3, 'due_on' => '2026-10-14', 'last_answered_on' => '2026-09-20']); // 語のない問題

    expect(QuestionMemory::slotIds($profile, 'weak', 10))->toBe([]);
});

it('枠の共通の決まり: 除く問題・国旗キャッチ専用・鍵の国は出ない。国の優先は先に並ぶ。limit 0 は空', function () {
    $profile = createActiveProfile();
    $us = createTravelCountry('us', 'アメリカ');
    $gb = createTravelCountry('gb', 'イギリス');
    $profile->trips()->create(['destination' => 'gb', 'arrived_at' => now()]);

    $base = ['wrong_on' => '2026-10-07', 'due_on' => '2026-10-08'];
    $other = pickerMemory($profile, $base);
    $mine = pickerMemory($profile, $base);
    $mine->update(['country_id' => $gb->id]);
    $locked = pickerMemory($profile, $base);
    $locked->update(['country_id' => $us->id]);
    $catchOnly = pickerMemory($profile, $base);
    $catchOnly->update(['meta' => ['flag_key' => 'catch:test', 'catch_only' => true]]);
    $excluded = pickerMemory($profile, $base);

    $ids = QuestionMemory::slotIds($profile, 'recent_wrong', 10, [$excluded->id], $gb->id);

    expect($ids)->toBe([$mine->id, $other->id])
        ->and(QuestionMemory::slotIds($profile, 'recent_wrong', 0))->toBe([]);
});

/** いちばん遅れている問題(まちがえていない・段階1・出す日が古い)を $count 個作る。出す日は 9/02 から1日ずつ後ろへ */
function pickerOverdue(UserProfile $profile, int $count): array
{
    return collect(range(1, $count))->map(fn (int $i) => pickerMemory($profile, [
        'due_on' => Carbon::parse('2026-09-01')->addDays($i)->toDateString(),
        'last_answered_on' => '2026-08-31',
    ]))->pluck('id')->all();
}

it('毎日の復習: 出す日が来た古い問題が山のようにあっても、最近まちがえた問題が先に入る(最大3問)。残りは古い順', function () {
    $profile = createActiveProfile();
    $overdue = pickerOverdue($profile, 20);
    $wrong = collect(range(1, 4))->map(fn (int $i) => pickerMemory($profile, [
        'wrong_on' => Carbon::parse('2026-10-04')->addDays($i)->toDateString(), 'due_on' => '2026-10-08',
    ])->id)->all(); // wrong_on 10/05〜10/08

    $ids = ReviewPicker::daily($profile);

    // 新しい順の上位3問(10/08, 10/07, 10/06)。4問目は古い順の山に回り、出す日が10/08なので入らない
    expect($ids)->toHaveCount(10)
        ->and(array_slice($ids, 0, 3))->toBe([$wrong[3], $wrong[2], $wrong[1]])
        ->and(array_slice($ids, 3))->toBe(array_slice($overdue, 0, 7));
});

it('毎日の復習: 各枠が上限まで入り、「いちばん遅れている問題」が3問残る。同じ問題は2回入らない', function () {
    $profile = createActiveProfile();
    $overdue = pickerOverdue($profile, 6);
    $wrong = collect(range(1, 5))->map(fn () => pickerMemory($profile, ['wrong_on' => '2026-10-07', 'due_on' => '2026-10-08'])->id)->all();
    $weak = collect(range(1, 5))->map(fn () => pickerWeak($profile, ['level' => 3, 'due_on' => '2026-10-20', 'last_answered_on' => '2026-10-01'])->id)->all();
    $almost = collect(range(1, 5))->map(fn () => pickerMemory($profile, ['level' => 5, 'due_on' => '2026-10-08'])->id)->all();
    // まちがえた＋苦手＋段階5の問題は、1回だけ入る
    $triple = pickerWeak($profile, ['level' => 5, 'wrong_on' => '2026-10-08', 'due_on' => '2026-10-08', 'last_answered_on' => '2026-10-08']);

    $ids = ReviewPicker::daily($profile);

    expect($ids)->toHaveCount(10)
        ->and(array_unique($ids))->toHaveCount(10)
        ->and(count(array_intersect($ids, [...$wrong, $triple->id])))->toBe(3)
        ->and(count(array_intersect($ids, $weak)))->toBe(2)
        ->and(count(array_intersect($ids, $almost)))->toBe(2)
        ->and(array_slice($ids, 7))->toBe(array_slice($overdue, 0, 3)); // 古い順の最後の3問(山の先頭)
});

it('毎日の復習: 使われなかった枠は古い順で埋まる。出す日が来た問題が少ないときは、今までと同じ古い順', function () {
    $profile = createActiveProfile();
    $overdue = pickerOverdue($profile, 4);

    expect(ReviewPicker::daily($profile))->toBe($overdue);
});

it('毎日の復習: 出す日が来た問題がなく、苦手の語だけがあるときも、その語を出す。枠の合計より小さい limit は、枠の順に切り詰める', function () {
    $profile = createActiveProfile();
    $weak = pickerWeak($profile, ['level' => 3, 'due_on' => '2026-10-20', 'last_answered_on' => '2026-10-01']);

    expect(ReviewPicker::daily($profile))->toBe([$weak->id]);

    $wrong = collect(range(1, 3))->map(fn () => pickerMemory($profile, ['wrong_on' => '2026-10-07', 'due_on' => '2026-10-08'])->id)->all();

    expect(ReviewPicker::daily($profile, 2))->toHaveCount(2)
        ->and(array_diff(ReviewPicker::daily($profile, 2), $wrong))->toBe([]);
});

it('ステージのおさらい: 先頭の1問は最近まちがえた問題(その国を先に)。残りは古い順。ステージ自身の問題は除く', function () {
    $profile = createActiveProfile();
    $gb = createTravelCountry('gb', 'イギリス');
    $profile->trips()->create(['destination' => 'gb', 'arrived_at' => now()]);
    $overdue = pickerOverdue($profile, 3);
    $otherWrong = pickerMemory($profile, ['wrong_on' => '2026-10-08', 'due_on' => '2026-10-09']);
    $mineWrong = pickerMemory($profile, ['wrong_on' => '2026-10-06', 'due_on' => '2026-10-07']);
    $mineWrong->update(['country_id' => $gb->id]);
    $stageOwn = pickerMemory($profile, ['wrong_on' => '2026-10-08', 'due_on' => '2026-10-09']);

    $ids = ReviewPicker::stage($profile, [$stageOwn->id], $gb->id);

    // 先頭 = その国のまちがえた問題(国を先に)。2問目 = 古い順(ステージの問題と先頭の問題は除く)
    expect($ids)->toBe([$mineWrong->id, $overdue[0]]);
    expect(ReviewPicker::stage($profile, [$stageOwn->id], null)[0])->toBe($otherWrong->id);
});

it('ステージのおさらい: まちがえた問題がなければ、苦手の語 → あと1回の順。何もなければ空', function () {
    $profile = createActiveProfile();

    expect(ReviewPicker::stage($profile, [], null))->toBe([]);

    $almost = pickerMemory($profile, ['level' => 5, 'due_on' => '2026-10-01']);
    $weak = pickerWeak($profile, ['level' => 3, 'due_on' => '2026-10-20', 'last_answered_on' => '2026-10-01']);

    // 先頭は苦手の語(まちがえた問題がないので)。2問目はいちばん遅れている問題(段階5の問題。出す日が来ている)
    expect(ReviewPicker::stage($profile, [], null))->toBe([$weak->id, $almost->id]);
});

it('仲間からの復習(Review): 山があっても、昨日まちがえた問題が入る', function () {
    $profile = createActiveProfile();
    pickerOverdue($profile, 12);
    QuestionMemory::record($profile, ($yesterday = createQuestionWithChoices()[0])->id, false, '2026-10-08');

    expect(Review::questionIds($profile))->toContain($yesterday->id)
        ->and(Review::questionIds($profile))->toHaveCount(10);
});

it('町のAPIの復習: 出す日が来た問題がなく、苦手の語だけがあっても available になる', function () {
    $profile = createActiveProfile();
    pickerWeak($profile, ['level' => 3, 'due_on' => '2026-10-20', 'last_answered_on' => '2026-10-01']);

    $this->getJson('/api/world')->assertOk()
        ->assertJsonPath('review.available', true)
        ->assertJsonPath('review.count', 1);
});

it('ステージのおさらい: 山があっても、昨日まちがえた問題が review として入る', function () {
    $profile = createActiveProfile();
    $category = Category::create(['name' => '優先のカテゴリ'.uniqid()]);
    $stage = Stage::create(['category_id' => $category->id, 'difficulty' => '初級', 'stage_number' => 1, 'is_boss' => false, 'question_count' => 1]);
    [$own] = createQuestionWithChoices();
    $stage->questions()->attach($own->id, ['order' => 1]);
    $overdue = pickerOverdue($profile, 5);
    QuestionMemory::record($profile, ($yesterday = createQuestionWithChoices()[0])->id, false, '2026-10-08');
    // 前の問題は、同じカテゴリの別のステージにある(おさらいは同じカテゴリの問題だけ)
    $sibling = Stage::create(['category_id' => $category->id, 'difficulty' => '上級', 'stage_number' => 1, 'is_boss' => false, 'question_count' => 6]);
    $sibling->questions()->attach(array_map(fn ($id) => $id, [$yesterday->id, ...$overdue]));

    $questions = collect($this->getJson("/api/stages/{$stage->id}")->assertOk()->json('questions'));

    expect($questions->where('review', true)->pluck('id')->sort()->values()->all())
        ->toBe(collect([$yesterday->id, $overdue[0]])->sort()->values()->all());
});

it('ステージのおさらい: stage_mix が0なら足さない。1なら優先の1問だけ', function () {
    $profile = createActiveProfile();
    pickerMemory($profile, ['wrong_on' => '2026-10-08', 'due_on' => '2026-10-09']);
    pickerOverdue($profile, 3);

    config(['review.stage_mix' => 0]);
    expect(ReviewPicker::stage($profile, [], null))->toBe([]);

    config(['review.stage_mix' => 1]);
    expect(ReviewPicker::stage($profile, [], null))->toHaveCount(1);
});

it('出す日より前の苦手の語: 正解しても段階と出す日は変わらず、最後に答えた日だけ今日になる。まちがえると段階1・次の日に戻る', function () {
    $profile = createActiveProfile();
    $question = pickerWeak($profile, ['level' => 3, 'due_on' => '2026-10-14', 'last_answered_on' => '2026-10-01']);

    QuestionMemory::record($profile, $question->id, true);
    $memory = ProfileQuestionMemory::where('question_id', $question->id)->sole();
    expect([$memory->level, $memory->due_on->toDateString(), $memory->last_answered_on->toDateString()])->toBe([3, '2026-10-14', '2026-10-09']);
    // 答えた直後は3日あいていないので、苦手の枠には出ない
    expect(QuestionMemory::slotIds($profile, 'weak', 10))->toBe([]);

    QuestionMemory::record($profile, $question->id, false);
    $memory->refresh();
    expect([$memory->level, $memory->due_on->toDateString()])->toBe([1, '2026-10-10']);
});

/** 国つきの覚え具合を作る。$answeredOn はいつ答えたか、$due は出す日 */
function pickerCountry(UserProfile $profile, $country, string $answeredOn, string $due = '2026-10-08'): Question
{
    $question = pickerMemory($profile, ['last_answered_on' => $answeredOn, 'due_on' => $due]);
    $question->update(['country_id' => $country->id]);

    return $question;
}

it('今学んでいる所: 直近7日でいちばん多く答えた国の、出す日が来た問題が古い順に出る。別の国は出ない', function () {
    $profile = createActiveProfile();
    $a = createTravelCountry('fr', 'フランス');
    $b = createTravelCountry('de', 'ドイツ');
    $profile->trips()->createMany([['destination' => 'fr', 'arrived_at' => now()], ['destination' => 'de', 'arrived_at' => now()]]);
    $a2 = pickerCountry($profile, $a, '2026-10-08', '2026-10-07');
    $a1 = pickerCountry($profile, $a, '2026-10-07', '2026-10-01');
    pickerCountry($profile, $a, '2026-10-06', '2026-10-20'); // まだ出す日が来ていない(数には入る)
    pickerCountry($profile, $b, '2026-10-08', '2026-10-01');
    foreach (range(1, 5) as $i) {
        pickerCountry($profile, $b, '2026-09-20', '2026-10-20'); // 7日より前の答えは数えない
    }

    expect(QuestionMemory::slotIds($profile, 'now', 10))->toBe([$a1->id, $a2->id]);
});

it('今学んでいる所: 同数なら最後に答えた日が新しいほう。答えた記録がなければ空', function () {
    $profile = createActiveProfile();
    expect(QuestionMemory::slotIds($profile, 'now', 10))->toBe([]);

    $a = createTravelCountry('fr', 'フランス');
    $b = createTravelCountry('de', 'ドイツ');
    $profile->trips()->createMany([['destination' => 'fr', 'arrived_at' => now()], ['destination' => 'de', 'arrived_at' => now()]]);
    pickerCountry($profile, $a, '2026-10-05');
    $newer = pickerCountry($profile, $b, '2026-10-08');

    expect(QuestionMemory::slotIds($profile, 'now', 10))->toBe([$newer->id]);
});

it('今学んでいる所: 国のない問題は、ステージのカテゴリ(子は親)で数える', function () {
    $profile = createActiveProfile();
    $root = Category::create(['name' => '親'.uniqid()]);
    $child = Category::create(['name' => '子'.uniqid(), 'parent_id' => $root->id]);
    $stage = Stage::create(['category_id' => $child->id, 'difficulty' => '初級', 'stage_number' => 1, 'is_boss' => false, 'question_count' => 2]);
    $one = pickerMemory($profile, ['last_answered_on' => '2026-10-08', 'due_on' => '2026-10-01']);
    $two = pickerMemory($profile, ['last_answered_on' => '2026-10-08', 'due_on' => '2026-10-02']);
    $stage->questions()->attach([$one->id => ['order' => 1], $two->id => ['order' => 2]]);
    pickerMemory($profile, ['last_answered_on' => '2026-10-08', 'due_on' => '2026-10-01']); // 所なし: 数えない・出ない

    expect(QuestionMemory::slotIds($profile, 'now', 10))->toBe([$one->id, $two->id]);
});

it('毎日の復習: 今学んでいる所が2問入り、古い順が1問以上残る', function () {
    $profile = createActiveProfile();
    $a = createTravelCountry('fr', 'フランス');
    $profile->trips()->create(['destination' => 'fr', 'arrived_at' => now()]);
    $overdue = pickerOverdue($profile, 5);
    $mine = collect(range(1, 4))->map(fn () => pickerCountry($profile, $a, '2026-10-08', '2026-10-05')->id)->all();

    $ids = ReviewPicker::daily($profile);

    expect(array_slice($ids, 0, 2))->toBe(array_slice($mine, 0, 2))
        ->and($ids)->toContain($overdue[0]);
});
