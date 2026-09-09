<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Auth\Notifications\ResetPassword as ResetPasswordNotification;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, HasUuids;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function pegawai(): HasOne
    {
        return $this->hasOne(Pegawai::class, 'user_id');
    }

    /**
     * Kirim notifikasi reset password dengan URL frontend (SPA).
     *
     * Catatan: konstruktor ResetPasswordNotification menerima TOKEN mentah,
     * bukan URL. URL kustom diberikan lewat createUrlUsing, karena method
     * bawaan resetUrl() memanggil route('password.reset') yang tidak ada
     * di aplikasi API-only ini (menyebabkan 500 "Route [password.reset]
     * not defined" jika URL dioper sebagai token).
     */
    public function sendPasswordResetNotification($token): void
    {
        $frontendUrl = rtrim((string) config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:5173')), '/');

        ResetPasswordNotification::createUrlUsing(
            fn ($notifiable) => $frontendUrl . '/reset-password?token=' . $token . '&email=' . urlencode((string) $notifiable->getEmailForPasswordReset())
        );

        $this->notify(new ResetPasswordNotification($token));
    }
}
