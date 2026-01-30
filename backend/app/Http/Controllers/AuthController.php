<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Login and return JWT token
     * POST /api/auth/login
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        // Create a simple token (in production, use Sanctum or JWT)
        $token = $user->createToken('auth-token')->plainTextToken;

        $userPayload = [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
        ];
        if ($user->role === 'TEACHER') {
            $userPayload['classId'] = $user->class_id;
        }
        return response()->json([
            'token' => $token,
            'user' => $userPayload,
        ]);
    }

    /**
     * Get current authenticated user
     * GET /api/me
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        $payload = [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
        ];
        if ($user->role === 'TEACHER') {
            $payload['classId'] = $user->class_id;
        }
        return response()->json($payload);
    }

    /**
     * Logout (revoke token)
     * POST /api/auth/logout
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully']);
    }
}
