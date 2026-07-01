<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Étend `subscription_plans` pour distinguer les plans API des plans classiques.
 *
 *   - `api_requests_monthly`  : nb de requêtes / mois autorisées à l'API dev.
 *     Nullable → si NULL, le plan n'est PAS un plan API.
 *     0 → illimité (comme `included_courses` pour les plans classiques).
 *
 *   - `is_api_plan`           : drapeau pour lister facilement les plans API
 *     depuis l'endpoint `/api/api-plans` sans devoir inférer depuis le nom.
 *
 * On ne crée pas une table à part parce que la structure d'un plan (prix,
 * features, description, sort_order) est identique entre plans classiques et
 * plans API — seul le "quota mesuré" change.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subscription_plans', function (Blueprint $table) {
            $table->unsignedInteger('api_requests_monthly')->nullable()->after('included_courses');
            $table->boolean('is_api_plan')->default(false)->after('is_active');

            $table->index('is_api_plan');
        });
    }

    public function down(): void
    {
        Schema::table('subscription_plans', function (Blueprint $table) {
            $table->dropIndex(['is_api_plan']);
            $table->dropColumn(['api_requests_monthly', 'is_api_plan']);
        });
    }
};
