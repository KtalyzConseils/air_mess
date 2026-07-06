<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Ajoute le type `adjustment_incident` aux deux journaux de transactions wallet
 * (driver + user), pour matérialiser les ajustements post-livraison arbitrés
 * par un ops via `wallet_adjustments`.
 *
 * Signe : les incidents peuvent aller dans les deux sens
 *  - + : refund marchand après incident, refund driver après erreur inverse
 *  - − : débit driver responsable, débit marchand (rare)
 *
 * La ligne wallet_transactions générée porte `metadata.adjustment_id` → FK
 * inverse vers la ligne wallet_adjustments qui l'a causée.
 */
return new class extends Migration
{
    public function up(): void
    {
        // ===== Driver =====
        DB::statement('ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check');
        DB::statement(<<<'SQL'
            ALTER TABLE wallet_transactions
            ADD CONSTRAINT wallet_transactions_type_check
            CHECK (type IN (
                'deposit', 'withdraw', 'pickup_debit', 'refund', 'earning',
                'adjustment_credit', 'adjustment_debit', 'adjustment_incident'
            ))
        SQL);

        DB::statement('ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_amount_sign_check');
        DB::statement(<<<'SQL'
            ALTER TABLE wallet_transactions
            ADD CONSTRAINT wallet_transactions_amount_sign_check
            CHECK (
                (type IN ('deposit', 'refund', 'earning', 'adjustment_credit') AND amount_fcfa > 0)
                OR
                (type IN ('withdraw', 'pickup_debit', 'adjustment_debit') AND amount_fcfa < 0)
                OR
                (type = 'adjustment_incident' AND amount_fcfa <> 0)
            )
        SQL);

        // ===== User marchand/particulier =====
        DB::statement('ALTER TABLE user_wallet_transactions DROP CONSTRAINT IF EXISTS user_wallet_transactions_type_check');
        DB::statement(<<<'SQL'
            ALTER TABLE user_wallet_transactions
            ADD CONSTRAINT user_wallet_transactions_type_check
            CHECK (type IN (
                'deposit', 'course_charge', 'refund',
                'adjustment_credit', 'adjustment_debit', 'withdraw', 'adjustment_incident'
            ))
        SQL);

        DB::statement('ALTER TABLE user_wallet_transactions DROP CONSTRAINT IF EXISTS user_wallet_transactions_amount_sign_check');
        DB::statement(<<<'SQL'
            ALTER TABLE user_wallet_transactions
            ADD CONSTRAINT user_wallet_transactions_amount_sign_check
            CHECK (
                (type IN ('deposit', 'refund', 'adjustment_credit') AND amount_fcfa > 0)
                OR
                (type IN ('course_charge', 'adjustment_debit', 'withdraw') AND amount_fcfa < 0)
                OR
                (type = 'adjustment_incident' AND amount_fcfa <> 0)
            )
        SQL);
    }

    public function down(): void
    {
        // ===== Driver — restaure le CHECK sans adjustment_incident =====
        DB::statement('ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check');
        DB::statement(<<<'SQL'
            ALTER TABLE wallet_transactions
            ADD CONSTRAINT wallet_transactions_type_check
            CHECK (type IN ('deposit', 'withdraw', 'pickup_debit', 'refund', 'earning', 'adjustment_credit', 'adjustment_debit'))
        SQL);

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

        // ===== User — idem =====
        DB::statement('ALTER TABLE user_wallet_transactions DROP CONSTRAINT IF EXISTS user_wallet_transactions_type_check');
        DB::statement(<<<'SQL'
            ALTER TABLE user_wallet_transactions
            ADD CONSTRAINT user_wallet_transactions_type_check
            CHECK (type IN ('deposit', 'course_charge', 'refund', 'adjustment_credit', 'adjustment_debit', 'withdraw'))
        SQL);

        DB::statement('ALTER TABLE user_wallet_transactions DROP CONSTRAINT IF EXISTS user_wallet_transactions_amount_sign_check');
        DB::statement(<<<'SQL'
            ALTER TABLE user_wallet_transactions
            ADD CONSTRAINT user_wallet_transactions_amount_sign_check
            CHECK (
                (type IN ('deposit', 'refund', 'adjustment_credit') AND amount_fcfa > 0)
                OR
                (type IN ('course_charge', 'adjustment_debit', 'withdraw') AND amount_fcfa < 0)
            )
        SQL);
    }
};
