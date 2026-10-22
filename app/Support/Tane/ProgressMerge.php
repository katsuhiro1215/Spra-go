<?php

namespace App\Support\Tane;

use DateTimeImmutable;
use Throwable;

/**
 * Tane の記録の「合わせ方」と「形の確かめ」(company/spra/tane/docs/2026-10-21-account-sync-design.md 6章)。
 * 端末とサーバーのどちらが先に来ても同じ答えになるよう、純粋な関数だけで書く(フレームワークに頼らない)。
 * Tane(TypeScript)にも同じ関数があり、tests/Fixtures/tane-merge-cases.json の同じ例で通す。
 *
 * 記録の形(Tane と Spra Go の約束):
 *   stars         { ステージID: ★1〜5 }
 *   best          { ステージID: 最高点 }            ★のあるステージだけ
 *   challengeBest { あそびID: 最高点 }
 *   endless       { ステージID: { correct, combo } }
 *   garden        [ステージID, …]                   8つまで
 *   gardenChangedAt, lastModeAt   日時(ISO 8601)か null
 *   lastModeId    最後にあそんだあそびか null
 */
class ProgressMerge
{
    public const STAGE_ID = '/^[a-z]+-[0-9]{1,3}$/';

    private const MODE_ID = '/^[a-z][a-z0-9_-]{0,30}$/';

    private const DATETIME = '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/';

    public const MAX_SCORE = 10_000_000;

    public const MAX_ENDLESS = 100_000;

    public const MAX_GARDEN = 8;

    private const MAX_MODES = 20;

    /** 何も遊んでいないときの記録 */
    public static function empty(): array
    {
        return [
            'stars' => [],
            'best' => [],
            'challengeBest' => [],
            'endless' => [],
            'garden' => [],
            'gardenChangedAt' => null,
            'lastModeId' => null,
            'lastModeAt' => null,
        ];
    }

    /**
     * 2つの記録を合わせる。★・最高点・チャレンジ・エンドレスは大きいほう、にわと最後のあそびは日時が新しいほう
     * (日時が同じなら $a を残す。日時の無いほうは、いちばん古い扱い)。結果のキーは並べ替える(比べやすいように)
     */
    public static function merge(array $a, array $b): array
    {
        $a = array_merge(self::empty(), $a);
        $b = array_merge(self::empty(), $b);

        $gardenFromB = self::isNewer($b['gardenChangedAt'], $a['gardenChangedAt']);
        $modeFromB = self::isNewer($b['lastModeAt'], $a['lastModeAt']);
        $garden = $gardenFromB ? $b : $a;
        $mode = $modeFromB ? $b : $a;

        return [
            'stars' => self::maxByKey($a['stars'], $b['stars']),
            'best' => self::maxByKey($a['best'], $b['best']),
            'challengeBest' => self::maxByKey($a['challengeBest'], $b['challengeBest']),
            'endless' => self::mergeEndless($a['endless'], $b['endless']),
            'garden' => $garden['garden'],
            'gardenChangedAt' => $garden['gardenChangedAt'],
            'lastModeId' => $mode['lastModeId'],
            'lastModeAt' => $mode['lastModeAt'],
        ];
    }

