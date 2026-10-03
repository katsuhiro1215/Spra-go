<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** ご意見(docs/design/2026-10-03-closed-beta-design.md 5章)。保護者の文章と、子どもの問題の「へん」報告 */
class Feedback extends Model
{
    protected $table = 'feedbacks';

    /** 保護者が送れる種類 */
    public const WRITTEN_KINDS = ['bug', 'request', 'other'];

    public const KIND_QUESTION_REPORT = 'question_report';

    public const STATUSES = ['new', 'read', 'done'];

    /** 問題の報告の理由と、一覧に出す文 */
    public const REASONS = [
        'wrong_answer' => '答えがまちがっているみたい',
        'unreadable' => 'よめない・わからない',
        'other' => 'そのほか',
    ];

    protected $fillable = ['user_id', 'user_profile_id', 'kind', 'body', 'question_id', 'reason', 'status', 'page'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function question(): BelongsTo
    {
        return $this->belongsTo(Question::class);
    }

    /** Owner管理画面の一覧に出す形。メールアドレスは出さない */
    public function toOwnerArray(): array
    {
        return [
            'id' => $this->id,
            'kind' => $this->kind,
            'status' => $this->status,
            'body' => $this->body,
            'reason' => $this->reason,
            'page' => $this->page,
            'question_id' => $this->question_id,
            'question_prompt' => $this->question?->prompt,
            'user_name' => $this->user?->name,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
