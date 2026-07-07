<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Cas 5 — Panne / accident livreur avec transfert physique du colis.
 *
 * Quand une course déjà `picked_up` doit être réassignée (le driver initial
 * abandonne suite à panne/accident), le nouveau driver doit venir chercher
 * le colis auprès du driver précédent, pas au marchand.
 *
 * Champs ajoutés :
 *  - previous_driver_id : trace du driver initial (retiré du champ driver_id
 *                         qui pointe désormais sur le nouveau driver)
 *  - pickup_from_previous_driver : flag lu par la driver-app pour rediriger
 *                                  la nav vers les coords de transfert
 *  - transfer_lat / transfer_lng : coords GPS figées du driver initial au
 *                                  moment de la réassignation (le nouveau
 *                                  driver ne dépend pas d'un tracking live)
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->foreignId('previous_driver_id')->nullable()->after('driver_id')->constrained('drivers')->nullOnDelete();
            $table->boolean('pickup_from_previous_driver')->default(false)->after('previous_driver_id');
            $table->double('transfer_lat')->nullable()->after('pickup_from_previous_driver');
            $table->double('transfer_lng')->nullable()->after('transfer_lat');
        });
    }

    public function down(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->dropForeign(['previous_driver_id']);
            $table->dropColumn([
                'previous_driver_id',
                'pickup_from_previous_driver',
                'transfer_lat',
                'transfer_lng',
            ]);
        });
    }
};
