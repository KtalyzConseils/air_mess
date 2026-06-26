<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('support_notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('admin_id')->constrained('admins')->cascadeOnDelete();
            // Polymorphe : 'course' | 'user' | 'incident'
            $table->string('notable_type', 30);
            $table->unsignedBigInteger('notable_id');
            $table->text('body');
            // Si la note est une escalade vers un autre rôle (ops/commercial), on tag explicitement.
            $table->string('escalated_to', 20)->nullable();
            $table->timestamps();

            $table->index(['notable_type', 'notable_id']);
            $table->index(['escalated_to', 'created_at']);
        });

        DB::statement("ALTER TABLE support_notes ADD CONSTRAINT support_notes_notable_type_chk
            CHECK (notable_type IN ('course','user','incident'))");
        DB::statement("ALTER TABLE support_notes ADD CONSTRAINT support_notes_escalated_to_chk
            CHECK (escalated_to IS NULL OR escalated_to IN ('ops','commercial','super'))");
    }

    public function down(): void
    {
        Schema::dropIfExists('support_notes');
    }
};
