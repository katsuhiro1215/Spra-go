<?php

namespace App\Console\Commands;

use App\Support\ContactRelay;
use Illuminate\Console\Command;

/** 中央管理システムへ送れていない保護者のご意見を送り直す(5回まで)。スケジューラが定期的に流す */
class RelayFeedbacksCommand extends Command
{
    protected $signature = 'feedbacks:relay';

    protected $description = '送れていない保護者のご意見を、中央管理システムのお問い合わせAPIへ送り直す';

    public function handle(): int
    {
        if (! ContactRelay::enabled()) {
            $this->line('中央管理システムの設定がないので、何もしません。');

            return self::SUCCESS;
        }

        $this->info('送れた件数: '.ContactRelay::relayPending());

        return self::SUCCESS;
    }
}
