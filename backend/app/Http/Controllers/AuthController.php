<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Login user (Bearer token via Sanctum).
     */
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        if (!Auth::attempt($credentials)) {
            throw ValidationException::withMessages([
                'email' => ['Kredensial yang diberikan tidak cocok dengan data kami.'],
            ]);
        }

        /** @var \App\Models\User $user */
        $user = Auth::user();

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'message' => 'Login berhasil.',
            'token'   => $token,
            'user'    => $user->load('pegawai.pangkatGolongan.jenjangJabatan', 'pegawai.jenjangJabatan'),
        ]);
    }

    /**
     * Logout user — hapus token aktif.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logout berhasil.',
        ]);
    }

    /**
     * Dapatkan profil user saat ini.
     */
    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $request->user()->load('pegawai.pangkatGolongan.jenjangJabatan', 'pegawai.jenjangJabatan'),
        ]);
    }

    /**
     * Kirim link reset password ke email.
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        $status = Password::sendResetLink(
            $request->only('email')
        );

        if ($status === Password::RESET_LINK_SENT) {
            return response()->json([
                'message' => 'Link reset password telah dikirim ke email Anda jika email tersebut terdaftar.',
            ]);
        }

        // Jangan bocorkan apakah email ada atau tidak - tetap return sukses untuk keamanan,
        // tapi jika throttled, beri info.
        if ($status === Password::RESET_THROTTLED) {
            return response()->json([
                'message' => 'Terlalu banyak percobaan. Silakan coba lagi dalam beberapa menit.',
            ], 429);
        }

        return response()->json([
            'message' => 'Link reset password telah dikirim ke email Anda jika email tersebut terdaftar.',
        ]);
    }

    /**
     * Reset password dengan token.
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'token' => 'required|string',
            'email' => 'required|email',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user, $password) {
                $user->forceFill([
                    'password' => Hash::make($password),
                    'remember_token' => Str::random(60),
                ])->save();

                event(new PasswordReset($user));
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return response()->json([
                'message' => 'Password berhasil direset. Silakan login dengan password baru.',
            ]);
        }

        throw ValidationException::withMessages([
            'email' => [__($status)],
            'token' => [__($status)],
        ]);
    }
}
