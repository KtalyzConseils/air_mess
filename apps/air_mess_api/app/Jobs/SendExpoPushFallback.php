<?php

namespace App\Jobs;

use App\Models\Notification;
use App\Services\ExpoPushClient;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class SendExpoPushFallback implements ShouldQueue
{
    use Queueable;

    /** @param string[] $tokens */
    public function __construct(
        public int $notificationId,
        public array $tokens,
        public string $title,
        public string $body,
        public array $payload,
    ) {}

    public function handle(ExpoPushClient $expo): void
    {
        $notification = Notification::find($this->notificationId);
        if (! $notification || $notification->push_received_at !== null) return;

        $expo->push($this->tokens, $this->title, $this->body, $this->payload, 'default', 'new-course');
    }
}
