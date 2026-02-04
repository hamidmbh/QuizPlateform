<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\ClassModel;
use App\Models\Quiz;
use App\Models\Question;
use App\Models\Option;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Create a teacher
        $teacher = User::create([
            'name' => 'Professor Smith',
            'email' => 'teacher@example.com',
            'password' => Hash::make('password'),
            'role' => 'TEACHER',
        ]);

        // Create a class
        $class = ClassModel::create([
            'name' => '1BAC',
            'teacher_id' => $teacher->id,
        ]);

        // Create students
        $student1 = User::create([
            'name' => 'John Doe',
            'email' => 'student1@example.com',
            'password' => Hash::make('password'),
            'role' => 'STUDENT',
            'class_id' => $class->id,
        ]);

        $student2 = User::create([
            'name' => 'Jane Smith',
            'email' => 'student2@example.com',
            'password' => Hash::make('password'),
            'role' => 'STUDENT',
            'class_id' => $class->id,
        ]);

        // Create a quiz
        $quiz = Quiz::create([
            'title' => 'Math Quiz - Algebra',
            'description' => 'Test your knowledge of basic algebra',
            'class_id' => $class->id,
            'created_by' => $teacher->id,
            'duration_minutes' => 30,
            'open_at' => now()->subDay(),
            'close_at' => now()->addDays(7),
        ]);

        // Create questions
        $question1 = Question::create([
            'quiz_id' => $quiz->id,
            'text' => 'What is 2 + 2?',
            'order' => 0,
        ]);

        Option::create(['question_id' => $question1->id, 'text' => '3', 'is_correct' => false, 'order' => 0]);
        Option::create(['question_id' => $question1->id, 'text' => '4', 'is_correct' => true, 'order' => 1]);
        Option::create(['question_id' => $question1->id, 'text' => '5', 'is_correct' => false, 'order' => 2]);
        Option::create(['question_id' => $question1->id, 'text' => '6', 'is_correct' => false, 'order' => 3]);

        $question2 = Question::create([
            'quiz_id' => $quiz->id,
            'text' => 'What is the square root of 16?',
            'order' => 1,
        ]);

        Option::create(['question_id' => $question2->id, 'text' => '2', 'is_correct' => false, 'order' => 0]);
        Option::create(['question_id' => $question2->id, 'text' => '4', 'is_correct' => true, 'order' => 1]);
        Option::create(['question_id' => $question2->id, 'text' => '8', 'is_correct' => false, 'order' => 2]);
        Option::create(['question_id' => $question2->id, 'text' => '16', 'is_correct' => false, 'order' => 3]);
    }
}
