<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Wallet unifié pour les utilisateurs payeurs (marchands + particuliers).
 *
 * Modèle de réservation :
 *  - `balance`           = cash réellement dans le wallet
 *  - `pending_reserved`  = somme des courses créées non encore livrées (hold)
 *  - disponible effectif = balance - pending_reserved
 *
 * À la création d'une course on incrémente pending_reserved (si capacité OK).
 * À la livraison on débite balance ET on décrémente pending_reserved.
 * Si la course est annulée/échouée → on décrémente juste pending_reserved (release).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_wallets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')
                ->unique()
                ->constrained()
                ->cascadeOnDelete();
            $table->unsignedInteger('balance')->default(0);             // cash réel disponible
            $table->unsignedInteger('pending_reserved')->default(0);    // hold sur courses non encore livrées
            $table->unsignedInteger('total_deposited')->default(0);     // cumul dépôts (audit)
            $table->unsignedInteger('total_spent')->default(0);         // cumul débits courses (audit)
            $table->timestamps();
        });

        // Defense in depth : balance et pending_reserved >= 0, et hold <= balance.
        DB::statement('ALTER TABLE user_wallets ADD CONSTRAINT user_wallets_balance_non_negative CHECK (balance >= 0)');
        DB::statement('ALTER TABLE user_wallets ADD CONSTRAINT user_wallets_pending_non_negative CHECK (pending_reserved >= 0)');
        DB::statement('ALTER TABLE user_wallets ADD CONSTRAINT user_wallets_pending_le_balance CHECK (pending_reserved <= balance)');

        // Backfill : un wallet vide pour chaque utilisateur payeur déjà inscrit
        // (marchands + particuliers). Les drivers et admins n'en ont pas besoin.
        DB::statement(<<<'SQL'
            INSERT INTO user_wallets (user_id, balance, pending_reserved, total_deposited, total_spent, created_at, updated_at)
            SELECT id, 0, 0, 0, 0, NOW(), NOW()
            FROM users
            WHERE type IN ('marchant', 'individual')
              AND NOT EXISTS (
                  SELECT 1 FROM user_wallets WHERE user_wallets.user_id = users.id
              )
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('user_wallets');
    }
};
