<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Champs pour l'intégration FedaPay Payout API (cf. project_wallet_driver_todo #1).
 *
 *  - payout_initiated_at  : timestamp où le système a appelé l'API payout
 *  - payout_provider_ref  : id FedaPay du payout (utilisé pour matcher le webhook)
 *  - payout_failed_at     : si l'appel API ou le webhook a échoué (admin doit retenter)
 *  - payout_failure_reason: message d'erreur (debug)
 *
 * Le champ `paid_at` existant reste rempli SEULEMENT quand le webhook approved est reçu
 * (preuve que l'argent est parti). Si l'admin a fait le virement manuellement, il remplit
 * aussi paid_at via le bouton existant — fallback du système resilient.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('wallet_withdraw_requests', function (Blueprint $table) {
            $table->timestamp('payout_initiated_at')->nullable()->after('paid_by_admin_id');
            $table->string('payout_provider_ref', 100)->nullable()->after('payout_initiated_at');
            $table->timestamp('payout_failed_at')->nullable()->after('payout_provider_ref');
            $table->text('payout_failure_reason')->nullable()->after('payout_failed_at');
            $table->index('payout_provider_ref');
        });
    }

    public function down(): void
    {
        Schema::table('wallet_withdraw_requests', function (Blueprint $table) {
            $table->dropIndex(['payout_provider_ref']);
            $table->dropColumn([
                'payout_initiated_at',
                'payout_provider_ref',
                'payout_failed_at',
                'payout_failure_reason',
            ]);
        });
    }
};
