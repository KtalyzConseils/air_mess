<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wallet_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('driver_id')->constrained()->cascadeOnDelete();

            // Type d'opération (enum applicatif, contraint via CHECK Postgres ci-dessous)
            $table->string('type', 30);

            // Montant signé : positif pour deposit/refund, négatif pour withdraw/pickup_debit.
            // Cohérence : SUM(amount_fcfa) WHERE driver_id=X == driver_wallets.balance (à tout moment).
            $table->integer('amount_fcfa');

            // Snapshot de la balance APRÈS l'opération — audit / litige
            $table->unsignedInteger('balance_after');

            // Liens contextuels (NULL pour deposit/withdraw, renseignés pour pickup_debit/refund)
            $table->foreignId('course_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('payment_id')->nullable()->constrained()->nullOnDelete();

            // Contexte libre (raison du retrait, admin_id, ref Fedapay, etc.)
            $table->jsonb('metadata')->nullable();

            // Pas d'updated_at : une transaction est immuable.
            $table->timestamp('created_at')->useCurrent();

            $table->index(['driver_id', 'created_at']);
            $table->index('type');
        });

        // CHECK pour brider le type à 4 valeurs connues (équivalent enum Postgres).
        DB::statement(<<<'SQL'
            ALTER TABLE wallet_transactions
            ADD CONSTRAINT wallet_transactions_type_check
            CHECK (type IN ('deposit', 'withdraw', 'pickup_debit', 'refund'))
        SQL);

        // Sanity : un deposit/refund a un montant > 0, un withdraw/pickup_debit < 0.
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

    public function down(): void
    {
        Schema::dropIfExists('wallet_transactions');
    }
};
