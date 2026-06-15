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
        Schema::create('course_status_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_id')->constrained()->cascadeOnDelete();
            $table->string('from_status', 50)->nullable();  // null à la création
            $table->string('to_status', 50);
            $table->foreignId('changed_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('changed_by_type', ['user', 'system'])->default('user');
            $table->text('reason')->nullable();
            $table->jsonb('metadata')->nullable();

            // Pas de updated_at — l'historique est append-only
            $table->timestamp('created_at')->useCurrent();

            $table->index(['course_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('course_status_history');
    }
};
