<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Filet ultime BDD pour l'idempotence : une course ne peut avoir
     * qu'UN seul pickup_debit et qu'UN seul refund. Si un retry double-appelle
     * debitForPickup() malgré le check applicatif, Postgres rejette.
     *
     * NB : course_id=NULL (deposit/withdraw) → autant de lignes qu'on veut,
     * car en Postgres NULL ≠ NULL dans les contraintes UNIQUE.
     */
    public function up(): void
    {
        DB::statement(<<<'SQL'
            ALTER TABLE wallet_transactions
            ADD CONSTRAINT wallet_transactions_course_type_unique
            UNIQUE (course_id, type)
        SQL);
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_course_type_unique');
    }
};
