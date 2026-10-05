<?php

namespace App\Support\Prefecture;

use RuntimeException;

/**
 * 都道府県クイズの計画(docs/design/2026-10-05-prefecture-quiz-design.md 5章)。
 * 県のデータ表から、地方・コース・級・ステージ・問題の「計画」を作る純粋な計算。データベースには触らない。
 * ランダムの代わりに、名前から決まる並び(crc32)を使うので、同じ表からは、いつも同じ計画ができる
 */
class PrefectureQuizPlanner
{
    public const QUESTIONS_PER_STAGE = 10;

    public const WRONG = 3;

    public const LEVELS = ['beginner' => '初級', 'intermediate' => '中級', 'advanced' => '上級'];

    private const KINDS = ['foods', 'sights', 'culture'];

    /**
     * 級ごとの問題の並び(1〜10問目)。形は
     * ['fact', 種類, 番号]＝その県の事実を選ぶ／['rev', 種類, 番号]＝逆(その事実で有名なのは？)／['capital']／['capital_rev']／['region']／['neighbor']／
     * ['hard', 番号]＝難読地名／['fit']＝県庁所在地のはめ込み／['capital_differs', 種類, 番号]＝県名と県庁所在地がちがう県は県庁所在地、同じ県は事実
     */
    private const PLANS = [
        'beginner' => [
            ['fact', 'foods', 0], ['rev', 'foods', 0], ['fact', 'sights', 0], ['rev', 'sights', 0], ['fact', 'foods', 1],
            ['fact', 'sights', 1], ['rev', 'foods', 1], ['rev', 'sights', 1], ['region'], ['fact', 'culture', 0],
        ],
        'intermediate' => [
            ['capital'], ['capital_rev'], ['fit'], ['neighbor'], ['fact', 'foods', 2],
            ['rev', 'sights', 2], ['fact', 'culture', 0], ['fit'], ['rev', 'foods', 2], ['fact', 'sights', 2],
        ],
        'advanced' => [
            ['hard', 0], ['capital_differs', 'foods', 3], ['fit'], ['neighbor'], ['fact', 'sights', 3],
            ['fact', 'culture', 1], ['hard', 1], ['fit'], ['rev', 'foods', 3], ['rev', 'culture', 2],
        ],
    ];

    /**
     * @param  array<string, array>  $catalog  PrefectureCatalog::all() の形
     * @return list<array{key: string, name: string, order: int, group: bool, courses: list<array>}>
     */
    public static function plan(array $catalog): array
    {
        $owners = self::factOwners($catalog);
        $regions = [];
        $regionOrder = 0;

        foreach (PrefectureCatalog::REGIONS as $regionKey => $regionName) {
            $regionOrder++;
            $members = array_values(array_filter($catalog, fn (array $p) => $p['region'] === $regionKey));

            $courses = [];
            foreach ($members as $index => $prefecture) {
                if (! PrefectureCatalog::isReady($prefecture)) {
                    continue;
                }
                $courses[] = [
                    'key' => $prefecture['key'],
                    'name' => $prefecture['name'],
                    'order' => $index + 1,
                    'levels' => self::prefectureLevels($catalog, $owners, $regionKey, $prefecture),
                ];
            }

            if ($courses === []) {
                continue;
            }

            // その地方の全県の事実がそろったときだけ、地方まるごとを足す
            if (count($courses) === count($members)) {
                $courses[] = [
                    'key' => $regionKey,
                    'name' => "{$regionName}まるごと",
                    'order' => count($members) + 1,
                    'levels' => self::regionLevels($catalog, $owners, $regionKey, $regionName, $members),
                ];
            }

            $regions[] = ['key' => $regionKey, 'name' => $regionName, 'order' => $regionOrder, 'group' => true, 'courses' => $courses];
        }

        return $regions;
    }

