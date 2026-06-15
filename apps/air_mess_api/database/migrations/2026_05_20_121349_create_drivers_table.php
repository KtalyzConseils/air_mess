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
        Schema::create('drivers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();

            // Identité
            $table->string('first_name');
            $table->string('last_name');
            $table->enum('gender', ['M', 'F', 'autre'])->nullable();
            $table->date('birth_date')->nullable();

            // Documents (URLs S3/MinIO — chiffrés au repos via S3 SSE)
            $table->string('photo_url')->nullable();
            $table->string('cni_url')->nullable();
            $table->string('driving_license_url')->nullable();

            // Véhicule
            $table->enum('vehicle_type', ['scooter', 'moto', 'voiture', 'velo']);
            $table->string('vehicle_plate', 20)->nullable();
            $table->string('vehicle_color', 30)->nullable();

            // Équipement déclaré (filtre d'attribution)
            $table->jsonb('equipment')->default('{"isothermal_bag": false, "top_case": false, "refrigerated_bag": false}');

            // Contact d'urgence et carte sanitaire
            $table->string('emergency_contact_name')->nullable();
            $table->string('emergency_contact_phone', 20)->nullable();
            $table->jsonb('health_card')->nullable(); // groupe sanguin, allergies, conditions

            // Statut d'activation (cycle de vie)
            $table->enum('activation_status', ['pending', 'validated', 'active', 'suspended'])
                  ->default('pending');

            // Statut d'activité (live)
            $table->enum('availability_status', ['offline', 'available', 'busy', 'on_break'])
                  ->default('offline');

            // Position actuelle (dénormalisée pour requêtes rapides)
            $table->decimal('current_lat', 10, 7)->nullable();
            $table->decimal('current_lng', 10, 7)->nullable();
            $table->timestamp('last_position_at')->nullable();

            // Performance
            $table->decimal('acceptance_rate', 5, 2)->default(100.00);
            $table->unsignedInteger('incidents_count')->default(0);

            $table->timestamps();

            $table->index('activation_status');
            $table->index('availability_status');
            $table->index(['current_lat', 'current_lng']);

        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('drivers');
    }
};
