<?php

namespace App\Http\Controllers;

use App\Models\Quiz;
use App\Models\Submission;
use App\Models\Answer;
use App\Models\Question;
use App\Models\Option;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class StudentController extends Controller
{
    /**
     * Get available quizzes for student
     * GET /api/student/quizzes
     */
    public function getQuizzes(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->isStudent()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if (!$user->class_id) {
            return response()->json([]);
        }

        $now = Carbon::now();

        // Get all quizzes assigned to the student's class (including past ones to show late status)
        $quizzes = Quiz::whereHas('classes', function ($query) use ($user) {
                $query->where('classes.id', $user->class_id);
            })
            ->where('open_at', '<=', $now) // Only show quizzes that have opened
            ->with(['questions.options', 'classes'])
            ->get();

        // Add submission status to each quiz
        $quizzes->each(function ($quiz) use ($user, $now) {
            $submission = Submission::where('quiz_id', $quiz->id)
                ->where('student_id', $user->id)
                ->first();

            $quiz->hasSubmission = $submission !== null;
            if ($submission && $submission->isSubmitted()) {
                $quiz->submissionStatus = 'completed';
            } elseif ($submission && !$submission->isSubmitted()) {
                $quiz->submissionStatus = 'in_progress';
            } else {
                // Check if quiz is late (past close date)
                $closeAt = Carbon::parse($quiz->close_at);
                if ($now->isAfter($closeAt)) {
                    $quiz->submissionStatus = 'late';
                } else {
                    $quiz->submissionStatus = 'pending';
                }
            }
            
            // Ensure submissionStatus is included in JSON serialization
            $quiz->setAttribute('submissionStatus', $quiz->submissionStatus);
        });

        // Convert to array to ensure dynamic properties are included
        $quizzesArray = $quizzes->map(function ($quiz) {
            $quizArray = $quiz->toArray();
            $quizArray['submissionStatus'] = $quiz->submissionStatus;
            // Add classIds array for easier frontend consumption
            $quizArray['classIds'] = $quiz->classes->pluck('id')->map(fn($id) => (string)$id)->toArray();
            return $quizArray;
        });

        return response()->json($quizzesArray);
    }

    /**
     * Start a quiz (creates submission)
     * POST /api/quizzes/{id}/start
     */
    public function startQuiz(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->isStudent()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $quiz = Quiz::where('id', $id)
            ->whereHas('classes', function ($query) use ($user) {
                $query->where('classes.id', $user->class_id);
            })
            ->firstOrFail();

        // Check if quiz is open
        $now = Carbon::now();
        if ($now->isBefore($quiz->open_at) || $now->isAfter($quiz->close_at)) {
            return response()->json(['message' => 'Quiz is not available'], 400);
        }

        // Check if submission already exists
        $existingSubmission = Submission::where('quiz_id', $quiz->id)
            ->where('student_id', $user->id)
            ->first();

        if ($existingSubmission) {
            if ($existingSubmission->isSubmitted()) {
                return response()->json(['message' => 'Quiz already submitted'], 400);
            }
            // Return existing submission if not submitted
            $existingSubmission->load(['quiz.questions.options']);
            return response()->json([
                'submission' => [
                    'id' => $existingSubmission->id,
                    'quizId' => $existingSubmission->quiz_id,
                    'studentId' => $existingSubmission->student_id,
                    'startedAt' => $existingSubmission->started_at->toIso8601String(),
                    'expiresAt' => $existingSubmission->expires_at->toIso8601String(),
                    'submittedAt' => $existingSubmission->submitted_at ? $existingSubmission->submitted_at->toIso8601String() : null,
                    'score' => $existingSubmission->score,
                ]
            ]);
        }

        // Create new submission
        $startedAt = Carbon::now();
        $expiresAt = $startedAt->copy()->addMinutes($quiz->duration_minutes);

        $submission = Submission::create([
            'quiz_id' => $quiz->id,
            'student_id' => $user->id,
            'started_at' => $startedAt,
            'expires_at' => $expiresAt,
        ]);

        $submission->load(['quiz.questions.options']);

        // Ensure dates are properly formatted in response
        return response()->json([
            'submission' => [
                'id' => $submission->id,
                'quizId' => $submission->quiz_id,
                'studentId' => $submission->student_id,
                'startedAt' => $submission->started_at->toIso8601String(),
                'expiresAt' => $submission->expires_at->toIso8601String(),
                'submittedAt' => $submission->submitted_at ? $submission->submitted_at->toIso8601String() : null,
                'score' => $submission->score,
            ]
        ], 201);
    }

    /**
     * Submit quiz answers
     * POST /api/quizzes/{id}/submit
     */
    public function submitQuiz(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->isStudent()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $quiz = Quiz::where('id', $id)
            ->whereHas('classes', function ($query) use ($user) {
                $query->where('classes.id', $user->class_id);
            })
            ->firstOrFail();

        $submission = Submission::where('quiz_id', $quiz->id)
            ->where('student_id', $user->id)
            ->firstOrFail();

        if ($submission->isSubmitted()) {
            return response()->json(['message' => 'Quiz already submitted'], 400);
        }

        // Allow submission even if expired (for auto-submit scenarios)
        // The frontend will auto-submit when time expires, so we should accept it
        // if ($submission->isExpired()) {
        //     return response()->json(['message' => 'Quiz time has expired'], 400);
        // }

        $validated = $request->validate([
            'answers' => 'required|array',
            'answers.*.questionId' => 'required|exists:questions,id',
            'answers.*.optionId' => 'required|exists:options,id',
        ]);

        DB::beginTransaction();
        try {
            // Delete existing answers
            Answer::where('submission_id', $submission->id)->delete();

            // Create new answers
            foreach ($validated['answers'] as $answerData) {
                Answer::create([
                    'submission_id' => $submission->id,
                    'question_id' => $answerData['questionId'],
                    'option_id' => $answerData['optionId'],
                ]);
            }

            // Calculate score - support multiple correct answers
            $totalQuestions = $quiz->questions()->count();
            $correctAnswers = 0;

            foreach ($quiz->questions as $question) {
                // Get all correct options for this question
                $correctOptions = $question->options()->where('is_correct', true)->pluck('id')->toArray();
                
                // Get student's answer(s) for this question
                $studentAnswers = Answer::where('submission_id', $submission->id)
                    ->where('question_id', $question->id)
                    ->pluck('option_id')
                    ->toArray();

                // Check if student selected all correct options and no incorrect ones
                if (!empty($correctOptions) && !empty($studentAnswers)) {
                    // For multiple correct answers: student must select all correct options
                    $selectedCorrect = array_intersect($studentAnswers, $correctOptions);
                    $selectedIncorrect = array_diff($studentAnswers, $correctOptions);
                    
                    // Question is correct if:
                    // - All correct options are selected
                    // - No incorrect options are selected
                    // - Number of selected answers matches number of correct answers
                    if (count($selectedCorrect) === count($correctOptions) && 
                        count($selectedIncorrect) === 0 &&
                        count($studentAnswers) === count($correctOptions)) {
                        $correctAnswers++;
                    }
                } elseif (!empty($correctOptions) && empty($studentAnswers)) {
                    // No answer provided - incorrect
                } elseif (empty($correctOptions)) {
                    // Question has no correct options defined - skip
                }
            }

            $score = $totalQuestions > 0 ? round(($correctAnswers / $totalQuestions) * 100, 2) : 0;

            // Update submission
            $submission->update([
                'submitted_at' => Carbon::now(),
                'score' => $score,
            ]);

            DB::commit();

            $submission->load(['answers.option', 'answers.question']);

            return response()->json([
                'submission' => $submission,
                'score' => $score,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to submit quiz: ' . $e->getMessage()], 500);
        }
    }
}