    private static function prefectureLevels(array $catalog, array $owners, string $regionKey, array $prefecture): array
    {
        $levels = [];
        foreach (self::LEVELS as $code => $difficulty) {
            $prefix = "pref:{$regionKey}:{$prefecture['key']}:{$code}:1";
            $levels[] = [
                'code' => $code,
                'difficulty' => $difficulty,
                'stages' => [[
                    'number' => 1,
                    'boss' => true,
                    'title_reward' => $code === 'advanced' ? PrefectureCatalog::title($prefecture['name']) : null,
                    'questions' => self::questions($catalog, $owners, $prefix, $prefecture, $code),
                ]],
            ];
        }

        return $levels;
    }

    /** 地方まるごと。その地方の県を1つずつアンカーにして、級ごとの形で10問 */
    private static function regionLevels(array $catalog, array $owners, string $regionKey, string $regionName, array $members): array
    {
        $levels = [];
        foreach (self::LEVELS as $code => $difficulty) {
            $prefix = "pref:{$regionKey}:all:{$code}:1";
            $items = [];
            foreach (self::anchors($members, $prefix) as $index => $anchor) {
                $items[] = [$anchor['prefecture'], self::regionForm($code, $index + 1, $anchor['round'])];
            }
            $levels[] = [
                'code' => $code,
                'difficulty' => $difficulty,
                'stages' => [[
                    'number' => 1,
                    'boss' => true,
                    'title_reward' => $code === 'advanced' ? PrefectureCatalog::title($regionName) : null,
                    // 地方のまちがいは、初級・中級ともに、同じ地方の県から(中級の選び方)
                    'questions' => self::assemble($catalog, $owners, $prefix, $items, $code === 'beginner' ? 'intermediate' : $code),
                ]],
            ];
        }

        return $levels;
    }

    /** 地方まるごとの、$position問目(1始まり)の形。$round は、そのアンカーが何回目か(事実・難読地名の番号に使う) */
    private static function regionForm(string $code, int $position, int $round): array
    {
        if ($code === 'beginner') {
            return ['rev', $position % 2 === 1 ? 'foods' : 'sights', $round % 4];
        }
        if (in_array($position, [3, 8], true)) {
            return ['fit'];
        }
        if ($code === 'intermediate') {
            // 同じ県が2回出るときは、1回目は県庁所在地、2回目はその逆にする(同じ問いにならないように)
            return $round % 2 === 0 ? ['capital'] : ['capital_rev'];
        }

        return match (true) {
            in_array($position, [1, 4, 7, 10], true) => ['hard', $round % 3],
            in_array($position, [2, 5, 9], true) => ['neighbor'],
            default => ['rev', 'culture', $round % 3],
        };
    }

    /** 県を10個になるまで繰り返して、名前から決まる順に並べる(同じ県が続かないように、何回目かも並べ方に入れる) */
    private static function anchors(array $members, string $salt): array
    {
        $cycle = [];
        $count = count($members);
        for ($i = 0; $i < self::QUESTIONS_PER_STAGE; $i++) {
            $cycle[] = ['prefecture' => $members[$i % $count], 'round' => intdiv($i, $count)];
        }
        usort($cycle, fn (array $a, array $b) => self::hash($salt, "{$a['prefecture']['key']}#{$a['round']}") <=> self::hash($salt, "{$b['prefecture']['key']}#{$b['round']}"));

        return $cycle;
    }

    /** 事実の文字 => その文字を持つ県のkey(名物・名所・お祭りなどを通して) */
    private static function factOwners(array $catalog): array
    {
        $owners = [];
        foreach ($catalog as $prefecture) {
            foreach (self::KINDS as $kind) {
                foreach ($prefecture[$kind] as $text) {
                    $owners[$text][$prefecture['key']] = true;
                }
            }
        }

        return array_map('array_keys', $owners);
    }

    /** 県のコースの、級ごとの10問 */
    private static function questions(array $catalog, array $owners, string $prefix, array $prefecture, string $code): array
    {
        $items = array_map(fn (array $form) => [$prefecture, $form], self::PLANS[$code]);

        return self::assemble($catalog, $owners, $prefix, $items, $code);
    }

