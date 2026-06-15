<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('driver_earnings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('driver_id')->constrained('drivers')->cascadeOnDelete();
            $table->foreignId('course_id')->constrained('courses')->cascadeOnDelete();
            $table->unsignedInteger('amount_fcfa');

            // pending = course livrée mais pas encore versée au livreur
            // paid    = incluse dans un payout réussi
            // void    = course annulée/remboursée — earning invalidé
            $table->enum('status', ['pending', 'paid', 'void'])->default('pending')->index();

            // Lien vers le payout qui a réglé cette ligne (null tant que pas payé)
            $table->foreignId('payout_id')->nullable()->constrained('driver_payouts')->nullOnDelete();

            $table->timestamp('credited_at')->nullable();
            $table->timestamps();

            $table->unique('course_id'); // 1 course = 1 earning
            $table->index(['driver_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('driver_earnings');
    }
};
