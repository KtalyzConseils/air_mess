<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('accounting_journals', function (Blueprint $table) {
            $table->id();
            $table->string('event_type', 80);
            $table->string('description', 500)->nullable();
            $table->foreignId('course_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('payment_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('wallet_withdraw_request_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('driver_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('admin_id')->nullable()->constrained()->nullOnDelete();
            $table->string('idempotency_key', 160)->unique();
            $table->json('metadata')->nullable();
            $table->timestamp('occurred_at')->useCurrent();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['event_type', 'occurred_at']);
            $table->index(['course_id', 'occurred_at']);
            $table->index(['driver_id', 'occurred_at']);
            $table->index(['user_id', 'occurred_at']);
        });

        Schema::create('accounting_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('accounting_journal_id')->constrained()->cascadeOnDelete();
            $table->string('account_code', 80);
            $table->string('account_name', 160);
            $table->string('direction', 10);
            $table->integer('amount_fcfa');
            $table->string('currency', 3)->default('XOF');
            $table->string('holder_type', 40)->nullable();
            $table->unsignedBigInteger('holder_id')->nullable();
            $table->string('counterparty_type', 40)->nullable();
            $table->unsignedBigInteger('counterparty_id')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['account_code', 'created_at']);
            $table->index(['holder_type', 'holder_id']);
            $table->index(['counterparty_type', 'counterparty_id']);
        });

        DB::statement("ALTER TABLE accounting_lines ADD CONSTRAINT accounting_lines_direction_check CHECK (direction IN ('debit', 'credit'))");
        DB::statement('ALTER TABLE accounting_lines ADD CONSTRAINT accounting_lines_amount_positive_check CHECK (amount_fcfa > 0)');
    }

    public function down(): void
    {
        Schema::dropIfExists('accounting_lines');
        Schema::dropIfExists('accounting_journals');
    }
};
