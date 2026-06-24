<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Trace du virement réel effectué APRÈS approbation d'une demande de retrait.
 *
 * Cycle de vie complet d'une demande approuvée :
 *  1. status='approved' → wallet débité (caution prise)
 *  2. admin va virer manuellement sur MoMo/banque
 *  3. admin revient marquer la demande comme effectivement payée → renseigne
 *     external_payout_reference (numéro de transaction MoMo/banque) + paid_at
 *
 * Sans ces champs, on n'avait AUCUNE preuve qu'un virement avait bien été fait.
 * Risque #1 de litige "je n'ai pas reçu mon argent" (cf. project_wallet_driver_todo #2).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('wallet_withdraw_requests', function (Blueprint $table) {
            $table->string('external_payout_reference', 100)
                ->nullable()
                ->after('rejection_reason');
            $table->timestamp('paid_at')
                ->nullable()
                ->after('external_payout_reference');
            $table->foreignId('paid_by_admin_id')
                ->nullable()
                ->after('paid_at')
                ->constrained('admins')
                ->nullOnDelete();
        });

        // Cohérence : si paid_at est rempli, external_payout_reference doit l'être aussi
        // ET la demande doit être approved (pas pending/rejected/cancelled).
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

    public function down(): void
    {
        DB::statement('ALTER TABLE wallet_withdraw_requests DROP CONSTRAINT IF EXISTS wallet_withdraw_requests_paid_consistency_check');
        Schema::table('wallet_withdraw_requests', function (Blueprint $table) {
            $table->dropConstrainedForeignId('paid_by_admin_id');
            $table->dropColumn(['external_payout_reference', 'paid_at']);
        });
    }
};
