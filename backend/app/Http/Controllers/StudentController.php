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

        // Convert to array; do not expose class/classIds to students
        $quizzesArray = $quizzes->map(function ($quiz) {
            $quizArray = $quiz->toArray();
            $quizArray['submissionStatus'] = $quiz->submissionStatus;
            unset($quizArray['classes']);
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
     *
     * - answers is optional/nullable; empty or missing is valid.
     * - Score = sum of points per question (1 per correct, 0 otherwise).
     * - Submission is marked completed with timestamp.
     * - Always returns JSON; 422 only for malformed data.
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
            ->with('questions.options')
            ->firstOrFail();

        $submission = Submission::where('quiz_id', $quiz->id)
            ->where('student_id', $user->id)
            ->firstOrFail();

        if ($submission->isSubmitted()) {
            return response()->json(['message' => 'Quiz already submitted'], 400);
        }

        // Validation: answers optional/nullable; when present, each item must have questionId and optionId (422 for malformed only)
        $validated = $request->validate([
            'answers' => 'nullable|array',
            'answers.*.questionId' => 'required|exists:questions,id',
            'answers.*.optionId' => 'required|exists:options,id',
        ]);

        $answersList = $validated['answers'] ?? [];
        // Map submitted answers by question ID (last answer wins if duplicate questionId)
        $answersByQuestionId = collect($answersList)->keyBy('questionId');

        DB::beginTransaction();
        try {
            Answer::where('submission_id', $submission->id)->delete();

            $questionIds = $quiz->questions->pluck('id')->flip();

            foreach ($answersList as $answerData) {
                $questionId = $answerData['questionId'];
                $optionId = $answerData['optionId'];
                if (!$questionIds->has($questionId)) {
                    continue;
                }
                $question = $quiz->questions->firstWhere('id', $questionId);
                if (!$question || !$question->options->contains('id', $optionId)) {
                    continue;
                }
                Answer::create([
                    'submission_id' => $submission->id,
                    'question_id' => $questionId,
                    'option_id' => $optionId,
                ]);
            }

            // Scoring: iterate all questions; no answer or wrong option = 0, correct option = 1 (or question points if available)
            $score = $quiz->questions->sum(function (Question $question) use ($answersByQuestionId) {
                $submitted = $answersByQuestionId->get($question->id);
                if ($submitted === null) {
                    return 0;
                }
                $option = $question->options->firstWhere('id', $submitted['optionId']);
                if ($option === null || !$option->is_correct) {
                    return 0;
                }
                return 1;
            });

            $completedAt = Carbon::now();
            $submission->update([
                'submitted_at' => $completedAt,
                'score' => $score,
            ]);

            DB::commit();

            $submission->load(['answers.option', 'answers.question']);

            return response()->json([
                'submission' => [
                    'id' => $submission->id,
                    'quizId' => $submission->quiz_id,
                    'studentId' => $submission->student_id,
                    'startedAt' => $submission->started_at->toIso8601String(),
                    'expiresAt' => $submission->expires_at->toIso8601String(),
                    'submittedAt' => $submission->submitted_at->toIso8601String(),
                    'score' => (float) $submission->score,
                ],
                'score' => (float) $score,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to submit quiz: ' . $e->getMessage()], 500);
        }
    }
}
