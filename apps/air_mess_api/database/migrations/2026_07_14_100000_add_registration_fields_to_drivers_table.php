<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Deuxième contact d'urgence + canal de réponse préféré du candidat livreur.
     *
     * Colonnes nullable : les drivers existants n'ont qu'un seul contact et
     * aucun canal choisi. Le caractère obligatoire du 2e contact est porté
     * par la validation de registerDriver, pas par la DB.
     */
    public function up(): void
    {
        Schema::table('drivers', function (Blueprint $table) {
            $table->string('emergency_contact2_name')->nullable()->after('emergency_contact_phone');
            $table->string('emergency_contact2_phone', 20)->nullable()->after('emergency_contact2_name');
            // email | sms | whatsapp — string + Rule::in côté applicatif (pas d'enum SQL)
            $table->string('preferred_response_channel', 10)->nullable()->after('emergency_contact2_phone');
        });
    }

    public function down(): void
    {
        Schema::table('drivers', function (Blueprint $table) {
            $table->dropColumn([
                'emergency_contact2_name',
                'emergency_contact2_phone',
                'preferred_response_channel',
            ]);
        });
    }
};
