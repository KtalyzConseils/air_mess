<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Ajoute le type `withdraw` au journal `user_wallet_transactions`.
 *
 * Le retrait marchand/particulier s'inscrit avec `amount_fcfa < 0` (débit).
 * On étend le CHECK de type + le CHECK de cohérence signe/type.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE user_wallet_transactions DROP CONSTRAINT IF EXISTS user_wallet_transactions_type_check');
        DB::statement('ALTER TABLE user_wallet_transactions DROP CONSTRAINT IF EXISTS user_wallet_transactions_amount_sign_check');

        DB::statement(<<<'SQL'
            ALTER TABLE user_wallet_transactions
            ADD CONSTRAINT user_wallet_transactions_type_check
            CHECK (type IN ('deposit', 'course_charge', 'refund', 'adjustment_credit', 'adjustment_debit', 'withdraw'))
        SQL);

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

    public function down(): void
    {
        DB::statement('ALTER TABLE user_wallet_transactions DROP CONSTRAINT IF EXISTS user_wallet_transactions_type_check');
        DB::statement('ALTER TABLE user_wallet_transactions DROP CONSTRAINT IF EXISTS user_wallet_transactions_amount_sign_check');

        DB::statement(<<<'SQL'
            ALTER TABLE user_wallet_transactions
            ADD CONSTRAINT user_wallet_transactions_type_check
            CHECK (type IN ('deposit', 'course_charge', 'refund', 'adjustment_credit', 'adjustment_debit'))
        SQL);

        DB::statement(<<<'SQL'
            ALTER TABLE user_wallet_transactions
            ADD CONSTRAINT user_wallet_transactions_amount_sign_check
            CHECK (
                (type IN ('deposit', 'refund', 'adjustment_credit') AND amount_fcfa > 0)
                OR
                (type IN ('course_charge', 'adjustment_debit') AND amount_fcfa < 0)
            )
        SQL);
    }
};
