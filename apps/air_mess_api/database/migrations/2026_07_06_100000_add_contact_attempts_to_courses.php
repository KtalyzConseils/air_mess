<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Cas 3 — Client injoignable.
 *
 * On garde deux champs sur la course :
 *  - contact_attempts        : nombre de tentatives d'appel du destinataire
 *  - last_contact_attempt_at : horodatage de la dernière tentative
 *
 * Sert de garde-fou anti-fraude côté signalement `recipient_unreachable` :
 * le driver ne peut signaler qu'à partir de 2 tentatives (règle métier
 * appliquée dans DriverController::reportIncident, valeur elle-même
 * paramétrable ultérieurement si besoin).
 *
 * L'incrément se fait via un endpoint dédié POST /driver/courses/{id}/call-attempt
 * (appelé automatiquement au tap "Appeler" côté app driver), et un PATCH
 * permet une correction manuelle si le driver a appelé depuis son tel perso.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->unsignedSmallInteger('contact_attempts')->default(0)->after('destination_instructions');
            $table->timestamp('last_contact_attempt_at')->nullable()->after('contact_attempts');
        });
    }

    public function down(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->dropColumn(['contact_attempts', 'last_contact_attempt_at']);
        });
    }
};
