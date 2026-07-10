<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Ajoute le type `collection_credit` au journal `user_wallet_transactions`.
 *
 * À la livraison d'une course avec has_collection=true, le collection_amount
 * (que le driver a physiquement collecté chez le destinataire) est crédité
 * sur le wallet du marchand. Sans ce type, le marchand ne recevait jamais
 * l'argent qu'un tiers a collecté pour lui.
 *
 * On étend :
 *   - le CHECK de type (nouvelle valeur autorisée)
 *   - le CHECK de signe (credit → amount_fcfa > 0)
 *   - l'index UNIQUE partiel (course_id, type) pour couvrir l'idempotence
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

        // Idempotence ultime : une même course ne peut produire qu'un seul
        // collection_credit (empêche le double-crédit si le webhook rejoue).
        DB::statement('DROP INDEX IF EXISTS user_wallet_transactions_course_type_unique');
        DB::statement(<<<'SQL'
            CREATE UNIQUE INDEX user_wallet_transactions_course_type_unique
            ON user_wallet_transactions (course_id, type)
            WHERE course_id IS NOT NULL
              AND type IN ('course_charge', 'refund', 'collection_credit')
        SQL);
    }

    public function down(): void
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

        DB::statement('DROP INDEX IF EXISTS user_wallet_transactions_course_type_unique');
        DB::statement(<<<'SQL'
            CREATE UNIQUE INDEX user_wallet_transactions_course_type_unique
            ON user_wallet_transactions (course_id, type)
            WHERE course_id IS NOT NULL
              AND type IN ('course_charge', 'refund')
        SQL);
    }
};
