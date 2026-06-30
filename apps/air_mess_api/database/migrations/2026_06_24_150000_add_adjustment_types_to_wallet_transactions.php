<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Ajoute 2 types de transaction wallet driver : 'adjustment_credit' et 'adjustment_debit'.
 *
 * Pourquoi : permet à un super-admin de créditer/débiter manuellement un wallet driver
 * pour des cas qui ne passent pas par le flow normal (Fedapay top-up, débit course) :
 *  - Bug correctif (un débit qui aurait dû se faire mais n'est pas passé)
 *  - Top-up MoMo direct (driver a payé en MoMo perso, admin saisit la valeur)
 *  - Geste commercial
 *  - Test/dev
 *
 * Chaque ajustement créera 1 ligne wallet_transactions avec admin_id + raison en metadata.
 *
 * Cohérence avec user_wallet_transactions : ces 2 types y existent déjà depuis la phase 1.
 */
return new class extends Migration
{
    public function up(): void
    {
        // CHECK type : ajout des 2 nouveaux types
        DB::statement('ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check');
        DB::statement(<<<'SQL'
            ALTER TABLE wallet_transactions
            ADD CONSTRAINT wallet_transactions_type_check
            CHECK (type IN ('deposit', 'withdraw', 'pickup_debit', 'refund', 'earning', 'adjustment_credit', 'adjustment_debit'))
        SQL);

        // CHECK signe : adjustment_credit rejoint les positifs, adjustment_debit les négatifs
        DB::statement('ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_amount_sign_check');
        DB::statement(<<<'SQL'
            ALTER TABLE wallet_transactions
            ADD CONSTRAINT wallet_transactions_amount_sign_check
            CHECK (
                (type IN ('deposit', 'refund', 'earning', 'adjustment_credit') AND amount_fcfa > 0)
                OR
                (type IN ('withdraw', 'pickup_debit', 'adjustment_debit') AND amount_fcfa < 0)
            )
        SQL);
    }

    public function down(): void
    {
        // Restaurer les CHECK précédents (sans adjustment_*)
        DB::statement('ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check');
        DB::statement(<<<'SQL'
            ALTER TABLE wallet_transactions
            ADD CONSTRAINT wallet_transactions_type_check
            CHECK (type IN ('deposit', 'withdraw', 'pickup_debit', 'refund', 'earning'))
        SQL);

        DB::statement('ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_amount_sign_check');
        DB::statement(<<<'SQL'
            ALTER TABLE wallet_transactions
            ADD CONSTRAINT wallet_transactions_amount_sign_check
            CHECK (
                (type IN ('deposit', 'refund', 'earning') AND amount_fcfa > 0)
                OR
                (type IN ('withdraw', 'pickup_debit') AND amount_fcfa < 0)
            )
        SQL);
    }
};
