<?php

use App\Support\Prefecture\PrefectureCatalog;
use App\Support\Prefecture\PrefectureQuizPlanner;

/*
|--------------------------------------------------------------------------
| 都道府県クイズに出る文字のふりがな(docs/design/2026-10-05-prefecture-quiz-design.md 7-1)
|--------------------------------------------------------------------------
|
| 画面は、辞書(frontend/src/lib/furigana-dictionary.json)の最長一致でふりがなを付ける。
| 計画に出る文字の漢字が、辞書になくて読みなしで残らないことを確かめる。
| 難読地名の問い(plain がある問い)の、問われる漢字と、ひらがなの選択肢は、確かめない(漢字にふりがなを付けないため)
|
*/

/** @return array<string, string> */
function furiganaDictionary(): array
{
    return json_decode(file_get_contents(base_path('frontend/src/lib/furigana-dictionary.json')), true, 512, JSON_THROW_ON_ERROR);
}

/** 辞書の最長一致(キーの並びの順)で分けて、ふりがなが付かずに残る漢字を返す */
function barekanji(string $text, array $dictionary): array
{
    $bare = [];
    $chars = mb_str_split($text);
    $i = 0;
    while ($i < count($chars)) {
        $rest = implode('', array_slice($chars, $i));
        foreach ($dictionary as $word => $reading) {
            if (str_starts_with($rest, (string) $word)) {
                $i += mb_strlen((string) $word);

                continue 2;
            }
        }
        if (preg_match('/[\x{3400}-\x{4DBF}\x{4E00}-\x{9FFF}々]/u', $chars[$i])) { // 漢字(句読点・かぎかっこは入れない)
            $bare[] = $chars[$i];
        }
        $i++;
    }

    return $bare;
}

/** 計画に出る、画面に見える文字(問題文・選択肢・はめ込みの項目と枠・解説の要約)。ふりがなを付けない語は除く @return list<string> */
function prefectureVisibleTexts(array $plan): array
{
    $texts = [];
    foreach ($plan as $region) {
        $texts[] = $region['name'];
        // 地方は courses を持つ。全国は、大もと直下のコースそのもの
        foreach ($region['courses'] ?? [$region] as $course) {
            $texts[] = $course['name'];
            foreach ($course['levels'] as $level) {
                $texts[] = $level['difficulty'];
                foreach ($level['stages'] as $stage) {
                    $texts[] = (string) $stage['title_reward'];
                    foreach ($stage['questions'] as $question) {
                        $prompt = str_replace($question['plain'] ?? [], '', $question['prompt']);
                        $texts[] = $prompt;
                        // 答えたあとの解説(要約)。問われた漢字は、ふりがなを付けないので、除く
                        $texts[] = str_replace($question['plain'] ?? [], '', $question['explanation']['summary'] ?? '');
                        if (($question['plain'] ?? []) !== []) {
                            continue; // 難読地名の選択肢は、ひらがな
                        }
                        foreach ($question['choices'] ?? [] as $choice) {
                            $texts[] = $choice['label'];
                        }
                        foreach ($question['items'] ?? [] as $item) {
                            $texts[] = $item['text'];
                            $texts[] = $item['label'];
                        }
                    }
                }
            }
        }
    }

    return array_values(array_unique(array_filter($texts)));
}

it('辞書は、文字数の長い語から並んでいる(長い語から先に一致させるため)', function () {
    $lengths = array_map(fn ($word) => mb_strlen((string) $word), array_keys(furiganaDictionary()));
    $sorted = $lengths;
    rsort($sorted);

    expect($lengths)->toBe($sorted);
});

it('計画に出る文字の漢字が、すべて辞書で読める(読みなしの漢字が残らない)', function () {
    $dictionary = furiganaDictionary();
    $missing = [];
    foreach (prefectureVisibleTexts(PrefectureQuizPlanner::plan(PrefectureCatalog::all())) as $text) {
        $bare = barekanji($text, $dictionary);
        if ($bare !== []) {
            $missing[$text] = implode('', $bare);
        }
    }

    expect($missing)->toBe([]);
});

it('難読地名の漢字は、辞書に入れない(辞書にあると、plain を忘れたときに、答えの読みが見えてしまう)', function () {
    $dictionary = furiganaDictionary();

    foreach (PrefectureCatalog::all() as $prefecture) {
        foreach ($prefecture['hard'] as $hard) {
            expect($dictionary)->not->toHaveKey($hard['word']);
        }
    }
});

it('地名コースの文字は、問題ごとの読み(readings)を使うと、ふりがなが付かずに残る漢字がない', function () {
    $dictionary = furiganaDictionary();
    $left = [];
    foreach (\App\Support\Prefecture\PlaceNameQuizPlanner::plan(PrefectureCatalog::all()) as $region) {
        foreach ($region['courses'] as $course) {
            foreach ($course['levels'] as $level) {
                foreach ($level['stages'][0]['questions'] as $q) {
                    $plain = $q['plain'] ?? [];
                    $readings = $q['readings'] ?? [];
                    $texts = [$q['prompt'], $q['explanation']['summary']];
                    if ($plain === []) {
                        array_push($texts, ...array_column($q['choices'], 'label'));
                    }
                    // 画面と同じく、問題ごとの読み(長い語から)を、辞書より先に照合する
                    $words = array_keys($readings);
                    usort($words, fn ($a, $b) => mb_strlen($b) <=> mb_strlen($a));
                    $merged = array_fill_keys($words, '') + $dictionary;
                    // 長い語を優先(同じ長さなら、問題ごとの読みが先)
                    $order = array_keys($merged);
                    usort($order, fn ($a, $b) => mb_strlen((string) $b) <=> mb_strlen((string) $a));
                    $merged = array_fill_keys($order, '');
                    foreach ($texts as $text) {
                        foreach (barekanji(str_replace($plain, '', $text), $merged) as $kanji) {
                            $left[$kanji] = ($left[$kanji] ?? 0) + 1;
                        }
                    }
                }
            }
        }
    }

    expect($left)->toBe([], '辞書にも readings にもない漢字: '.json_encode($left, JSON_UNESCAPED_UNICODE));
});
