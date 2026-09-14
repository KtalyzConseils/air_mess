<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('merchant_waitlists', function (Blueprint $table) {
            $table->string('email', 160)->nullable()->after('contact_name');
            $table->dropColumn('nda_partner');
        });
    }

    public function down(): void
    {
        Schema::table('merchant_waitlists', function (Blueprint $table) {
            $table->string('nda_partner', 80)->nullable()->after('commerce_type_other');
            $table->dropColumn('email');
        });
    }
};
