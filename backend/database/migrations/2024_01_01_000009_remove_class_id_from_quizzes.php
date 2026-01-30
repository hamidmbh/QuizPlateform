<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // First, migrate existing data to pivot table
        $quizzes = DB::table('quizzes')->get();
        foreach ($quizzes as $quiz) {
            if ($quiz->class_id) {
                DB::table('quiz_class')->insert([
                    'quiz_id' => $quiz->id,
                    'class_id' => $quiz->class_id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        // Then remove the foreign key constraint and column
        Schema::table('quizzes', function (Blueprint $table) {
            $table->dropForeign(['class_id']);
            $table->dropColumn('class_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('quizzes', function (Blueprint $table) {
            $table->foreignId('class_id')->nullable()->constrained('classes')->onDelete('cascade');
        });

        // Migrate data back (take first class for each quiz)
        $quizClasses = DB::table('quiz_class')->get();
        foreach ($quizClasses as $quizClass) {
            DB::table('quizzes')
                ->where('id', $quizClass->quiz_id)
                ->update(['class_id' => $quizClass->class_id]);
        }
    }
};