    /**
     * 問いの並び($items は [県, 形] の並び)から、10問を作る。作れない形・同じ問いになる形は、予備の問いに替える
     *
     * @param  list<array{0: array, 1: array}>  $items
     */
    private static function assemble(array $catalog, array $owners, string $prefix, array $items, string $code): array
    {
        $questions = [];
        $signatures = [];
        $usedFit = [];

        foreach ($items as $index => [$prefecture, $form]) {
            $key = "{$prefix}:q".($index + 1);
            $question = self::build($form, $key, $catalog, $owners, $prefecture, $code, $usedFit);

            if ($question === null || in_array(self::signature($question), $signatures, true)) {
                $question = self::reserve($key, $catalog, $owners, $prefecture, $code, $signatures, $usedFit);
            }

            if ($question['type'] === 'matching') {
                array_push($usedFit, ...array_column($question['items'], 'id'));
            }
            $signatures[] = self::signature($question);
            $questions[] = $question;
        }

        return $questions;
    }

    /** 作れない形・同じ問いになる形の代わりに、まだ出していない事実の問いなどを、順に試す */
    private static function reserve(string $key, array $catalog, array $owners, array $prefecture, string $code, array $signatures, array $usedFit): array
    {
        $forms = [];
        foreach (['fact', 'rev'] as $kind) {
            foreach (self::KINDS as $factKind) {
                foreach (array_keys($prefecture[$factKind]) as $i) {
                    $forms[] = [$kind, $factKind, $i];
                }
            }
        }
        foreach (array_keys($prefecture['hard']) as $i) {
            $forms[] = ['hard', $i];
        }
        array_push($forms, ['region'], ['capital'], ['capital_rev']);

        foreach ($forms as $form) {
            $question = self::build($form, $key, $catalog, $owners, $prefecture, $code, $usedFit);
            if ($question !== null && ! in_array(self::signature($question), $signatures, true)) {
                return $question;
            }
        }

        throw new RuntimeException("予備の問いも作れない: {$key}");
    }

    private static function build(array $form, string $key, array $catalog, array $owners, array $p, string $code, array $usedFit): ?array
    {
        return match ($form[0]) {
            'fact' => self::fact($key, $catalog, $owners, $p, $form[1], $form[2], $code),
            'rev' => self::reverse($key, $catalog, $owners, $p, $form[1], $form[2], $code),
            'capital' => self::capital($key, $catalog, $p, $code),
            'capital_differs' => self::capitalDiffers($p)
                ? self::capital($key, $catalog, $p, $code)
                : self::fact($key, $catalog, $owners, $p, $form[1], $form[2], $code),
            'capital_rev' => self::capitalReverse($key, $catalog, $p, $code),
            'region' => self::region($key, $p),
            'neighbor' => self::neighbor($key, $catalog, $p, $code),
            'hard' => self::hard($key, $p, $form[1]),
            'fit' => self::fit($key, $catalog, $p, $code, $usedFit),
        };
    }

    // ---- 問いの形 ----

    private static function fact(string $key, array $catalog, array $owners, array $p, string $kind, int $i, string $code): ?array
    {
        $text = $p[$kind][$i] ?? null;
        if ($text === null) {
            return null;
        }
        $wrong = self::factWrong($catalog, $owners, $p, $kind, $key, $code);
        if ($wrong === null) {
            return null;
        }

        $prompt = match ($kind) {
            'foods' => "{$p['name']}の めいぶつは どれ？",
            'sights' => "{$p['name']}に あるのは どれ？",
            default => "{$p['name']}の ゆうめいな おまつり・でんとう・人物は どれ？",
        };

        return self::choiceQuestion($key, $prompt, $text, $wrong);
    }

    private static function reverse(string $key, array $catalog, array $owners, array $p, string $kind, int $i, string $code): ?array
    {
        $text = $p[$kind][$i] ?? null;
        // 同じ文字が2つ以上の県にあるときは、正解が2つになるので、逆の問いにしない
        if ($text === null || count($owners[$text] ?? []) !== 1) {
            return null;
        }
        $ownersOfText = $owners[$text];
        $wrong = [];
        foreach (self::rankedOthers($catalog, $p, $code, $key) as $other) {
            if (! in_array($other['key'], $ownersOfText, true)) {
                $wrong[] = $other['name'];
            }
            if (count($wrong) === self::WRONG) {
                break;
            }
        }
        if (count($wrong) < self::WRONG) {
            return null;
        }

        $prompt = $kind === 'sights' ? "『{$text}』が あるのは どこ？" : "『{$text}』で ゆうめいなのは どこ？";

        return self::choiceQuestion($key, $prompt, $p['name'], $wrong);
    }

