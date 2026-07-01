<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tag l'`api_application_id` sur les courses créées via l'API dev.
 *
 * Reste nullable : les courses internes (créées depuis l'app marchand ou
 * particulier) n'ont pas d'app_id. Sert au reporting (« courses créées par
 * l'app Systige ce mois ») et à l'attribution du quota.
 *
 * `sender_id` reste la source de vérité pour le WALLET à débiter : c'est le
 * user propriétaire de l'app qui paie (choix produit acté 2026-07-01).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->foreignId('api_application_id')
                ->nullable()
                ->after('source')
                ->constrained('api_applications')
                ->nullOnDelete();

            $table->index('api_application_id');
        });
    }

    public function down(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->dropForeign(['api_application_id']);
            $table->dropIndex(['api_application_id']);
            $table->dropColumn('api_application_id');
        });
    }
};
