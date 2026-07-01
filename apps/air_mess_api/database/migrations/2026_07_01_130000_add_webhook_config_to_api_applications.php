<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Configuration webhook d'une ApiApplication.
 *
 *   webhook_url    : endpoint HTTPS externe où l'on POSTe les events.
 *                    Null = webhooks désactivés pour cette app.
 *   webhook_secret : secret partagé pour signer chaque payload (HMAC-SHA256).
 *                    Envoyé une seule fois à la création/regen, jamais réaffiché.
 *
 * L'app peut activer/désactiver ses webhooks à tout moment sans perdre son
 * historique (les livraisons passées restent en base).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('api_applications', function (Blueprint $table) {
            $table->string('webhook_url', 500)->nullable()->after('description');
            $table->string('webhook_secret', 80)->nullable()->after('webhook_url');
        });
    }

    public function down(): void
    {
        Schema::table('api_applications', function (Blueprint $table) {
            $table->dropColumn(['webhook_url', 'webhook_secret']);
        });
    }
};
