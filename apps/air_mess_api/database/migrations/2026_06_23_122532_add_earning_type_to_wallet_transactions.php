<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Ajoute un 5e type de transaction wallet : 'earning' (gain de course livrée).
 * Les gains s'ajoutent désormais directement à la caution du driver.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Drop l'ancien CHECK type pour le réécrire
        DB::statement('ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check');
        DB::statement(<<<'SQL'
            ALTER TABLE wallet_transactions
            ADD CONSTRAINT wallet_transactions_type_check
            CHECK (type IN ('deposit', 'withdraw', 'pickup_debit', 'refund', 'earning'))
        SQL);

        // Drop et recrée le CHECK signe avec 'earning' parmi les positifs
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

    public function down(): void
    {
        DB::statement('ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check');
        DB::statement(<<<'SQL'
            ALTER TABLE wallet_transactions
            ADD CONSTRAINT wallet_transactions_type_check
            CHECK (type IN ('deposit', 'withdraw', 'pickup_debit', 'refund'))
        SQL);

        DB::statement('ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_amount_sign_check');
        DB::statement(<<<'SQL'
            ALTER TABLE wallet_transactions
            ADD CONSTRAINT wallet_transactions_amount_sign_check
            CHECK (
                (type IN ('deposit', 'refund') AND amount_fcfa > 0)
                OR
                (type IN ('withdraw', 'pickup_debit') AND amount_fcfa < 0)
            )
        SQL);
    }
};
