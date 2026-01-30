<?php

namespace App\Http\Controllers;

use App\Models\ClassModel;
use App\Models\Quiz;
use App\Models\Question;
use App\Models\Option;
use App\Models\Submission;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class TeacherController extends Controller
{
    /**
     * Get all classes for the teacher
     * GET /api/classes
     */
    public function getClasses(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->isTeacher()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $classes = ClassModel::where('teacher_id', $user->id)
            ->withCount('students')
            ->with('students')
            ->get();

        return response()->json($classes);
    }

    /**
     * Create a new class
     * POST /api/classes
     */
    public function createClass(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->isTeacher()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $class = ClassModel::create([
            'name' => $validated['name'],
            'teacher_id' => $user->id,
        ]);

        return response()->json($class, 201);
    }

    /**
     * Get students in a class
     * GET /api/classes/{id}/students
     */
    public function getClassStudents(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->isTeacher()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $class = ClassModel::where('id', $id)
            ->where('teacher_id', $user->id)
            ->firstOrFail();

        // Get students with role STUDENT only
        $students = $class->students()->where('role', 'STUDENT')->get();

        return response()->json($students);
    }

    /**
     * Get all quizzes (for teachers)
     * GET /api/quizzes
     */
    public function getQuizzes(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->isTeacher()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $quizzes = Quiz::where('created_by', $user->id)
            ->with(['classes', 'questions.options'])
            ->get();

        // Transform quizzes to include classIds in the response
        $quizzesArray = $quizzes->map(function ($quiz) {
            $quizArray = $quiz->toArray();
            // Add classIds array for easier frontend consumption
            $quizArray['classIds'] = $quiz->classes->pluck('id')->map(fn($id) => (string)$id)->toArray();
            return $quizArray;
        });

        return response()->json($quizzesArray);
    }

    /**
     * Create a quiz for multiple classes
     * POST /api/quizzes
     */
    public function createQuiz(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->isTeacher()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'durationMinutes' => 'required|integer|min:1|max:180',
            'openAt' => 'required|date',
            'closeAt' => 'required|date|after:openAt',
            'classIds' => 'required|array|min:1',
            'classIds.*' => 'required|exists:classes,id',
            'questions' => 'required|array|min:1',
            'questions.*.text' => 'required|string',
            'questions.*.options' => 'required|array|min:2',
            'questions.*.options.*.text' => 'required|string',
            'questions.*.options.*.isCorrect' => 'required|boolean',
        ]);

        // Verify all classes belong to the teacher
        $teacherClassIds = ClassModel::where('teacher_id', $user->id)->pluck('id')->toArray();
        $invalidClassIds = array_diff($validated['classIds'], $teacherClassIds);
        if (!empty($invalidClassIds)) {
            return response()->json(['message' => 'One or more classes do not belong to you'], 403);
        }

        DB::beginTransaction();
        try {
            $quiz = Quiz::create([
                'title' => $validated['title'],
                'description' => $validated['description'] ?? null,
                'created_by' => $user->id,
                'duration_minutes' => $validated['durationMinutes'],
                'open_at' => $validated['openAt'],
                'close_at' => $validated['closeAt'],
            ]);

            // Attach quiz to multiple classes
            $quiz->classes()->attach($validated['classIds']);

            foreach ($validated['questions'] as $index => $questionData) {
                $question = Question::create([
                    'quiz_id' => $quiz->id,
                    'text' => $questionData['text'],
                    'order' => $index,
                ]);

                foreach ($questionData['options'] as $optIndex => $optionData) {
                    Option::create([
                        'question_id' => $question->id,
                        'text' => $optionData['text'],
                        'is_correct' => $optionData['isCorrect'],
                        'order' => $optIndex,
                    ]);
                }
            }

            DB::commit();

            $quiz->load(['classes', 'questions.options']);
            
            // Transform quiz to include classIds in the response
            $quizArray = $quiz->toArray();
            $quizArray['classIds'] = $quiz->classes->pluck('id')->map(fn($id) => (string)$id)->toArray();

            return response()->json($quizArray, 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to create quiz: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Update an existing quiz
     * PUT /api/quizzes/{id}
     */
    public function updateQuiz(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->isTeacher()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $quiz = Quiz::where('id', $id)
            ->where('created_by', $user->id)
            ->firstOrFail();

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'durationMinutes' => 'required|integer|min:1|max:180',
            'classIds' => 'required|array|min:1',
            'classIds.*' => 'required|exists:classes,id',
            'openAt' => 'required|date',
            'closeAt' => 'required|date|after:openAt',
            'questions' => 'required|array|min:1',
            'questions.*.id' => 'nullable|exists:questions,id',
            'questions.*.text' => 'required|string',
            'questions.*.options' => 'required|array|min:2',
            'questions.*.options.*.id' => 'nullable|exists:options,id',
            'questions.*.options.*.text' => 'required|string',
            'questions.*.options.*.isCorrect' => 'required|boolean',
        ]);

        // Verify all classes belong to the teacher
        $teacherClassIds = ClassModel::where('teacher_id', $user->id)->pluck('id')->toArray();
        $invalidClassIds = array_diff($validated['classIds'], $teacherClassIds);
        if (!empty($invalidClassIds)) {
            return response()->json(['message' => 'One or more classes do not belong to you'], 403);
        }

        DB::beginTransaction();
        try {
            $quiz->update([
                'title' => $validated['title'],
                'description' => $validated['description'] ?? null,
                'duration_minutes' => $validated['durationMinutes'],
                'open_at' => $validated['openAt'],
                'close_at' => $validated['closeAt'],
            ]);

            // Sync quiz classes (replace existing with new ones)
            $quiz->classes()->sync($validated['classIds']);

            $existingQuestionIds = $quiz->questions->pluck('id')->toArray();
            $updatedQuestionIds = [];

            foreach ($validated['questions'] as $index => $questionData) {
                $question = $quiz->questions()->updateOrCreate(
                    ['id' => $questionData['id'] ?? null],
                    ['text' => $questionData['text'], 'order' => $index]
                );
                $updatedQuestionIds[] = $question->id;

                $existingOptionIds = $question->options->pluck('id')->toArray();
                $updatedOptionIds = [];

                foreach ($questionData['options'] as $optIndex => $optionData) {
                    $option = $question->options()->updateOrCreate(
                        ['id' => $optionData['id'] ?? null],
                        ['text' => $optionData['text'], 'is_correct' => $optionData['isCorrect'], 'order' => $optIndex]
                    );
                    $updatedOptionIds[] = $option->id;
                }
                // Delete options that were removed
                $question->options()->whereNotIn('id', $updatedOptionIds)->delete();
            }
            // Delete questions that were removed
            $quiz->questions()->whereNotIn('id', $updatedQuestionIds)->delete();

            DB::commit();

            $quiz->load(['classes', 'questions.options']);
            
            // Transform quiz to include classIds in the response
            $quizArray = $quiz->toArray();
            $quizArray['classIds'] = $quiz->classes->pluck('id')->map(fn($id) => (string)$id)->toArray();

            return response()->json($quizArray);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to update quiz: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Get submissions for a quiz
     * GET /api/quizzes/{id}/submissions
     */
    public function getQuizSubmissions(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->isTeacher()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $quiz = Quiz::where('id', $id)
            ->where('created_by', $user->id)
            ->firstOrFail();

        $submissions = Submission::where('quiz_id', $quiz->id)
            ->with(['student', 'answers.option', 'answers.question'])
            ->get();

        return response()->json($submissions);
    }

    /**
     * Get a specific submission
     * GET /api/submissions/{id}
     */
    public function getSubmission(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->isTeacher()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $submission = Submission::where('id', $id)
            ->with(['quiz', 'student', 'answers.option', 'answers.question'])
            ->firstOrFail();

        // Check if the teacher owns the quiz
        if ($submission->quiz->created_by !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($submission);
    }

    /**
     * Create a student
     * POST /api/students
     */
    public function createStudent(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->isTeacher()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
            'classId' => 'required|exists:classes,id',
        ]);

        // Verify the class belongs to the teacher
        $class = ClassModel::where('id', $validated['classId'])
            ->where('teacher_id', $user->id)
            ->firstOrFail();

        $student = \App\Models\User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => \Illuminate\Support\Facades\Hash::make($validated['password']),
            'role' => 'STUDENT',
            'class_id' => $validated['classId'],
        ]);

        return response()->json($student, 201);
    }

    /**
     * Update a student
     * PUT /api/students/{id}
     */
    public function updateStudent(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->isTeacher()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $student = \App\Models\User::where('id', $id)
            ->where('role', 'STUDENT')
            ->firstOrFail();

        // Verify the student's class belongs to the teacher
        if ($student->class_id) {
            $class = ClassModel::where('id', $student->class_id)
                ->where('teacher_id', $user->id)
                ->firstOrFail();
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $id,
            'password' => 'sometimes|string|min:6',
            'classId' => 'sometimes|exists:classes,id',
        ]);

        if (isset($validated['classId'])) {
            // Verify the new class belongs to the teacher
            $newClass = ClassModel::where('id', $validated['classId'])
                ->where('teacher_id', $user->id)
                ->firstOrFail();
        }

        if (isset($validated['password'])) {
            $validated['password'] = \Illuminate\Support\Facades\Hash::make($validated['password']);
        }

        if (isset($validated['classId'])) {
            $validated['class_id'] = $validated['classId'];
            unset($validated['classId']);
        }

        $student->update($validated);

        return response()->json($student);
    }

    /**
     * Delete a student
     * DELETE /api/students/{id}
     */
    public function deleteStudent(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->isTeacher()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $student = \App\Models\User::where('id', $id)
            ->where('role', 'STUDENT')
            ->firstOrFail();

        // Verify the student's class belongs to the teacher
        if ($student->class_id) {
            $class = ClassModel::where('id', $student->class_id)
                ->where('teacher_id', $user->id)
                ->firstOrFail();
        }

        $student->delete();

        return response()->json(['message' => 'Student deleted successfully']);
    }

    /**
     * Delete a quiz
     * DELETE /api/quizzes/{id}
     */
    public function deleteQuiz(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->isTeacher()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $quiz = Quiz::where('id', $id)
            ->where('created_by', $user->id)
            ->firstOrFail();

        $quiz->delete();

        return response()->json(['message' => 'Quiz deleted successfully'], 200);
    }
}
