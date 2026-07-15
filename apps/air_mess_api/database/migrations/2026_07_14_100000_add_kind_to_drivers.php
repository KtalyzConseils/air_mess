<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Distinction "livreur freelance" vs "livreur salarié Air Mess".
 *
 * - `independent` (défaut) : le livreur classique, actuel comportement
 *      - dépose une caution, prend 75% de commission, ne prend que les courses
 *        sender-paid, respect du filtre `is_high_value`.
 *
 * - `airmess` : livreur employé par Air Mess
 *      - bypass caution (Air Mess porte le risque)
 *      - seul autorisé à prendre les courses "aux frais du destinataire"
 *        et les courses `is_high_value` (>30k FCFA)
 *      - rémunération salaire+prime (géré hors app pour l'instant, le pipeline
 *        wallet reste identique jusqu'à décision explicite)
 *
 * Le passage independent → airmess est manuel via /admin/drivers/:id.
 * Zéro backfill : tous les drivers existants restent `independent`.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('drivers', function (Blueprint $table) {
            // On utilise VARCHAR + CHECK plutôt qu'ENUM Postgres natif :
            // ajouter une nouvelle valeur plus tard (ex. `partner`, `franchise`) se fait
            // en 2 statements SQL sans rebuild du type. Pattern déjà utilisé pour
            // user_wallet_transactions.type dans le projet.
            $table->string('kind', 20)->default('independent')->after('activation_status');
            $table->index('kind');
        });

        DB::statement(<<<'SQL'
            ALTER TABLE drivers
            ADD CONSTRAINT drivers_kind_check
            CHECK (kind IN ('independent', 'airmess'))
        SQL);
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE drivers DROP CONSTRAINT IF EXISTS drivers_kind_check');
        Schema::table('drivers', function (Blueprint $table) {
            $table->dropIndex(['kind']);
            $table->dropColumn('kind');
        });
    }
};
