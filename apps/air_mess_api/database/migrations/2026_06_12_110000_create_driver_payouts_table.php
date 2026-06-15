<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('driver_payouts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('driver_id')->constrained('drivers')->cascadeOnDelete();
            $table->unsignedInteger('total_amount_fcfa');
            $table->unsignedInteger('earnings_count')->default(0);

            // pending = en attente de virement
            // paid    = viré au livreur
            // failed  = échec du virement
            $table->enum('status', ['pending', 'paid', 'failed'])->default('pending')->index();

            // Méthode de paiement utilisée (mobile_money, bank_transfer, cash)
            $table->string('method', 30)->default('mobile_money');
            $table->string('destination', 100)->nullable(); // num MoMo, IBAN, etc.

            $table->date('period_start');
            $table->date('period_end');
            $table->timestamp('paid_at')->nullable();
            $table->text('failure_reason')->nullable();
            $table->jsonb('metadata')->nullable();

            // ID admin qui a déclenché le payout
            $table->foreignId('triggered_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['driver_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('driver_payouts');
    }
};
