<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('merchant_waitlists', function (Blueprint $table) {
            $table->id();

            // Section A — Qui répond
            $table->string('commerce_type', 80);
            $table->string('commerce_type_other', 160)->nullable();
            $table->string('nda_partner', 80);
            $table->string('zone', 80);
            $table->string('zone_other', 160)->nullable();
            $table->string('weekly_orders', 40);
            $table->string('source', 80)->nullable();
            $table->string('source_other', 160)->nullable();

            // Section B — Comment ça se passe aujourd'hui
            $table->json('delivery_methods');
            $table->string('delivery_methods_other', 160)->nullable();
            $table->json('problems');
            $table->string('problems_other', 160)->nullable();
            $table->text('worst_experience');
            $table->string('cash_collection_issue', 160);
            $table->string('time_lost_weekly', 40);
            $table->string('orders_lost_weekly', 40);

            // Section C — Ce qui changerait la donne
            $table->text('expected_benefit');
            $table->string('commission_acceptance', 80);
            $table->string('reasonable_fee', 40);
            $table->string('mobile_money_trust', 80);
            $table->unsignedTinyInteger('interest_level');
            $table->string('trial_interest', 80);

            // Section D — Recontact facultatif
            $table->string('shop_name', 160)->nullable();
            $table->string('contact_name', 160)->nullable();
            $table->string('whatsapp', 20)->nullable();

            // Liste d'attente / bonus de lancement
            $table->string('status', 30)->default('waitlisted');
            $table->unsignedInteger('bonus_amount')->default(500);
            $table->string('bonus_code', 32)->unique();
            $table->timestamp('bonus_redeemed_at')->nullable();

            $table->string('ip_address', 45)->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('whatsapp');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('merchant_waitlists');
    }
};
