<?php

namespace App\Console\Commands;

use App\Support\WorldRepair;
use Illuminate\Console\Command;

/** 建物の大きさや家の大きさを変えたあとに流す。置けなくなった物を、消さずにバッグに戻す(docs/design/2026-10-07-town-sizes-design.md 4-4) */
class RepairWorldCommand extends Command
{
    protected $signature = 'world:repair {--dry-run : バッグに戻す物を出すだけで、何も変えない}';

    protected $description = '置けなくなった町の物(大きさが変わって重なった物など)を、消さずにバッグに戻す';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $result = WorldRepair::run($dryRun);
        $total = array_sum(array_map('count', $result));

        foreach ($result as $profileId => $itemIds) {
            $this->line("プロフィール {$profileId}: ".count($itemIds).'個（置き物の番号 '.implode(', ', $itemIds).'）');
        }
        $verb = $dryRun ? 'バッグに戻す(--dry-run のため、まだ戻していません)' : 'バッグに戻しました';
        $this->info("{$verb}: {$total}個");

        // 引いた道が、動いた目印にかかっていたら消す(バッグに戻す先がない)
        $roads = WorldRepair::roads($dryRun);
        foreach ($roads as $profileId => $tiles) {
            $this->line("プロフィール {$profileId}: 引いた道 ".count($tiles).'マス（'.implode(' ', array_map(fn ($t) => "({$t[0]},{$t[1]})", $tiles)).'）');
        }
        $this->info(($dryRun ? '消す(--dry-run のため、まだ消していません)' : '消しました').': 引いた道 '.array_sum(array_map('count', $roads)).'マス');

        return self::SUCCESS;
    }
}
