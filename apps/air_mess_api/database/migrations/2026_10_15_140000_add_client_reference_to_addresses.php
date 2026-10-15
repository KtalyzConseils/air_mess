<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Cle d'idempotence du carnet d'adresses.
     *
     * Le formulaire de l'app envoie une reference qu'il garde tant qu'il n'a pas
     * eu de reponse : rejouer la meme requete (double tap, retry apres un timeout
     * reseau) ne cree qu'une adresse. Le couple (user_id, client_reference) est
     * unique -- la base reste le filet de securite ultime, comme pour les wallets.
     *
     * Reste nullable : les clients qui n'envoient pas de reference (web) et les
     * doublons volontaires d'une meme adresse continuent de fonctionner.
     */
    public function up(): void
    {
        Schema::table('addresses', function (Blueprint $table) {
            $table->string('client_reference', 64)->nullable()->after('user_id');
            $table->unique(['user_id', 'client_reference']);
        });
    }

    public function down(): void
    {
        Schema::table('addresses', function (Blueprint $table) {
            $table->dropUnique(['user_id', 'client_reference']);
            $table->dropColumn('client_reference');
        });
    }
};
