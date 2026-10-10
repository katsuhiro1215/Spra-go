<?php

use App\Models\Feedback;
use App\Models\Question;
use App\Models\Quiz;
use App\Models\User;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;

/*
|--------------------------------------------------------------------------
| ご意見を中央管理システム(Spra)のお問い合わせAPIへ送る(docs/design/2026-10-10-production-env-design.md 8章)
|--------------------------------------------------------------------------
*/

function enableRelay(): void
{
    config()->set('services.spra_contact', [
        'url' => 'https://spra.example.test/api/contacts',
        'key' => 'secret-key',
        'category_id' => 7,
        'site_url' => 'https://go.spra.jp',
    ]);
}

it('設定がないときは、送らない(開発・テスト)', function () {
    Http::fake();
    createActiveProfile();

    $this->postJson('/api/feedback', ['kind' => 'request', 'body' => 'こうしてほしい'])->assertCreated();

    Http::assertNothingSent();
    expect(Feedback::firstOrFail()->relayed_at)->toBeNull();
});

it('ご意見を送ると、APIキーつきで中央のお問い合わせAPIに届き、送った印が付く', function () {
    enableRelay();
    Http::fake(['spra.example.test/*' => Http::response(['success' => true, 'contact_id' => 12])]);
    createActiveProfile();
    $user = User::firstOrFail();

    $this->postJson('/api/feedback', ['kind' => 'bug', 'body' => 'ボタンが押せません', 'page' => '/learn'])->assertCreated();

    Http::assertSent(function (Request $request) use ($user) {
        $data = $request->data();

        return $request->url() === 'https://spra.example.test/api/contacts'
            && $request->hasHeader('X-Api-Key', 'secret-key')
            && $data['name'] === $user->name
            && $data['email'] === $user->email
            && $data['contact_category_id'] === 7
            && str_contains($data['subject'], '[Spra Go]')
            && str_contains($data['subject'], '不具合')
            && str_contains($data['message'], 'ボタンが押せません')
            && $data['page_url'] === 'https://go.spra.jp/learn';
    });
    $feedback = Feedback::firstOrFail();
    expect($feedback->relayed_at)->not->toBeNull()->and($feedback->relay_attempts)->toBe(1);
});

it('送るのは保護者のご意見だけ。子どもの名前や成績は本文に入れない', function () {
    enableRelay();
    Http::fake(['spra.example.test/*' => Http::response(['success' => true])]);
    $profile = createActiveProfile();
    $profile->update(['name' => 'ひみつの名前']);

    $this->postJson('/api/feedback', ['kind' => 'other', 'body' => 'こんにちは'])->assertCreated();

    Http::assertSent(fn (Request $request) => ! str_contains(json_encode($request->data(), JSON_UNESCAPED_UNICODE), 'ひみつの名前'));
});

it('問題の「へん」報告は、中央へ送らない(このアプリのOwner管理画面だけ)', function () {
    enableRelay();
    Http::fake();
    $profile = createActiveProfile();
    $question = Question::create(['quiz_id' => Quiz::create(['title' => 'テスト', 'difficulty' => '初級'])->id, 'type' => 'multiple_choice', 'prompt' => 'x']);

    $this->postJson("/api/questions/{$question->id}/report", ['reason' => 'wrong_answer'])->assertOk();
    $this->artisan('feedbacks:relay')->assertSuccessful();

    Http::assertNothingSent();
    expect(Feedback::firstOrFail()->relayed_at)->toBeNull();
});

it('中央が止まっていても、ご意見は保存されて201を返し、あとで送り直せる', function () {
    enableRelay();
    // 1回目は中央が止まっていて(500)、2回目の送り直しで届く
    Http::fake(['spra.example.test/*' => Http::sequence()->push(['message' => 'error'], 500)->push(['success' => true, 'contact_id' => 3])]);
    createActiveProfile();

    $this->postJson('/api/feedback', ['kind' => 'request', 'body' => 'あとで届けて'])->assertCreated();

    $feedback = Feedback::firstOrFail();
    expect($feedback->relayed_at)->toBeNull()->and($feedback->relay_attempts)->toBe(1);

    $this->artisan('feedbacks:relay')->assertSuccessful();

    expect($feedback->fresh()->relayed_at)->not->toBeNull()->and($feedback->fresh()->relay_attempts)->toBe(2);
});

it('つながらない(例外)ときも、ご意見は保存されて201を返す', function () {
    enableRelay();
    Http::fake(['spra.example.test/*' => fn () => throw new \Illuminate\Http\Client\ConnectionException('timeout')]);
    createActiveProfile();

    $this->postJson('/api/feedback', ['kind' => 'other', 'body' => 'つながらない'])->assertCreated();

    expect(Feedback::firstOrFail()->relay_attempts)->toBe(1);
});

it('送り直しは最大5回で止まる', function () {
    enableRelay();
    Http::fake(['spra.example.test/*' => Http::response(['message' => 'error'], 500)]);
    createActiveProfile();
    $this->postJson('/api/feedback', ['kind' => 'other', 'body' => 'x'])->assertCreated();

    foreach (range(1, 8) as $i) {
        $this->artisan('feedbacks:relay')->assertSuccessful();
    }

    expect(Feedback::firstOrFail()->relay_attempts)->toBe(5);
});

it('送れたご意見は、送り直しで二度送らない', function () {
    enableRelay();
    Http::fake(['spra.example.test/*' => Http::response(['success' => true])]);
    createActiveProfile();
    $this->postJson('/api/feedback', ['kind' => 'other', 'body' => 'x'])->assertCreated();

    $this->artisan('feedbacks:relay')->assertSuccessful();

    Http::assertSentCount(1);
});

it('feedbacks:relay は、設定がないと何もしない', function () {
    Http::fake();
    createActiveProfile();
    $this->postJson('/api/feedback', ['kind' => 'other', 'body' => 'x'])->assertCreated();

    $this->artisan('feedbacks:relay')->assertSuccessful();

    Http::assertNothingSent();
});
