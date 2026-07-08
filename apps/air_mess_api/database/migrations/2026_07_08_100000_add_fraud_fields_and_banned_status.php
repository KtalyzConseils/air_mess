<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Cas 7 — Vol livreur.
 *
 * Deux extensions schéma :
 *
 * 1) `courses.is_fraud` (bool) + `courses.fraud_shortfall_fcfa` (int nullable) :
 *    marque une course frauduleuse et enregistre le manque à combler après
 *    saisie de caution (montant dû au marchand qui n'a PAS pu être couvert
 *    par la caution driver). Permet à l'ops de suivre l'exposition financière
 *    résiduelle et à la compta d'identifier les pertes sèches.
 *
 * 2) Ajout du statut `'banned'` à drivers.activation_status : plus fort que
 *    `suspended` (temporaire, dette caution) — c'est un bannissement définitif
 *    pour fraude. Un driver banni ne peut plus jamais accepter de courses.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->boolean('is_fraud')->default(false)->after('transfer_lng');
            $table->unsignedInteger('fraud_shortfall_fcfa')->nullable()->after('is_fraud');
            $table->index('is_fraud');
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE drivers DROP CONSTRAINT IF EXISTS drivers_activation_status_check');
            DB::statement("
                ALTER TABLE drivers
                ADD CONSTRAINT drivers_activation_status_check
                CHECK (activation_status IN ('pending', 'validated', 'active', 'suspended', 'banned'))
            ");
        }
    }

    public function down(): void
    {
        // Repli des drivers bannis avant de retirer le statut.
        DB::table('drivers')->where('activation_status', 'banned')
            ->update(['activation_status' => 'suspended']);

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE drivers DROP CONSTRAINT IF EXISTS drivers_activation_status_check');
            DB::statement("
                ALTER TABLE drivers
                ADD CONSTRAINT drivers_activation_status_check
                CHECK (activation_status IN ('pending', 'validated', 'active', 'suspended'))
            ");
        }

        Schema::table('courses', function (Blueprint $table) {
            $table->dropIndex(['is_fraud']);
            $table->dropColumn(['is_fraud', 'fraud_shortfall_fcfa']);
        });
    }
};
