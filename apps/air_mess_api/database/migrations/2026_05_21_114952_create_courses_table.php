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
        Schema::create('courses', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 20)->unique(); // ex: AM-2026-00001

            // Acteurs
            $table->foreignId('sender_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('driver_id')->nullable()->constrained('drivers')->nullOnDelete();
            $table->foreignId('package_category_id')->constrained('package_categories')->restrictOnDelete();

            // Statut courant
            $table->enum('status', [
                'pending_preparation', 'awaiting_assignment',
                'assigned', 'driver_to_pickup', 'at_pickup',
                'picked_up', 'at_dropoff', 'delivered',
                'cancelled', 'failed', 'disputed',
            ])->default('awaiting_assignment');

            // ===== ORIGINE (snapshot) =====
            $table->foreignId('origin_address_id')->nullable()->constrained('addresses')->nullOnDelete();
            $table->string('origin_name', 150);
            $table->string('origin_phone', 20);
            $table->string('origin_street')->nullable();
            $table->string('origin_landmark')->nullable();
            $table->string('origin_quartier', 100);
            $table->string('origin_city', 100);
            $table->decimal('origin_lat', 10, 7);
            $table->decimal('origin_lng', 10, 7);
            $table->text('origin_instructions')->nullable();

            // ===== DESTINATION (snapshot) =====
            $table->foreignId('destination_address_id')->nullable()->constrained('addresses')->nullOnDelete();
            $table->string('destination_name', 150);
            $table->string('destination_phone', 20);
            $table->string('destination_street')->nullable();
            $table->string('destination_landmark')->nullable();
            $table->string('destination_quartier', 100);
            $table->string('destination_city', 100);
            $table->decimal('destination_lat', 10, 7);
            $table->decimal('destination_lng', 10, 7);
            $table->text('destination_instructions')->nullable();

            // ===== COLIS =====
            $table->string('package_description', 255);
            $table->enum('package_size', ['S', 'M', 'L', 'XL'])->default('M');
            $table->decimal('package_weight_kg', 5, 2)->nullable();
            $table->decimal('package_declared_value', 12, 2)->nullable();

            // ===== TARIFICATION =====
            $table->decimal('delivery_fee', 10, 2);   // ce que paye l'expéditeur
            $table->decimal('driver_earnings', 10, 2); // ce que touche le livreur
            $table->enum('urgency', ['standard', 'express'])->default('standard');

            // ===== ENCAISSEMENT À LA LIVRAISON =====
            $table->boolean('has_collection')->default(false);
            $table->decimal('collection_amount', 12, 2)->nullable();
            $table->enum('collection_method', ['cash', 'mobile_money', 'prepaid'])->nullable();

            // ===== TIMING =====
            $table->timestamp('scheduled_for')->nullable(); // si « à préparer »

            // ===== TRACKING =====
            $table->string('tracking_token', 32)->unique(); // pour airmess.bj/t/XXX
            $table->string('delivery_code', 10)->nullable(); // code 4 chiffres SMS au destinataire

            // ===== TIMESTAMPS DE CYCLE =====
            $table->timestamp('assigned_at')->nullable();
            $table->timestamp('picked_up_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->text('cancellation_reason')->nullable();
            $table->foreignId('cancelled_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();

            // Index utiles
            $table->index('status');
            $table->index('sender_id');
            $table->index('driver_id');
            $table->index('created_at');
            $table->index(['status', 'driver_id']); // dashboard livreur
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('courses');
    }
};
