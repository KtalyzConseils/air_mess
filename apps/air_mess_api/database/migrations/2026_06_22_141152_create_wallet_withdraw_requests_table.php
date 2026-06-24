<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wallet_withdraw_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('driver_id')->constrained()->cascadeOnDelete();

            $table->unsignedInteger('amount_fcfa');

            // Méthode de versement choisie par le driver
            $table->string('target_method', 20);           // 'momo' | 'bank'
            $table->string('target_account', 100);         // numéro MoMo ou IBAN

            // Cycle de vie de la demande
            $table->string('status', 20)->default('pending'); // pending | approved | rejected | cancelled

            // Décision admin (renseigné lorsque approved/rejected)
            $table->foreignId('decided_by_admin_id')->nullable()->constrained('admins')->nullOnDelete();
            $table->timestamp('decided_at')->nullable();
            $table->text('rejection_reason')->nullable();

            $table->timestamps();

            $table->index(['driver_id', 'status']);
            $table->index('status');
        });

        // CHECK : status restreint aux valeurs connues
        DB::statement(<<<'SQL'
            ALTER TABLE wallet_withdraw_requests
            ADD CONSTRAINT wallet_withdraw_requests_status_check
            CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'))
        SQL);

        // CHECK : target_method restreint
        DB::statement(<<<'SQL'
            ALTER TABLE wallet_withdraw_requests
            ADD CONSTRAINT wallet_withdraw_requests_method_check
            CHECK (target_method IN ('momo', 'bank'))
        SQL);

        // CHECK : amount > 0 (sanity au niveau BDD)
        DB::statement(<<<'SQL'
            ALTER TABLE wallet_withdraw_requests
            ADD CONSTRAINT wallet_withdraw_requests_amount_positive
            CHECK (amount_fcfa > 0)
        SQL);

        // CHECK : si decided_at renseigné, status doit être approved/rejected
        // (cohérence du cycle de vie)
        DB::statement(<<<'SQL'
            ALTER TABLE wallet_withdraw_requests
            ADD CONSTRAINT wallet_withdraw_requests_decision_consistency
            CHECK (
                (decided_at IS NULL AND status IN ('pending', 'cancelled'))
                OR
                (decided_at IS NOT NULL AND status IN ('approved', 'rejected'))
            )
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('wallet_withdraw_requests');
    }
};
