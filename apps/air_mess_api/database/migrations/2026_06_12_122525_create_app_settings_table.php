<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('app_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key', 100)->unique();
            $table->text('value');
            $table->string('type', 20);              // number|string|boolean|json
            $table->string('label', 150)->nullable();// Label affiché dans l'UI admin
            $table->text('description')->nullable(); // Aide pour l'admin
            $table->string('group', 50)->default('general'); // Pour grouper dans l'UI
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('app_settings');
    }
};
