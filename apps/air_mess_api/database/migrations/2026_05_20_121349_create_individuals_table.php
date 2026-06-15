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
        Schema::create('individuals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();

            // Identité
            $table->string('first_name');
            $table->string('last_name');
            $table->enum('gender', ['M', 'F', 'autre'])->nullable();
            $table->date('birth_date')->nullable();
            $table->string('cni_number', 50)->nullable();

            // Anti-abus : limitation volume
            $table->unsignedInteger('monthly_courses_used')->default(0);
            $table->unsignedInteger('monthly_courses_limit')->default(20);
            $table->date('monthly_period_started_at')->default(now());

            // Score de fraude (incrémenté sur incidents)
            $table->unsignedInteger('fraud_score')->default(0);

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('individuals');
    }
};
