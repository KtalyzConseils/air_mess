<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Null pour les comptes créés via l'inscription rapide (mot de passe
            // aléatoire, inconnu de l'utilisateur) — rempli dès qu'il choisit lui-même
            // un mot de passe (inscription classique, reset, ou activation de l'accès web).
            $table->timestamp('password_set_at')->nullable()->after('password');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('password_set_at');
        });
    }
};
