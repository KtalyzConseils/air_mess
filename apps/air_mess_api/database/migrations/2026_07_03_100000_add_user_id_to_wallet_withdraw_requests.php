<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Rend `wallet_withdraw_requests` polymorphe : une demande peut être portée
 * SOIT par un driver (retrait de caution) SOIT par un user marchand/particulier
 * (retrait des collections encaissées + rechargements non-consommés).
 *
 * Choix d'archi : on garde UNE table + une CHECK "XOR" pour la simplicité
 * du panneau admin unifié et des plafonds. Alternative rejetée : deux tables
 * séparées, qui aurait dédoublé l'UI ops et la logique payout Fedapay.
 *
 * NB : le paramètre `target_method` accepte désormais aussi `wave` (à ajouter
 * si besoin plus tard) — pour l'instant on garde momo|bank comme le driver.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('wallet_withdraw_requests', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->after('id')->constrained()->cascadeOnDelete();
            $table->index(['user_id', 'status']);
        });

        // Rend driver_id nullable pour permettre les demandes user-only.
        DB::statement('ALTER TABLE wallet_withdraw_requests ALTER COLUMN driver_id DROP NOT NULL');

        // CHECK XOR : exactement UN de (driver_id, user_id) est renseigné.
        // Une demande sans propriétaire ou avec les deux est incohérente.
        DB::statement(<<<'SQL'
            ALTER TABLE wallet_withdraw_requests
            ADD CONSTRAINT wallet_withdraw_requests_owner_xor_check
            CHECK (
                (driver_id IS NOT NULL AND user_id IS NULL)
                OR
                (driver_id IS NULL AND user_id IS NOT NULL)
            )
        SQL);
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE wallet_withdraw_requests DROP CONSTRAINT IF EXISTS wallet_withdraw_requests_owner_xor_check');

        Schema::table('wallet_withdraw_requests', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'status']);
            $table->dropConstrainedForeignId('user_id');
        });

        // Attention : ne peut être re-appliqué que si toutes les lignes ont un driver_id.
        // On log un warning implicite via le rollback plutôt qu'échouer bruyamment.
        DB::statement('ALTER TABLE wallet_withdraw_requests ALTER COLUMN driver_id SET NOT NULL');
    }
};
