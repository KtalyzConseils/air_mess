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
        Schema::create('addresses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            // Étiquette libre côté user (carnet)
            $table->string('label', 100)->nullable(); // "Maison", "Bureau Atlantique"

            // Destinataire
            $table->string('recipient_name', 150);
            $table->string('recipient_phone', 20);

            // Localisation
            $table->string('street')->nullable();
            $table->string('landmark')->nullable(); // point de repère ("après la pharmacie La Grâce")
            $table->string('quartier', 100);
            $table->string('city', 100);
            $table->decimal('lat', 10, 7)->nullable();
            $table->decimal('lng', 10, 7)->nullable();

            $table->text('instructions')->nullable(); // "Appeler 5 min avant"
            $table->boolean('is_default')->default(false);
            $table->unsignedInteger('usage_count')->default(0); // pour tri "récemment utilisé"

            $table->timestamps();

            $table->index('user_id');
            $table->index(['user_id', 'recipient_phone']); // recherche rapide carnet
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('addresses');
    }
};
