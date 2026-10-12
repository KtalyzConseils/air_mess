<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('driver_waitlists', function (Blueprint $table) {
            $table->id();

            // Profil du livreur
            $table->string('vehicle_type', 80);
            $table->string('zone', 80);
            $table->string('zone_other', 160)->nullable();
            $table->string('experience', 80);
            $table->string('availability', 80);
            $table->string('source', 80)->nullable();
            $table->string('source_other', 160)->nullable();

            // Activité actuelle
            $table->json('platforms_used');
            $table->string('platforms_used_other', 160)->nullable();
            $table->string('weekly_deliveries', 40);
            $table->string('weekly_income', 80);
            $table->json('problems');
            $table->string('problems_other', 160)->nullable();
            $table->text('worst_experience');

            // Attentes
            $table->string('expected_payment_model', 80);
            $table->string('expected_weekly_income', 80);
            $table->string('mobile_money_trust', 80);
            $table->unsignedTinyInteger('interest_level');
            $table->string('launch_availability', 80);

            // Identification
            $table->string('full_name', 160);
            $table->string('email', 160);
            $table->string('whatsapp', 20);

            // Liste d'attente / activation au lancement
            $table->string('status', 30)->default('waitlisted');
            $table->string('ip_address', 45)->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('whatsapp');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('driver_waitlists');
    }
};
