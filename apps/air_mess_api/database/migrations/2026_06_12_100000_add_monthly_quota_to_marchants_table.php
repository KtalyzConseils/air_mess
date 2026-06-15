<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('marchants', function (Blueprint $table) {
            $table->unsignedInteger('monthly_courses_used')->default(0)->after('subscription_next_billing_at');
            $table->date('monthly_period_started_at')->nullable()->after('monthly_courses_used');
        });
    }

    public function down(): void
    {
        Schema::table('marchants', function (Blueprint $table) {
            $table->dropColumn(['monthly_courses_used', 'monthly_period_started_at']);
        });
    }
};
