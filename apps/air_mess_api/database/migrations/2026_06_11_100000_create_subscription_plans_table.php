<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscription_plans', function (Blueprint $table) {
            $table->id();
            $table->string('code', 30)->unique();          // 'trial', 'starter', 'pro', 'business'
            $table->string('name');                          // 'Starter'
            $table->unsignedInteger('monthly_price_fcfa');   // 0 pour le trial
            $table->unsignedInteger('included_courses');     // 0 = illimité
            $table->text('description')->nullable();
            $table->json('features')->nullable();            // ["api_access", "priority_support", ...]
            $table->boolean('is_active')->default(true);     // permet de retirer un plan sans le détruire
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['is_active', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscription_plans');
    }
};
