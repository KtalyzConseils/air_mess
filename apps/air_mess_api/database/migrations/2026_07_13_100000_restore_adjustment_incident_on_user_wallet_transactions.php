<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Corrige une régression : la migration
 * 2026_07_10_100000_add_collection_credit_type_to_user_wallet_transactions a
 * reconstruit les CHECK de `user_wallet_transactions` en repartant d'une base
 * qui NE contenait PAS `adjustment_incident` (ajouté le 2026_07_03_110100).
 *
 * Conséquence : tout arbitrage d'incident touchant le wallet marchand
 * (WalletAdjustmentService::applyToUser → type 'adjustment_incident')
 * violait le CHECK et renvoyait une 500.
 *
 * On restaure `adjustment_incident` dans les DEUX contraintes (type + signe),
 * en conservant `collection_credit`. `adjustment_incident` autorise les deux
 * signes (crédit ou débit), donc simplement amount_fcfa <> 0.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Contraintes CHECK spécifiques Postgres : ignorées sur sqlite (tests).
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('ALTER TABLE user_wallet_transactions DROP CONSTRAINT IF EXISTS user_wallet_transactions_type_check');
        DB::statement('ALTER TABLE user_wallet_transactions DROP CONSTRAINT IF EXISTS user_wallet_transactions_amount_sign_check');

        DB::statement(<<<'SQL'
            ALTER TABLE user_wallet_transactions
            ADD CONSTRAINT user_wallet_transactions_type_check
            CHECK (type IN ('deposit', 'course_charge', 'refund', 'adjustment_credit', 'adjustment_debit', 'withdraw', 'collection_credit', 'adjustment_incident'))
        SQL);

        DB::statement(<<<'SQL'
            ALTER TABLE user_wallet_transactions
            ADD CONSTRAINT user_wallet_transactions_amount_sign_check
            CHECK (
                (type IN ('deposit', 'refund', 'adjustment_credit', 'collection_credit') AND amount_fcfa > 0)
                OR
                (type IN ('course_charge', 'adjustment_debit', 'withdraw') AND amount_fcfa < 0)
                OR
                (type = 'adjustment_incident' AND amount_fcfa <> 0)
            )
        SQL);
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        // Retour à l'état posé par la migration du 2026_07_10 (sans adjustment_incident).
        DB::statement('ALTER TABLE user_wallet_transactions DROP CONSTRAINT IF EXISTS user_wallet_transactions_type_check');
        DB::statement('ALTER TABLE user_wallet_transactions DROP CONSTRAINT IF EXISTS user_wallet_transactions_amount_sign_check');

        DB::statement(<<<'SQL'
            ALTER TABLE user_wallet_transactions
            ADD CONSTRAINT user_wallet_transactions_type_check
            CHECK (type IN ('deposit', 'course_charge', 'refund', 'adjustment_credit', 'adjustment_debit', 'withdraw', 'collection_credit'))
        SQL);

        DB::statement(<<<'SQL'
            ALTER TABLE user_wallet_transactions
            ADD CONSTRAINT user_wallet_transactions_amount_sign_check
            CHECK (
                (type IN ('deposit', 'refund', 'adjustment_credit', 'collection_credit') AND amount_fcfa > 0)
                OR
                (type IN ('course_charge', 'adjustment_debit', 'withdraw') AND amount_fcfa < 0)
            )
        SQL);
    }
};
