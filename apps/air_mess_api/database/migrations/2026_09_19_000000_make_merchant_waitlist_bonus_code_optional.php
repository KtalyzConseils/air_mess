<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('merchant_waitlists', function (Blueprint $table) {
            $table->string('bonus_code', 32)->nullable()->change();
        });
    }

    public function down(): void
    {
        // Les anciennes valeurs sont conservées. Un rollback n'est sûr que si
        // aucune candidature sans code n'a été créée depuis cette migration.
        Schema::table('merchant_waitlists', function (Blueprint $table) {
            $table->string('bonus_code', 32)->nullable(false)->change();
        });
    }
};
