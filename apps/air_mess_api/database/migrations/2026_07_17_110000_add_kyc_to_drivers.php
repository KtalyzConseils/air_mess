<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * KYC (Know Your Customer) — vérification d'identité par un tiers.
 *
 * Séparé volontairement de `activation_status` : l'activation est une décision
 * d'admin sur les documents fournis (visuelle), le KYC est une preuve
 * indépendante (service tiers OU validation admin manuelle par recoupement
 * avec une source officielle). Un driver peut être `active` + `unverified`
 * (peut travailler mais limité), ou `active` + `verified` (accès étendu :
 * plafonds retrait plus larges, éligible passage Airmess, etc.).
 *
 * `provider` reste text libre pour permettre plusieurs providers dans le
 * temps (`manual`, `smile_identity`, `youverify`) sans nouvelle migration.
 * `reference` stocke l'ID externe du provider pour la trace + le re-check.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('drivers', function (Blueprint $table) {
            $table->string('kyc_status', 20)->default('unverified')->after('kind');
            $table->timestamp('kyc_verified_at')->nullable()->after('kyc_status');
            $table->string('kyc_provider', 40)->nullable()->after('kyc_verified_at');
            $table->string('kyc_reference', 191)->nullable()->after('kyc_provider');
            $table->text('kyc_notes')->nullable()->after('kyc_reference');
            $table->index('kyc_status', 'drivers_kyc_status_idx');
        });

        // CHECK contraint pour brider les valeurs autorisées (équivalent enum Postgres).
        // Les seeds existants deviennent tous 'unverified' via le default, conforme au CHECK.
        DB::statement(<<<SQL
            ALTER TABLE drivers
            ADD CONSTRAINT drivers_kyc_status_check
            CHECK (kyc_status IN ('unverified', 'verified', 'rejected'))
        SQL);
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE drivers DROP CONSTRAINT IF EXISTS drivers_kyc_status_check');
        Schema::table('drivers', function (Blueprint $table) {
            $table->dropIndex('drivers_kyc_status_idx');
            $table->dropColumn(['kyc_status', 'kyc_verified_at', 'kyc_provider', 'kyc_reference', 'kyc_notes']);
        });
    }
};
