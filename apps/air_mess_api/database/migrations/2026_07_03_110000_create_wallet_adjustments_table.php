<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Journal UNIFIÉ des ajustements financiers arbitrés par un ops sur les
 * wallets driver + user marchand/particulier — c'est la source de vérité
 * pour tous les remboursements, débits d'incident et saisies de caution.
 *
 * Principe cardinal : à partir de cette table, plus aucun mouvement wallet
 * non-transactionnel ne se fait sans ligne d'audit ici. Chaque `wallet_adjustments`
 * déclenche AUTOMATIQUEMENT une ligne dans `user_wallet_transactions` (si
 * `wallet_type='user'`) ou `wallet_transactions` (si `wallet_type='driver'`)
 * — le service applique les deux dans la même transaction DB.
 *
 * Table IMMUABLE : jamais d'UPDATE. Une correction = une nouvelle ligne inverse.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wallet_adjustments', function (Blueprint $table) {
            $table->id();

            // Cible polymorphe : driver ou user. Les deux FK sont mutuellement
            // exclusives via CHECK — voir plus bas.
            $table->string('wallet_type', 10);                                  // 'driver' | 'user'
            $table->foreignId('wallet_owner_id');                                // driver_id ou user_id (sémantique dépend du wallet_type)

            $table->integer('amount_fcfa');                                     // signé : + = crédit, − = débit
            $table->string('reason_code', 40);                                  // enum applicatif (voir CHECK)
            $table->text('notes')->nullable();                                  // libre — contexte pour audit

            // Liens contextuels (aident la réconciliation + rapports).
            $table->foreignId('course_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('incident_id')->nullable()->constrained('course_incidents')->nullOnDelete();
            $table->foreignId('admin_id')->nullable()->constrained('admins')->nullOnDelete();

            // Snapshot de la balance après application — utile pour l'audit sans
            // devoir rejouer tout l'historique.
            $table->integer('balance_after')->nullable();

            $table->timestamp('created_at')->useCurrent();

            $table->index(['wallet_type', 'wallet_owner_id', 'created_at']);
            $table->index('course_id');
            $table->index('incident_id');
            $table->index('reason_code');
        });

        // CHECK : wallet_type strictement contrôlé.
        DB::statement(<<<'SQL'
            ALTER TABLE wallet_adjustments
            ADD CONSTRAINT wallet_adjustments_type_check
            CHECK (wallet_type IN ('driver', 'user'))
        SQL);

        // CHECK : reason_code restreint aux valeurs applicatives connues.
        // (Empêche les typos qui casseraient les rapports par motif.)
        DB::statement(<<<'SQL'
            ALTER TABLE wallet_adjustments
            ADD CONSTRAINT wallet_adjustments_reason_check
            CHECK (reason_code IN (
                'incident_refund',
                'incident_debit',
                'caution_seizure',
                'no_show_refund',
                'return_shipping_fee',
                'manual_credit',
                'manual_debit'
            ))
        SQL);

        // CHECK signe/reason : cohérence stricte crédit vs débit.
        DB::statement(<<<'SQL'
            ALTER TABLE wallet_adjustments
            ADD CONSTRAINT wallet_adjustments_amount_sign_check
            CHECK (
                (reason_code IN ('incident_refund', 'no_show_refund', 'manual_credit') AND amount_fcfa > 0)
                OR
                (reason_code IN ('incident_debit', 'caution_seizure', 'return_shipping_fee', 'manual_debit') AND amount_fcfa < 0)
            )
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('wallet_adjustments');
    }
};
