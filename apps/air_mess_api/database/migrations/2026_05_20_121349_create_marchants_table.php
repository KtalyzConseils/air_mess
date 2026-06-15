<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('marchants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();

            // Identité légale
            $table->string('raison_sociale');
            $table->string('ifu_rccm', 50)->nullable();
            $table->enum('secteur_activite', [
                'supermarche', 'restaurant', 'boutique',
                'pharmacie', 'ecommerce', 'autre'
            ]);

            // Abonnement
            $table->enum('subscription_plan', ['trial', 'starter', 'pro', 'business'])
                  ->default('trial');
            $table->enum('subscription_status', ['trial', 'active', 'suspended', 'churned'])
                  ->default('trial');
            $table->timestamp('subscription_started_at')->nullable();
            $table->timestamp('subscription_next_billing_at')->nullable();

            // Validation et suivi commercial
            $table->timestamp('validated_at')->nullable();
            $table->foreignId('validated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('commercial_assigned_to')->nullable()->constrained('users')->nullOnDelete();

            // Profil
            $table->string('logo_url')->nullable();
            $table->jsonb('opening_hours')->nullable();
            $table->text('notes')->nullable();

            $table->timestamps();

            $table->index('subscription_status');
            $table->index('secteur_activite');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('marchants');
    }
};
