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
        Schema::create('course_incidents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_id')->constrained()->cascadeOnDelete();

            // Qui a signalé
            $table->foreignId('reported_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('reporter_type', 20)->default('driver'); // driver | marchant | admin | system

            // Nature de l'incident
            $table->string('type', 40);                  // typologie (voir le modèle)
            $table->text('description')->nullable();
            $table->string('photo_url')->nullable();      // rempli plus tard (sous-chantier photo)

            // Où il s'est produit
            $table->decimal('lat', 10, 7)->nullable();
            $table->decimal('lng', 10, 7)->nullable();

            // Résolution (utilisée par l'admin/support plus tard)
            $table->enum('status', ['open', 'resolved', 'cancelled'])->default('open');
            $table->text('resolution_note')->nullable();
            $table->foreignId('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('resolved_at')->nullable();

            $table->timestamps();

            $table->index(['course_id', 'status']);
            $table->index('type');
        });
    }


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('course_incidents');
    }
};
