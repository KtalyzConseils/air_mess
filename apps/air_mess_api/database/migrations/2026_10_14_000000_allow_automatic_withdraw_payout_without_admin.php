<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Un retrait self-service (mode instant) confirmé par le webhook FedaPay n'a
 * aucun admin : paid_by_admin_id doit pouvoir rester NULL quand le virement
 * est payé. L'ancienne contrainte faisait échouer (HTTP 500) chaque webhook
 * de succès en mode instant → retrait jamais marqué payé.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE wallet_withdraw_requests DROP CONSTRAINT IF EXISTS wallet_withdraw_requests_paid_consistency_check');
        DB::statement(<<<'SQL'
            ALTER TABLE wallet_withdraw_requests
            ADD CONSTRAINT wallet_withdraw_requests_paid_consistency_check
            CHECK (
                (paid_at IS NULL AND external_payout_reference IS NULL AND paid_by_admin_id IS NULL)
                OR
                (paid_at IS NOT NULL AND external_payout_reference IS NOT NULL AND status = 'approved')
            )
        SQL);
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE wallet_withdraw_requests DROP CONSTRAINT IF EXISTS wallet_withdraw_requests_paid_consistency_check');
        DB::statement(<<<'SQL'
            ALTER TABLE wallet_withdraw_requests
            ADD CONSTRAINT wallet_withdraw_requests_paid_consistency_check
            CHECK (
                (paid_at IS NULL AND external_payout_reference IS NULL AND paid_by_admin_id IS NULL)
                OR
                (paid_at IS NOT NULL AND external_payout_reference IS NOT NULL AND paid_by_admin_id IS NOT NULL AND status = 'approved')
            )
        SQL);
    }
};
