<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Colonne `paid_until` sur `api_applications` — date d'expiration du plan.
 *
 *   NULL  → plan gratuit ou app admin-créée : jamais d'expiration
 *   Date  → suspend l'app quand la date est dépassée (cron quotidien)
 *
 * Chaque activation/renouvellement via Fedapay pousse cette date de +30 jours
 * par rapport à la valeur courante (ou par rapport à `now()` si expirée).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('api_applications', function (Blueprint $table) {
            $table->timestamp('paid_until')->nullable()->after('quota_period_started_at');
            $table->index('paid_until');
        });
    }

    public function down(): void
    {
        Schema::table('api_applications', function (Blueprint $table) {
            $table->dropIndex(['paid_until']);
            $table->dropColumn('paid_until');
        });
    }
};
