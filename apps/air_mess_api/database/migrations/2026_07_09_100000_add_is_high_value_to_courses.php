<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Courses "high value" — protection Pierre & Air Mess.
 *
 * Une course est marquée high_value quand
 * MAX(collection_amount, package_declared_value) >= high_value_threshold_fcfa
 * (setting, défaut 30 000 FCFA).
 *
 * Effet :
 *   - la course n'est PAS pushée aux livreurs (elle sort du pool de matching)
 *   - les 4 rôles admin (super/ops/commercial/support) sont notifiés
 *   - l'ops la prend en charge manuellement (livreur premium dédié, escorte…)
 *
 * Sans ce filtre, un étudiant avec 3k de caution ne peut jamais accepter les
 * grosses courses, et Air Mess porte un risque financier > caution en cas de
 * fraude/perte.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->boolean('is_high_value')->default(false)->after('fraud_shortfall_fcfa');
            // Index composite : sert au filtrage matching (WHERE is_high_value = false AND status IN (...))
            $table->index(['is_high_value', 'status'], 'courses_high_value_status_idx');
        });
    }

    public function down(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->dropIndex('courses_high_value_status_idx');
            $table->dropColumn('is_high_value');
        });
    }
};
