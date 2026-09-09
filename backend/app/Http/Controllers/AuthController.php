<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
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
     * Selalu balas generik agar tidak membocorkan email terdaftar atau tidak.
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email|max:255',
        ]);

        try {
            $status = Password::sendResetLink(
                $request->only('email')
            );
        } catch (\Throwable $e) {
            Log::error('Gagal mengirim link reset password', [
                'email' => $request->input('email'),
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Gagal mengirim email saat ini. Silakan coba lagi beberapa saat.',
            ], 500);
        }

        // Tanpa pembatasan percobaan: abaikan status THROTTLED, selalu balas generik.
        // RESET_LINK_SENT maupun INVALID_USER sama-sama dibalas generik (anti-enumerasi).
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
            'email' => 'required|email|max:255',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user, $password) {
                // Cast 'hashed' di model akan me-hash otomatis, jadi simpan plain.
                $user->forceFill([
                    'password' => $password,
                    'remember_token' => Str::random(60),
                ])->save();

                // Cabut semua token Sanctum agar sesi lama tidak bisa dipakai lagi.
                $user->tokens()->delete();

                event(new PasswordReset($user));
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return response()->json([
                'message' => 'Password berhasil direset. Silakan login dengan password baru.',
            ]);
        }

        $messages = [
            Password::INVALID_TOKEN => 'Token reset tidak valid atau sudah kadaluarsa. Silakan minta link baru.',
            Password::INVALID_USER => 'Email tidak ditemukan dalam sistem kami.',
            'passwords.throttled' => 'Terlalu banyak percobaan. Silakan coba lagi beberapa menit.',
        ];

        $message = $messages[$status] ?? 'Gagal mereset password. Silakan minta link baru.';

        throw ValidationException::withMessages([
            'email' => [$message],
            'token' => [$message],
        ]);
    }
}
