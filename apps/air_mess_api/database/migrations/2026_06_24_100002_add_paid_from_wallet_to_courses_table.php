<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Marque les courses qui doivent être chargées depuis le wallet de l'utilisateur
 * à la livraison, plutôt que via paiement Fedapay direct (pay-as-you-go).
 *
 *  - true  : à la création, on a réservé le delivery_fee (pending_reserved++).
 *            À la livraison, on débite le wallet et on relâche la réservation.
 *            Si annulation/échec, on libère la réservation sans débit.
 *  - false : flow Fedapay existant inchangé (paiement direct par l'expéditeur).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->boolean('paid_from_wallet')->default(false)->after('delivery_fee');
        });
    }

    public function down(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->dropColumn('paid_from_wallet');
        });
    }
};
