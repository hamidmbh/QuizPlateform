<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\TeacherController;
use App\Http\Controllers\StudentController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

// Public routes
Route::post('/auth/login', [AuthController::class, 'login']);

// Protected routes (require authentication)
Route::middleware('auth:sanctum')->group(function () {
    // Auth routes
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // Teacher-only routes
    Route::middleware('role:TEACHER')->group(function () {
        Route::prefix('classes')->group(function () {
            Route::get('/', [TeacherController::class, 'getClasses']);
            Route::post('/', [TeacherController::class, 'createClass']);
            Route::delete('/{id}', [TeacherController::class, 'deleteClass']);
            Route::get('/{id}/students', [TeacherController::class, 'getClassStudents']);
            Route::post('/{id}/quizzes', [TeacherController::class, 'createQuiz']);
        });

        Route::get('/quizzes', [TeacherController::class, 'getQuizzes']);
        Route::delete('/quizzes/{id}', [TeacherController::class, 'deleteQuiz']);
        Route::get('/quizzes/{id}/submissions', [TeacherController::class, 'getQuizSubmissions']);
        Route::get('/submissions/{id}', [TeacherController::class, 'getSubmission']);
        Route::delete('/quizzes/{quizId}/submissions/{studentId}', [TeacherController::class, 'resetSubmission']);

        // Student management routes
        Route::post('/students', [TeacherController::class, 'createStudent']);
        Route::put('/students/{id}', [TeacherController::class, 'updateStudent']);
        Route::delete('/students/{id}', [TeacherController::class, 'deleteStudent']);
    });

    // Student-only routes
    Route::middleware('role:STUDENT')->group(function () {
        Route::prefix('student')->group(function () {
            Route::get('/quizzes', [StudentController::class, 'getQuizzes']);
        });

        Route::post('/quizzes/{id}/start', [StudentController::class, 'startQuiz']);
        Route::post('/quizzes/{id}/submit', [StudentController::class, 'submitQuiz']);
    });
});
