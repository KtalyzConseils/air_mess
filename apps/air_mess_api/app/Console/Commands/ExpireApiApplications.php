<?php

namespace App\Console\Commands;

use App\Models\ApiApplication;
use Illuminate\Console\Command;

/**
 * Suspend les ApiApplications dont `paid_until` est expiré.
 *
 * Lancée chaque nuit (cf. routes/console.php). Idempotente : ne touche que
 * les apps `active` avec `paid_until` non-null et passé.
 *
 * Les apps sur plan gratuit ont `paid_until = null` → jamais suspendues ici.
 */
class ExpireApiApplications extends Command
{
    protected $signature = 'api-apps:expire';
    protected $description = 'Suspend les ApiApplications dont l\'abonnement est expiré.';

    public function handle(): int
    {
        $now = now();

        $count = ApiApplication::query()
            ->where('status', ApiApplication::STATUS_ACTIVE)
            ->whereNotNull('paid_until')
            ->where('paid_until', '<', $now)
            ->update(['status' => ApiApplication::STATUS_SUSPENDED]);

        $this->info("$count ApiApplication(s) suspendue(s) pour expiration.");
        return self::SUCCESS;
    }
}
