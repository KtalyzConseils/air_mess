<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('device_tokens', function (Blueprint $table) {
            $table->string('manufacturer', 80)->nullable();
            $table->string('model_name', 120)->nullable();
            $table->string('os_version', 40)->nullable();
            $table->string('app_version', 40)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('device_tokens', function (Blueprint $table) {
            $table->dropColumn(['manufacturer', 'model_name', 'os_version', 'app_version']);
        });
    }
};
