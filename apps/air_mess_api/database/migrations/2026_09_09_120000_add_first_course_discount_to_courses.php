<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->unsignedInteger('original_delivery_fee')->nullable()->after('delivery_fee');
            $table->unsignedInteger('discount_amount')->default(0)->after('original_delivery_fee');
            $table->string('discount_code', 50)->nullable()->after('discount_amount');
        });
    }

    public function down(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->dropColumn(['original_delivery_fee', 'discount_amount', 'discount_code']);
        });
    }
};
