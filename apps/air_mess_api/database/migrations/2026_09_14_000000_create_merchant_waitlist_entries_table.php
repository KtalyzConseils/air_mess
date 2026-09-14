<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('merchant_waitlist_entries', function (Blueprint $table) {
            $table->id();

            $table->string('commerce_type');
            $table->string('commerce_type_other')->nullable();
            $table->string('nda_partner');
            $table->string('zone');
            $table->string('zone_other')->nullable();
            $table->string('weekly_orders');
            $table->string('source')->nullable();
            $table->string('source_other')->nullable();

            $table->jsonb('delivery_methods')->default('[]');
            $table->string('delivery_methods_other')->nullable();
            $table->jsonb('problems')->default('[]');
            $table->string('problems_other')->nullable();

            $table->text('worst_experience');
            $table->string('cash_collection_issue');
            $table->string('time_lost_weekly');
            $table->string('orders_lost_weekly');
            $table->text('expected_benefit');
            $table->string('commission_acceptance');
            $table->string('reasonable_fee');
            $table->string('mobile_money_trust');

            $table->unsignedTinyInteger('interest_level')->default(0);
            $table->string('trial_interest');

            $table->string('shop_name')->nullable();
            $table->string('contact_name')->nullable();
            $table->string('whatsapp', 20)->nullable();

            $table->string('status')->default('pending');
            $table->unsignedInteger('bonus_amount')->default(500);
            $table->string('bonus_code')->unique();

            $table->timestamps();

            $table->index('status');
            $table->index('whatsapp');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('merchant_waitlist_entries');
    }
};
