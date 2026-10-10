<?php

namespace App\Support;

use App\Models\Feedback;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * 保護者のご意見を、中央管理システム(Spra)のお問い合わせAPI(POST /api/contacts、X-Api-Key)へ送る
 * (docs/design/2026-10-10-production-env-design.md 8章)。
 * - このアプリのDBには必ず残す。送れなかったら attempts を数えて、あとで feedbacks:relay が送り直す(5回まで)
 * - 問題の「へん」報告は、問い合わせではないので送らない
 * - 子どもの名前・成績は送らない
 */
class ContactRelay
{
    public const MAX_ATTEMPTS = 5;

    private const KIND_LABELS = ['bug' => '不具合', 'request' => 'ご要望', 'other' => 'そのほか'];

    /** URL・キー・カテゴリのどれかが空なら、送らない(開発・テスト) */
    public static function enabled(): bool
    {
        $config = config('services.spra_contact');

        return filled($config['url'] ?? null) && filled($config['key'] ?? null) && filled($config['category_id'] ?? null);
    }

    /** 1件を送る。送れたら true。失敗しても例外は外に出さない(ご意見の保存は成功のままにする) */
    public static function send(Feedback $feedback): bool
    {
        if (! self::enabled() || ! in_array($feedback->kind, Feedback::WRITTEN_KINDS, true) || $feedback->relayed_at !== null) {
            return false;
        }

        $feedback->increment('relay_attempts');

        try {
            $response = Http::withHeaders(['X-Api-Key' => (string) config('services.spra_contact.key')])
                ->acceptJson()->timeout(10)
                ->post((string) config('services.spra_contact.url'), self::payload($feedback));

            if ($response->successful() && $response->json('success') === true) {
                $feedback->forceFill(['relayed_at' => now()])->save();

                return true;
            }

            Log::warning('ご意見を中央管理システムへ送れませんでした', ['feedback_id' => $feedback->id, 'status' => $response->status()]);
        } catch (Throwable $e) {
            Log::warning('ご意見を中央管理システムへ送れませんでした', ['feedback_id' => $feedback->id, 'error' => $e->getMessage()]);
        }

        return false;
    }

    /**
     * 送れていないご意見を、古い順に送り直す。1分に30回までの制限があるので、一度に最大20件
     *
     * @return int 送れた件数
     */
    public static function relayPending(int $limit = 20): int
    {
        if (! self::enabled()) {
            return 0;
        }

        $sent = 0;
        Feedback::query()
            ->whereIn('kind', Feedback::WRITTEN_KINDS)
            ->whereNull('relayed_at')
            ->where('relay_attempts', '<', self::MAX_ATTEMPTS)
            ->with('user:id,name,email')
            ->orderBy('id')
            ->limit($limit)
            ->get()
            ->each(function (Feedback $feedback) use (&$sent) {
                $sent += self::send($feedback) ? 1 : 0;
            });

        return $sent;
    }

    /** @return array<string, mixed> */
    private static function payload(Feedback $feedback): array
    {
        $label = self::KIND_LABELS[$feedback->kind] ?? $feedback->kind;
        $siteUrl = rtrim((string) config('services.spra_contact.site_url'), '/');

        $message = $feedback->body."\n\n---\nSpra Go のご意見（アカウント番号: {$feedback->user_id}、受付番号: {$feedback->id}）";
        if ($feedback->page) {
            $message .= "\n画面: {$feedback->page}";
        }

        return array_filter([
            'name' => $feedback->user?->name ?? 'Spra Go の保護者',
            'email' => $feedback->user?->email,
            'contact_category_id' => (int) config('services.spra_contact.category_id'),
            'subject' => "[Spra Go] ご意見（{$label}）",
            'message' => $message,
            'page_url' => $feedback->page && $siteUrl !== '' ? $siteUrl.$feedback->page : null,
        ], fn ($value) => $value !== null);
    }
}
