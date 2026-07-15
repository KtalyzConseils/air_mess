<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Type de pièce d'identité + verso.
     *
     * cni_type : cnib (Carte Nationale d'Identité Biométrique, recto + verso)
     *          | cip (Certificat d'Identification Personnelle, 1 face)
     *          | passeport (page photo uniquement)
     * cni_back_url : verso — requis à l'inscription uniquement pour une CNIB
     * (portée par la validation registerDriver, colonnes nullable pour l'existant).
     */
    public function up(): void
    {
        Schema::table('drivers', function (Blueprint $table) {
            $table->string('cni_type', 12)->nullable()->after('cni_url');
            $table->string('cni_back_url')->nullable()->after('cni_type');
        });
    }

    public function down(): void
    {
        Schema::table('drivers', function (Blueprint $table) {
            $table->dropColumn(['cni_type', 'cni_back_url']);
        });
    }
};
