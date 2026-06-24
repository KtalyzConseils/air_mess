<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Journal IMMUABLE des opérations sur les user_wallets (marchand + particulier).
 *
 * Convention de signe (enforcée par CHECK Postgres) :
 *  - deposit, refund, adjustment_credit  : amount_fcfa > 0
 *  - course_charge, adjustment_debit     : amount_fcfa < 0
 *
 * Idempotence : UNIQUE partielle (user_id, course_id, type) sur les types liés à
 * une course (course_charge, refund) — empêche tout double débit/refund pour la
 * même course même en cas de retry.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_wallet_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            $table->string('type', 30);
            $table->integer('amount_fcfa');                                  // signé
            $table->unsignedInteger('balance_after');                        // snapshot audit

            $table->foreignId('course_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('payment_id')->nullable()->constrained()->nullOnDelete();

            $table->jsonb('metadata')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['user_id', 'created_at']);
            $table->index('type');
        });

        // CHECK : type ∈ enum applicatif.
        DB::statement(<<<'SQL'
            ALTER TABLE user_wallet_transactions
            ADD CONSTRAINT user_wallet_transactions_type_check
            CHECK (type IN ('deposit', 'course_charge', 'refund', 'adjustment_credit', 'adjustment_debit'))
        SQL);

        // CHECK : cohérence signe / type.
        DB::statement(<<<'SQL'
            ALTER TABLE user_wallet_transactions
            ADD CONSTRAINT user_wallet_transactions_amount_sign_check
            CHECK (
                (type IN ('deposit', 'refund', 'adjustment_credit') AND amount_fcfa > 0)
                OR
                (type IN ('course_charge', 'adjustment_debit') AND amount_fcfa < 0)
            )
        SQL);

        // Idempotence ultime via UNIQUE partielle (Postgres).
        // Une même course ne peut produire qu'un seul course_charge et un seul refund.
        DB::statement(<<<'SQL'
            CREATE UNIQUE INDEX user_wallet_transactions_course_type_unique
            ON user_wallet_transactions (course_id, type)
            WHERE course_id IS NOT NULL
              AND type IN ('course_charge', 'refund')
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('user_wallet_transactions');
    }
};
