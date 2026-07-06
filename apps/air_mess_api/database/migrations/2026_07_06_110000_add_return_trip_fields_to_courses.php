<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Cas 4 — Client refuse le colis.
 *
 * Le driver arrive au dropoff et le client refuse. On garde la même course
 * mais on la fait basculer dans une phase "retour marchand" avant clôture :
 *  - `is_return_trip` : flag d'affichage (l'app driver bascule sur un écran retour)
 *  - `return_code`    : code à 6 chiffres généré au signalement du refus,
 *                       envoyé au marchand (push + SMS) et exigé côté driver
 *                       à la remise pour prouver qu'il a bien rendu le colis
 *  - `return_confirmed_at` : horodatage de la remise effective
 *  - statut `returning_to_sender` : inséré entre `at_dropoff` et `failed`
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->boolean('is_return_trip')->default(false)->after('last_contact_attempt_at');
            $table->string('return_code', 6)->nullable()->after('is_return_trip');
            $table->timestamp('return_confirmed_at')->nullable()->after('return_code');
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_status_check');
            DB::statement("
                ALTER TABLE courses
                ADD CONSTRAINT courses_status_check
                CHECK (status IN (
                    'pending_preparation', 'awaiting_assignment', 'awaiting_geo',
                    'assigned', 'driver_to_pickup', 'at_pickup',
                    'picked_up', 'at_dropoff', 'returning_to_sender',
                    'delivered', 'cancelled', 'failed', 'disputed'
                ))
            ");
        }
    }

    public function down(): void
    {
        // Repli des courses bloquées en retour avant de retirer le statut.
        DB::table('courses')->where('status', 'returning_to_sender')
            ->update(['status' => 'at_dropoff']);

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_status_check');
            DB::statement("
                ALTER TABLE courses
                ADD CONSTRAINT courses_status_check
                CHECK (status IN (
                    'pending_preparation', 'awaiting_assignment', 'awaiting_geo',
                    'assigned', 'driver_to_pickup', 'at_pickup',
                    'picked_up', 'at_dropoff', 'delivered',
                    'cancelled', 'failed', 'disputed'
                ))
            ");
        }

        Schema::table('courses', function (Blueprint $table) {
            $table->dropColumn(['is_return_trip', 'return_code', 'return_confirmed_at']);
        });
    }
};