    private static function capital(string $key, array $catalog, array $p, string $code): ?array
    {
        $wrong = [];
        foreach (self::rankedOthers($catalog, $p, $code, $key) as $other) {
            if ($other['capital'] !== $p['capital'] && ! in_array($other['capital'], $wrong, true)) {
                $wrong[] = $other['capital'];
            }
            if (count($wrong) === self::WRONG) {
                break;
            }
        }

        return count($wrong) === self::WRONG
            ? self::choiceQuestion($key, "{$p['name']}の けんちょうしょざいちは どこ？", $p['capital'], $wrong)
            : null;
    }

    private static function capitalReverse(string $key, array $catalog, array $p, string $code): ?array
    {
        $wrong = array_slice(array_column(self::rankedOthers($catalog, $p, $code, $key), 'name'), 0, self::WRONG);

        return count($wrong) === self::WRONG
            ? self::choiceQuestion($key, "『{$p['capital']}』は、どこの けんちょうしょざいち？", $p['name'], $wrong)
            : null;
    }

    private static function region(string $key, array $p): ?array
    {
        $others = array_values(array_diff(array_keys(PrefectureCatalog::REGIONS), [$p['region']]));
        usort($others, fn (string $a, string $b) => self::hash($key, $a) <=> self::hash($key, $b));
        $wrong = array_map(fn (string $region) => PrefectureCatalog::REGIONS[$region], array_slice($others, 0, self::WRONG));

        return count($wrong) === self::WRONG
            ? self::choiceQuestion($key, "{$p['name']}は どの ちほう？", PrefectureCatalog::REGIONS[$p['region']], $wrong)
            : null;
    }

    private static function neighbor(string $key, array $catalog, array $p, string $code): ?array
    {
        $neighbors = array_values(array_filter($p['neighbors'], fn (string $k) => isset($catalog[$k])));
        if ($neighbors === []) {
            return null;
        }
        usort($neighbors, fn (string $a, string $b) => self::hash($key, $a) <=> self::hash($key, $b));
        $correct = $catalog[$neighbors[0]]['name'];

        // まちがいは、となりでない県。上級は「となりのとなり」を先に、中級は同じ地方を先に
        $others = array_values(array_filter(self::rankedOthers($catalog, $p, 'beginner', $key), fn (array $o) => ! in_array($o['key'], $p['neighbors'], true)));
        $tier = function (array $o) use ($p, $code): int {
            $sameRegion = $o['region'] === $p['region'];
            $twoHop = array_intersect($o['neighbors'], $p['neighbors']) !== [];

            return match ($code) {
                'advanced' => $twoHop ? 0 : ($sameRegion ? 1 : 2),
                'intermediate' => $sameRegion ? 0 : 1,
                default => 0,
            };
        };
        usort($others, fn (array $a, array $b) => [$tier($a), self::hash($key, $a['key'])] <=> [$tier($b), self::hash($key, $b['key'])]);
        $wrong = array_slice(array_column($others, 'name'), 0, self::WRONG);

        return count($wrong) === self::WRONG
            ? self::choiceQuestion($key, "{$p['name']}と となりあうのは どれ？", $correct, $wrong)
            : null;
    }

    private static function hard(string $key, array $p, int $i): ?array
    {
        $hard = $p['hard'][$i] ?? null;
        if ($hard === null) {
            return null;
        }

        return self::choiceQuestion($key, "{$p['name']}の『{$hard['word']}』は、なんて よむ？", $hard['reading'], $hard['wrong']) + ['plain' => [$hard['word']]];
    }

