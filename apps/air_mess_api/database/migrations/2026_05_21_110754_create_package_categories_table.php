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
        Schema::create('package_categories', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique(); // 'standard', 'hot_meal', etc.
            $table->string('name', 100);
            $table->text('description')->nullable();

            // Contraintes opérationnelles
            $table->decimal('max_weight_kg', 5, 2)->nullable();
            $table->boolean('requires_isothermal_bag')->default(false);
            $table->boolean('requires_refrigeration')->default(false);
            $table->unsignedSmallInteger('max_delivery_minutes')->default(30);

            // Instructions automatiques au livreur
            $table->text('driver_instructions')->nullable();

            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('package_categories');
    }
};
