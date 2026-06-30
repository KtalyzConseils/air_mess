<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Champs nécessaires à la création de course depuis un site externe (Gbandjo
 * via Systige). Une course « intégration » arrive avec l'origine (le vendeur)
 * mais une destination parfois incomplète (pas de GPS, voire pas d'adresse
 * exacte au moment de la commande). On rend donc la destination nullable et on
 * ajoute :
 *   - source / external_reference  : traçabilité + idempotence (anti-doublon).
 *   - statut `awaiting_geo`        : course créée mais en attente des
 *                                    coordonnées du retrait pour le push livreurs.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            // Provenance + clé d'idempotence (n° de commande du site externe).
            $table->string('source', 30)->nullable()->after('reference');
            $table->string('external_reference', 100)->nullable()->after('source');

            // La destination peut être incomplète à la création (collectée ensuite).
            $table->string('destination_name', 150)->nullable()->change();
            $table->string('destination_quartier', 100)->nullable()->change();
            $table->string('destination_city', 100)->nullable()->change();
            $table->decimal('destination_lat', 10, 7)->nullable()->change();
            $table->decimal('destination_lng', 10, 7)->nullable()->change();

            // L'origine (vendeur) peut arriver sans GPS → course en `awaiting_geo`
            // le temps qu'un admin pose le pin. Le reste de l'origine reste requis.
            $table->decimal('origin_lat', 10, 7)->nullable()->change();
            $table->decimal('origin_lng', 10, 7)->nullable()->change();

            // Idempotence : une même commande externe ne crée qu'une seule course.
            // (Postgres autorise plusieurs NULL → les courses internes ne gênent pas.)
            $table->unique(['sender_id', 'external_reference'], 'courses_sender_external_unique');
        });

        // Nouveau statut `awaiting_geo` (course en attente des coordonnées de retrait).
        // L'enum Laravel est une contrainte CHECK côté Postgres : on la recrée.
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_status_check');
            DB::statement("
                ALTER TABLE courses
                ADD CONSTRAINT courses_status_check
                CHECK (status IN (
                    'pending_preparation', 'awaiting_assignment', 'awaiting_geo',
                    'assigned', 'driver_to_pickup', 'at_pickup',
                    'picked_up', 'at_dropoff', 'delivered',
                    'cancelled', 'failed', 'disputed'
                ))
            ");
        }
    }

    public function down(): void
    {
        // Repli des courses bloquées en géo avant de retirer le statut.
        DB::table('courses')->where('status', 'awaiting_geo')
            ->update(['status' => 'awaiting_assignment']);

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_status_check');
            DB::statement("
                ALTER TABLE courses
                ADD CONSTRAINT courses_status_check
                CHECK (status IN (
                    'pending_preparation', 'awaiting_assignment',
                    'assigned', 'driver_to_pickup', 'at_pickup',
                    'picked_up', 'at_dropoff', 'delivered',
                    'cancelled', 'failed', 'disputed'
                ))
            ");
        }

        Schema::table('courses', function (Blueprint $table) {
            $table->dropUnique('courses_sender_external_unique');
            $table->dropColumn(['source', 'external_reference']);
        });
    }
};