    private static function fit(string $key, array $catalog, array $p, string $code, array $usedFit): ?array
    {
        $others = self::rankedOthers($catalog, $p, $code, $key);
        // 前のはめ込みに使った県は、あとに回す(足りなければ、また使う)
        usort($others, fn (array $a, array $b) => in_array($a['key'], $usedFit, true) <=> in_array($b['key'], $usedFit, true));

        $set = [$p];
        $capitals = [$p['capital']];
        foreach ($others as $other) {
            if (! in_array($other['capital'], $capitals, true)) {
                $set[] = $other;
                $capitals[] = $other['capital'];
            }
            if (count($set) === 4) {
                break;
            }
        }
        if (count($set) < 4) {
            return null;
        }
        usort($set, fn (array $a, array $b) => self::hash($key, $a['key']) <=> self::hash($key, $b['key']));

        return [
            'key' => $key,
            'type' => 'matching',
            'prompt' => '県庁所在地を、ばんごうの県に はめよう',
            'layout' => 'slots',
            'items' => array_map(fn (array $s) => ['id' => $s['key'], 'image' => null, 'text' => $s['capital'], 'label' => $s['name']], $set),
        ];
    }

    // ---- まちがいの選び方 ----

    /** その県の事実と重ならず、2つ以上の県にある文字でもない、同じ種類の事実を、ほかの県から1つずつ */
    private static function factWrong(array $catalog, array $owners, array $p, string $kind, string $salt, string $code): ?array
    {
        $mine = array_merge($p['foods'], $p['sights'], $p['culture']);
        $wrong = [];
        foreach (self::rankedOthers($catalog, $p, $code, $salt) as $other) {
            $candidates = array_values(array_filter(
                $other[$kind],
                fn (string $t) => ! in_array($t, $mine, true) && ! in_array($t, $wrong, true) && count($owners[$t] ?? []) === 1,
            ));
            if ($candidates === []) {
                continue;
            }
            $wrong[] = $candidates[self::hash($salt, $other['key']) % count($candidates)];
            if (count($wrong) === self::WRONG) {
                return $wrong;
            }
        }

        return null;
    }

    /** ほかの県を、まちがいに選ぶ優先の順に並べる。初級は、全県を名前から決まる順。中級は同じ地方から。上級はとなりの県から */
    private static function rankedOthers(array $catalog, array $p, string $code, string $salt): array
    {
        $others = array_values(array_filter($catalog, fn (array $o) => $o['key'] !== $p['key']));
        $tier = fn (array $o): int => match ($code) {
            'advanced' => in_array($o['key'], $p['neighbors'], true) ? 0 : ($o['region'] === $p['region'] ? 1 : 2),
            'intermediate' => $o['region'] === $p['region'] ? 0 : 1,
            default => 0,
        };
        usort($others, fn (array $a, array $b) => [$tier($a), self::hash($salt, $a['key'])] <=> [$tier($b), self::hash($salt, $b['key'])]);

        return $others;
    }

    /** 県庁所在地の名前が、県名(県・府・都を除く)で始まらない県 */
    private static function capitalDiffers(array $p): bool
    {
        $stem = preg_replace('/[県府都]$/u', '', $p['name']);

        return ! str_starts_with($p['capital'], $stem);
    }

    // ---- 部品 ----

    private static function choiceQuestion(string $key, string $prompt, string $correct, array $wrong): array
    {
        return [
            'key' => $key,
            'type' => 'multiple_choice',
            'prompt' => $prompt,
            'image' => null,
            'choices' => array_merge(
                [['label' => $correct, 'correct' => true, 'image' => null]],
                array_map(fn (string $label) => ['label' => $label, 'correct' => false, 'image' => null], $wrong),
            ),
        ];
    }

    /** 同じ問いかどうかの判定(文と正解。はめ込みは、県の組) */
    private static function signature(array $question): string
    {
        if ($question['type'] === 'matching') {
            $ids = array_column($question['items'], 'id');
            sort($ids);

            return 'fit:'.implode(',', $ids);
        }
        $correct = array_values(array_filter($question['choices'], fn (array $c) => $c['correct']))[0]['label'];

        return $question['prompt'].'|'.$correct;
    }

    private static function hash(string $salt, string $key): int
    {
        return crc32("{$salt}|{$key}");
    }
}
