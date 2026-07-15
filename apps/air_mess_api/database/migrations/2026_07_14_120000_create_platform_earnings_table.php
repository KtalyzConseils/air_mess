<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Journal des revenus directs de la plateforme — argent qui n'appartient à
 * aucun wallet driver ou marchand, mais qui est collecté physiquement par un
 * driver Airmess chez un destinataire et revient à Air Mess.
 *
 * Cas d'usage principal : delivery_fee des courses `delivery_fee_paid_by = recipient`.
 * Le driver Airmess pocket le cash chez le destinataire ; cette table trace
 * combien Air Mess a "en droit de récupérer" au bilan (dette du driver → société).
 * Le règlement physique (dépôt au bureau, virement) se fait hors app.
 *
 * Table IMMUABLE : jamais d'UPDATE. Idempotence via UNIQUE partiel (course_id, kind).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('platform_earnings', function (Blueprint $table) {
            $table->id();

            // Type de revenu — extensible. Pour l'instant : 'delivery_fee'.
            $table->string('kind', 40);

            // Course d'origine — presque toujours renseigné pour ce type. Nullable
            // pour anticiper les revenus non liés à une course (ex. commission
            // d'abonnement plus tard).
            $table->foreignId('course_id')->nullable()->constrained()->nullOnDelete();

            $table->unsignedInteger('amount_fcfa');

            // Driver ayant "collecté" physiquement l'argent — utile pour la
            // réconciliation caisse en fin de shift.
            $table->foreignId('driver_id')->nullable()->constrained()->nullOnDelete();

            // Metadata libre (référence source, etc.)
            $table->json('metadata')->nullable();

            $table->timestamp('created_at')->useCurrent();

            $table->index(['kind', 'created_at']);
            $table->index('driver_id');
        });

        // CHECK kind — évite les typos qui casseraient les agrégats.
        DB::statement(<<<'SQL'
            ALTER TABLE platform_earnings
            ADD CONSTRAINT platform_earnings_kind_check
            CHECK (kind IN ('delivery_fee'))
        SQL);

        // Idempotence : une même course ne peut produire qu'un seul revenu de même
        // type (empêche le double-crédit si la transition delivered est rejouée).
        DB::statement(<<<'SQL'
            CREATE UNIQUE INDEX platform_earnings_course_kind_unique
            ON platform_earnings (course_id, kind)
            WHERE course_id IS NOT NULL
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('platform_earnings');
    }
};
