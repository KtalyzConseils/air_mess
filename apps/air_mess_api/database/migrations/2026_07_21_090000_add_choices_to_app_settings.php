<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Ajoute une colonne `choices` (JSON nullable) à `app_settings`.
 *
 * Rend les settings de type énumération éditables via un segmented control
 * plutôt qu'un champ texte libre — l'admin ne peut plus se tromper de valeur.
 *
 * Format attendu : tableau de {value, label, description} — l'UI rend un
 * bouton par entrée avec le label en gras + la description sous forme d'aide.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('app_settings', function (Blueprint $table) {
            $table->json('choices')->nullable()->after('description');
        });
    }

    public function down(): void
    {
        Schema::table('app_settings', function (Blueprint $table) {
            $table->dropColumn('choices');
        });
    }
};
