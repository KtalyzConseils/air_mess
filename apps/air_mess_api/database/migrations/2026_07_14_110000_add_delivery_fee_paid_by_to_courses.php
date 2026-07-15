<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Mode "aux frais du destinataire" — le frais de livraison est payé par le client
 * au moment de la remise, pas par le marchand à la création.
 *
 * Deux valeurs :
 *   - 'sender'    (défaut, comportement actuel) : marchand débité via son wallet
 *     à la création, driver collecte uniquement le collection_amount chez le
 *     destinataire.
 *   - 'recipient' : marchand ne paie rien à la création ; driver collecte
 *     collection_amount + delivery_fee chez le destinataire ; delivery_fee
 *     revient à Air Mess comme revenu direct.
 *
 * Réservé aux drivers Airmess (cf. étape 4 — le filtre est ajouté dans un
 * commit séparé pour rester lisible).
 *
 * VARCHAR + CHECK plutôt qu'ENUM natif Postgres : cohérence avec drivers.kind
 * et user_wallet_transactions.type, ajout de valeurs futures facile.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->string('delivery_fee_paid_by', 20)
                ->default('sender')
                ->after('collection_method');
            $table->index('delivery_fee_paid_by', 'courses_delivery_fee_paid_by_idx');
        });

        DB::statement(<<<'SQL'
            ALTER TABLE courses
            ADD CONSTRAINT courses_delivery_fee_paid_by_check
            CHECK (delivery_fee_paid_by IN ('sender', 'recipient'))
        SQL);
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_delivery_fee_paid_by_check');
        Schema::table('courses', function (Blueprint $table) {
            $table->dropIndex('courses_delivery_fee_paid_by_idx');
            $table->dropColumn('delivery_fee_paid_by');
        });
    }
};
