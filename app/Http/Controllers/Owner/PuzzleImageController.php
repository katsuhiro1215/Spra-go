<?php

namespace App\Http\Controllers\Owner;

use App\Http\Controllers\Controller;
use App\Models\PuzzleDisabledImage;
use App\Models\QuestionChoice;
use App\Support\CatchGame;
use Illuminate\Http\Request;

/** 国旗パズルに出す旗を、盤の大きさごとにOn/Offする(Ownerのゲーム設定) */
class PuzzleImageController extends Controller
{
    private const GAME = 'puzzle_flag';

    public function index(): array
    {
        $kinds = CatchGame::allImageKinds(self::GAME) ?? [];
        $disabled = PuzzleDisabledImage::query()->where('game', self::GAME)->get(['grid', 'image'])
            ->map(fn (PuzzleDisabledImage $row) => $row->grid.'|'.$row->image)->flip();
        $labels = $this->labels();

        $grids = [];
        foreach ($kinds as $grid => $images) {
            $grids[$grid] = collect(array_keys($images))
                ->map(fn (string $image) => [
                    'image' => $image,
                    'label' => $labels[$image] ?? basename($image, '.svg'),
                    'enabled' => ! isset($disabled[$grid.'|'.$image]),
                ])
                ->sortBy('label', SORT_NATURAL)
                ->values()
                ->all();
        }

        return ['grids' => $grids];
    }

    public function update(Request $request): array
    {
        $kinds = CatchGame::allImageKinds(self::GAME) ?? [];
        $data = $request->validate([
            'grid' => ['required', 'string', 'in:'.implode(',', array_keys($kinds))],
            'image' => ['required', 'string'],
            'enabled' => ['required', 'boolean'],
        ]);
        abort_unless(isset($kinds[$data['grid']][$data['image']]), 422, 'この大きさのパズルにない旗です。');

        $row = ['game' => self::GAME, 'grid' => $data['grid'], 'image' => $data['image']];
        if ($data['enabled']) {
            PuzzleDisabledImage::query()->where($row)->delete();
        } else {
            PuzzleDisabledImage::query()->firstOrCreate($row);
        }

        return ['ok' => true];
    }

    /** @return array<string, string> 旗の絵 => 国の名前(国旗キャッチの問題の正解の選択肢から) */
    private function labels(): array
    {
        $labels = [];
        QuestionChoice::query()->where('is_correct', true)->whereNotNull('meta->image')->get(['label', 'meta'])
            ->each(function (QuestionChoice $choice) use (&$labels) {
                $labels[$choice->meta['image']] ??= $choice->label;
            });

        return $labels;
    }
}
