<?php

use App\Models\Owner;
use App\Support\Csv;
use Illuminate\Support\Carbon;

/*
|--------------------------------------------------------------------------
| CSVの書き出し(docs/design/2026-10-03-analytics-design.md 4-4・6-3)
|--------------------------------------------------------------------------
*/

beforeEach(function () {
    $this->travelTo(Carbon::parse('2026-10-20 03:00:00', 'UTC'));
});

it('CSVは、先頭にBOMを付け、改行・ダブルクォート・カンマをエスケープする', function () {
    $csv = Csv::make(['名前', 'メモ'], [['山田', "1行目\n2行目"], ['"引用"', 'a,b']]);

    expect(str_starts_with($csv, "\xEF\xBB\xBF"))->toBeTrue()
        ->and($csv)->toContain("名前,メモ\r\n")
        ->and($csv)->toContain("山田,\"1行目\n2行目\"\r\n")
        ->and($csv)->toContain("\"\"\"引用\"\"\",\"a,b\"\r\n");
});

it('= + - @ で始まる文字は、Excelで式として動かないように、先頭に印を付ける', function (string $value) {
    expect(Csv::make(['x'], [[$value]]))->toContain("'{$value}");
})->with(['=1+1', '+81', '-2', '@SUM(A1)', "\t=1", "\r=1"]);

it('数字や普通の文字には、印を付けない。負の数字の列も、そのまま', function () {
    $csv = Csv::make(['x'], [[12], [0.5], [-3], ['こんにちは'], [null]]);

    expect($csv)->toContain("\r\n12\r\n")->toContain("0.5\r\n")->toContain("\r\n-3\r\n")->toContain("こんにちは\r\n")->not->toContain("'");
});

it('Owner以外は書き出せない', function () {
    $this->getJson('/api/owner/analytics/export/daily')->assertStatus(401);
});

it('日ごとのCSVを書き出す(ヘッダー・BOM・種類)', function () {
    $owner = Owner::factory()->create();
    $profile = makePlayerAt('2026-10-15 00:00:00');
    answerAt($profile, '2026-10-19 03:00:00');

    $response = $this->actingAs($owner, 'owner')->get('/api/owner/analytics/export/daily?days=7')->assertOk();

    $response->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
    expect(str_starts_with($response->getContent(), "\xEF\xBB\xBF"))->toBeTrue()
        ->and($response->getContent())->toContain('日付,新規アカウント,新規プレイヤー,開いた人数,遊んだ人数,解いた問題数,正解数,正解率,遊んだ時間(分)')
        ->and($response->getContent())->toContain('2026-10-19,0,0,0,1,1,1,1,0')
        ->and(substr_count($response->getContent(), "\r\n"))->toBe(8); // ヘッダー+7日
});

it('登録した週ごと・まちがいの多い問題・Userの書き出し', function () {
    $owner = Owner::factory()->create();
    $profile = makePlayerAt('2026-10-15 00:00:00');
    [$question] = createQuestionWithChoices();
    $question->update(['prompt' => '=HYPERLINK("http://example.com")']);
    foreach (range(1, 5) as $i) {
        answerAt($profile, '2026-10-19 03:00:00', false, $question->id);
    }

    $cohorts = $this->actingAs($owner, 'owner')->get('/api/owner/analytics/export/cohorts')->assertOk()->getContent();
    $hard = $this->actingAs($owner, 'owner')->get('/api/owner/analytics/export/hard-questions')->assertOk()->getContent();
    $users = $this->actingAs($owner, 'owner')->get('/api/owner/analytics/export/users')->assertOk()->getContent();

    expect($cohorts)->toContain('登録した週,人数,登録した週,1週後,2週後,3週後,4週後')
        ->and($hard)->toContain('問題番号,問題文,回答数,正解率,へん報告数')
        ->and($hard)->toContain("\"'=HYPERLINK(\"\"http://example.com\"\")\"")
        ->and($users)->toContain('ID,名前,登録日,メール確認,プレイヤー数,最後に遊んだ日,解いた問題数,遊んだ時間(分)')
        ->and($users)->not->toContain('@'); // メールアドレスは書き出さない
});

it('知らない種類は404', function () {
    $owner = Owner::factory()->create();

    $this->actingAs($owner, 'owner')->get('/api/owner/analytics/export/secrets')->assertNotFound();
});
