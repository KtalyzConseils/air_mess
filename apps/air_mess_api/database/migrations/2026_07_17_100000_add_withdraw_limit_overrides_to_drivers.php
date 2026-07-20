<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Plafonds retrait per-driver — override optionnel des plafonds globaux
 * définis dans AppSetting (driver_withdraw_max_per_day_count / _week_count /
 * _day_fcfa / _week_fcfa).
 *
 * Chaque colonne est NULLABLE : NULL = utilise la valeur globale (comportement
 * inchangé pour tous les drivers existants). Une valeur explicite écrase le
 * plafond global pour ce driver uniquement.
 *
 * Cas d'usage : promouvoir un driver "de confiance" (haut volume, ancien) sans
 * changer les plafonds pour tout le monde. L'admin l'ajuste depuis la page
 * détail du driver ; l'action est tracée via SupportNote.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('drivers', function (Blueprint $table) {
            $table->unsignedInteger('withdraw_max_per_day_count_override')->nullable();
            $table->unsignedInteger('withdraw_max_per_week_count_override')->nullable();
            $table->unsignedInteger('withdraw_max_per_day_fcfa_override')->nullable();
            $table->unsignedInteger('withdraw_max_per_week_fcfa_override')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('drivers', function (Blueprint $table) {
            $table->dropColumn([
                'withdraw_max_per_day_count_override',
                'withdraw_max_per_week_count_override',
                'withdraw_max_per_day_fcfa_override',
                'withdraw_max_per_week_fcfa_override',
            ]);
        });
    }
};
