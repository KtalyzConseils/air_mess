<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Trace les refus explicites de courses par les drivers (offer → "Je refuse").
 *
 * Sert à :
 *  - Calculer le taux d'acceptation (acceptance_rate sur Driver, rolling 30j)
 *  - Insights admin (raisons fréquentes, drivers qui refusent trop)
 *  - Exclure les courses déjà refusées du flux /offered-courses pour ce driver
 *
 * UNIQUE (driver_id, course_id) : un driver ne peut pas refuser deux fois la même
 * course. Le 2e essai retourne la 1re entrée (idempotence applicative + filet BDD).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('course_decline_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('driver_id')->constrained()->cascadeOnDelete();
            $table->foreignId('course_id')->constrained()->cascadeOnDelete();

            // Raison parmi enum applicatif (CHECK ci-dessous)
            $table->string('reason', 30);

            // Texte libre uniquement quand reason = 'other'
            $table->text('custom_reason')->nullable();

            // Immuable
            $table->timestamp('created_at')->useCurrent();

            $table->unique(['driver_id', 'course_id']);
            $table->index(['driver_id', 'created_at']); // pour le rolling 30j
            $table->index('reason'); // pour les stats admin
        });

        // CHECK Postgres : enum de raisons connues
        DB::statement(<<<'SQL'
            ALTER TABLE course_decline_records
            ADD CONSTRAINT course_decline_records_reason_check
            CHECK (reason IN ('too_far', 'wrong_quartier', 'no_helmet', 'vehicle_unfit', 'personal', 'other'))
        SQL);

        // CHECK Postgres : custom_reason rempli SEULEMENT si reason='other'
        DB::statement(<<<'SQL'
            ALTER TABLE course_decline_records
            ADD CONSTRAINT course_decline_records_custom_consistency_check
            CHECK (
                (reason = 'other' AND custom_reason IS NOT NULL AND length(trim(custom_reason)) > 0)
                OR
                (reason != 'other' AND custom_reason IS NULL)
            )
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('course_decline_records');
    }
};
