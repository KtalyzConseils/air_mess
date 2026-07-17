<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * La couleur du véhicule devient la marque (Bajaj, TVS, Toyota…) — plus
     * utile pour identifier le véhicule d'un livreur. Saisie libre côté
     * formulaire (liste de suggestions + autre), d'où l'élargissement à 50.
     * Les anciennes valeurs "couleur" restent telles quelles (données de dev).
     */
    public function up(): void
    {
        Schema::table('drivers', function (Blueprint $table) {
            $table->renameColumn('vehicle_color', 'vehicle_brand');
        });
        Schema::table('drivers', function (Blueprint $table) {
            $table->string('vehicle_brand', 50)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('drivers', function (Blueprint $table) {
            $table->string('vehicle_brand', 30)->nullable()->change();
        });
        Schema::table('drivers', function (Blueprint $table) {
            $table->renameColumn('vehicle_brand', 'vehicle_color');
        });
    }
};
