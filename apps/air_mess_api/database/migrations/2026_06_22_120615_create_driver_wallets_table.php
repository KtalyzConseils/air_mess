<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('driver_wallets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('driver_id')
                ->unique()
                ->constrained()
                ->cascadeOnDelete();
            $table->unsignedInteger('balance')->default(0);             // caution actuelle (FCFA)
            $table->unsignedInteger('total_deposited')->default(0);     // cumul dépôts pour audit
            $table->unsignedInteger('total_withdrawn')->default(0);     // cumul retraits pour audit
            $table->timestamps();
        });

        // Filet de sécurité au niveau BDD : balance ne peut JAMAIS être négative.
        // Si un bug futur tente un UPDATE qui passerait en négatif, Postgres rejette.
        DB::statement('ALTER TABLE driver_wallets ADD CONSTRAINT driver_wallets_balance_non_negative CHECK (balance >= 0)');

        // Backfill : crée un wallet (balance=0) pour chaque driver déjà inscrit.
        // INSERT ... SELECT évite de charger les drivers en PHP — tout se fait en SQL.
        DB::statement(<<<'SQL'
            INSERT INTO driver_wallets (driver_id, balance, total_deposited, total_withdrawn, created_at, updated_at)
            SELECT id, 0, 0, 0, NOW(), NOW()
            FROM drivers
            WHERE NOT EXISTS (
                SELECT 1 FROM driver_wallets WHERE driver_wallets.driver_id = drivers.id
            )
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('driver_wallets');
    }
};
