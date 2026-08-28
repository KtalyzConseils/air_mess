<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->string('origin_phone_secondary', 20)->nullable()->after('origin_phone');
            $table->string('destination_phone_secondary', 20)->nullable()->after('destination_phone');
            $table->string('package_description', 255)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->dropColumn(['origin_phone_secondary', 'destination_phone_secondary']);
            $table->string('package_description', 255)->nullable(false)->change();
        });
    }
};
