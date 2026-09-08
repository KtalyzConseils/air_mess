<?php

namespace App\Jobs;

use App\Models\DeviceToken;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CheckExpoPushReceipts implements ShouldQueue
{
    use Queueable;

    public int $tries = 5;

    /** @param array<string, string> $receiptTokens receipt id => Expo token */
    public function __construct(public array $receiptTokens) {}

    public function handle(): void
    {
        if ($this->receiptTokens === []) {
            return;
        }

        $response = Http::acceptJson()
            ->asJson()
            ->retry(3, 1000, throw: false)
            ->post('https://exp.host/--/api/v2/push/getReceipts', [
                'ids' => array_keys($this->receiptTokens),
            ]);

        if (! $response->successful()) {
            Log::warning('Expo push receipts unavailable', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            $this->release(60);
            return;
        }

        $receipts = (array) $response->json('data', []);
        foreach ($receipts as $receiptId => $receipt) {
            if (($receipt['status'] ?? null) !== 'error') {
                continue;
            }

            $token = $this->receiptTokens[$receiptId] ?? null;
            $error = $receipt['details']['error'] ?? 'unknown';
            Log::warning('Expo push receipt failed', compact('receiptId', 'token', 'error'));

            if ($token && $error === 'DeviceNotRegistered') {
                DeviceToken::where('token', $token)->delete();
            }
        }

        $missing = array_diff_key($this->receiptTokens, $receipts);
        if ($missing !== []) {
            $this->receiptTokens = $missing;
            $this->release(180);
        }
    }
}