    /**
     * 受け取った記録の形を確かめる。合わないものは「捨てる」(全部を断らない)。
     * ステージが実在するかは、Tane 側で確かめる(ここでは形と範囲だけ)
     */
    public static function validate(array $payload, int $maxStageRecords = 200): array
    {
        $stars = [];
        foreach (self::arrayOf($payload['stars'] ?? null) as $id => $value) {
            if (self::stageId($id) && is_int($value) && $value >= 1 && $value <= 5) {
                $stars[$id] = $value;
            }
        }
        $stars = self::limit($stars, $maxStageRecords);

        $best = [];
        foreach (self::arrayOf($payload['best'] ?? null) as $id => $value) {
            // 最高点は★のあるステージだけ(表の1行に★と最高点が入るため)
            if (isset($stars[$id]) && self::intInRange($value, 0, self::MAX_SCORE)) {
                $best[$id] = $value;
            }
        }

        $challenge = [];
        foreach (self::arrayOf($payload['challengeBest'] ?? null) as $id => $value) {
            if (is_string($id) && preg_match(self::MODE_ID, $id) && self::intInRange($value, 0, self::MAX_SCORE)) {
                $challenge[$id] = $value;
            }
        }

        $endless = [];
        foreach (self::arrayOf($payload['endless'] ?? null) as $id => $value) {
            if (! self::stageId($id) || ! is_array($value)) {
                continue;
            }
            $correct = $value['correct'] ?? 0;
            $combo = $value['combo'] ?? 0;
            if (self::intInRange($correct, 0, self::MAX_ENDLESS) && self::intInRange($combo, 0, self::MAX_ENDLESS)) {
                $endless[$id] = ['correct' => $correct, 'combo' => $combo];
            }
        }

        $garden = [];
        $gardenInput = $payload['garden'] ?? null;
        foreach (is_array($gardenInput) ? $gardenInput : [] as $id) {
            if (self::stageId($id) && ! in_array($id, $garden, true) && count($garden) < self::MAX_GARDEN) {
                $garden[] = $id;
            }
        }

        $modeId = $payload['lastModeId'] ?? null;
        $modeId = is_string($modeId) && preg_match(self::MODE_ID, $modeId) ? $modeId : null;

        return [
            'stars' => self::sorted($stars),
            'best' => self::sorted($best),
            'challengeBest' => self::sorted(self::limit($challenge, self::MAX_MODES)),
            'endless' => self::sorted(self::limit($endless, $maxStageRecords)),
            'garden' => $garden,
            'gardenChangedAt' => self::datetime($payload['gardenChangedAt'] ?? null),
            'lastModeId' => $modeId,
            'lastModeAt' => $modeId === null ? null : self::datetime($payload['lastModeAt'] ?? null),
        ];
    }

    /** JSON にするとき、空の {…} が [] にならないように直す(PHP は空の連想配列と空の配列を区別できない) */
    public static function forJson(array $progress): array
    {
        foreach (['stars', 'best', 'challengeBest', 'endless'] as $key) {
            if ($progress[$key] === []) {
                $progress[$key] = (object) [];
            }
        }

        return $progress;
    }

    /** 日時 $x が $y より新しいか(null は最も古い。同じ時刻は新しくない) */
    private static function isNewer(?string $x, ?string $y): bool
    {
        if ($x === null) {
            return false;
        }
        if ($y === null) {
            return true;
        }

        return (new DateTimeImmutable($x))->getTimestamp() > (new DateTimeImmutable($y))->getTimestamp();
    }

    /** @return array<string, int> */
    private static function maxByKey(array $a, array $b): array
    {
        $out = $a;
        foreach ($b as $key => $value) {
            $out[$key] = isset($out[$key]) ? max($out[$key], $value) : $value;
        }

        return self::sorted($out);
    }

    private static function mergeEndless(array $a, array $b): array
    {
        $out = $a;
        foreach ($b as $key => $value) {
            $out[$key] = isset($out[$key])
                ? ['correct' => max($out[$key]['correct'], $value['correct']), 'combo' => max($out[$key]['combo'], $value['combo'])]
                : $value;
        }

        return self::sorted($out);
    }

    private static function sorted(array $map): array
    {
        ksort($map, SORT_STRING);

        return $map;
    }

    /** キーの順で先頭から $max 件だけ残す(どの端末でも同じものが残るように) */
    private static function limit(array $map, int $max): array
    {
        return array_slice(self::sorted($map), 0, $max, true);
    }

    private static function arrayOf(mixed $value): array
    {
        return is_array($value) ? $value : [];
    }

    private static function stageId(mixed $id): bool
    {
        return is_string($id) && preg_match(self::STAGE_ID, $id) === 1;
    }

    private static function intInRange(mixed $value, int $min, int $max): bool
    {
        return is_int($value) && $value >= $min && $value <= $max;
    }

    /** 日時の形が正しければ ISO 8601 にそろえて返す。時計の狂った端末の「遠い未来」は、今に直す */
    private static function datetime(mixed $value): ?string
    {
        if (! is_string($value) || ! preg_match(self::DATETIME, $value)) {
            return null;
        }
        try {
            $at = new DateTimeImmutable($value);
        } catch (Throwable) {
            return null;
        }
        $now = new DateTimeImmutable('now');

        return ($at > $now->modify('+1 day') ? $now : $at)->format(DATE_ATOM);
    }
}
