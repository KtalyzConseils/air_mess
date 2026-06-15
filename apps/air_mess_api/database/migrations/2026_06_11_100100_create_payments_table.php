<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();

            // Qui paie
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            // Quel type de flux : prévu pour les 5 flux futurs
            // 'subscription'  → flux 1 (abo marchand)
            // 'delivery_fee'  → flux 2 (frais de livraison)
            // 'payout'        → flux 3 (versement au livreur)
            // 'cod'           → flux 4 (encaissement à la livraison)
            $table->string('type', 30);

            // Montant en FCFA (entier, pas de décimales pour le franc CFA)
            $table->unsignedInteger('amount_fcfa');
            $table->string('currency', 3)->default('XOF');

            // Cycle de vie
            // pending     → créé, en attente de redirection user
            // processing  → user a cliqué "payer", en attente confirmation
            // paid        → confirmé par webhook
            // failed      → échec (refus, erreur réseau)
            // refunded    → remboursé (admin)
            $table->string('status', 20)->default('pending');

            // Provider
            $table->string('provider', 30);                       // 'fedapay', 'kkiapay', 'manual', 'cash'
            $table->string('provider_ref')->nullable()->index();  // ID transaction côté provider

            // Métier
            $table->string('description')->nullable();
            $table->json('metadata')->nullable();                 // contexte (plan_code, course_id, etc.)

            // Timing
            $table->timestamp('paid_at')->nullable();
            $table->text('failure_reason')->nullable();

            // Audit : on garde la dernière réponse du provider pour debug
            $table->json('raw_response')->nullable();

            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index(['type', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
