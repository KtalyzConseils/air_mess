<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Traçage de l'acceptation des CGU + politique de confidentialité.
 *
 * Deux colonnes nullable :
 *   - accepted_terms_at      : timestamp de la dernière acceptation
 *   - accepted_terms_version : version des CGU acceptée (entier incrémenté à chaque évolution majeure)
 *
 * Les 2 colonnes NULL sur un user = jamais accepté → modale bloquante à l'ouverture de l'app.
 * `accepted_terms_version < TERMS_VERSION` (constante côté back) = accepté une ancienne version → même modale.
 *
 * Cas des utilisateurs existants : aucun backfill. Ils voient la modale à leur
 * prochaine connexion et donnent leur consentement daté et versionné.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('accepted_terms_at')->nullable()->after('last_login_at');
            $table->unsignedSmallInteger('accepted_terms_version')->nullable()->after('accepted_terms_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['accepted_terms_at', 'accepted_terms_version']);
        });
    }
};
