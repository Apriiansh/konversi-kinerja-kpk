<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Pegawai extends Model
{
    use HasUuids;

    protected $table = 'pegawai';

    protected $fillable = [
        'user_id',
        'nip',
        'nama_lengkap',
        'atasan_id',
        'pangkat_golongan_id',
        'pendidikan_terakhir',
        'tmt_jabatan',
    ];

    protected function casts(): array
    {
        return [
            'tmt_jabatan' => 'date',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function atasan(): BelongsTo
    {
        return $this->belongsTo(Pegawai::class, 'atasan_id');
    }

    public function bawahan(): HasMany
    {
        return $this->hasMany(Pegawai::class, 'atasan_id');
    }

    public function pangkatGolongan(): BelongsTo
    {
        return $this->belongsTo(MasterPangkatGolongan::class, 'pangkat_golongan_id');
    }

    public function evaluasiKinerja(): HasMany
    {
        return $this->hasMany(EvaluasiKinerja::class, 'pegawai_id');
    }

    public function penetapanAk(): HasMany
    {
        return $this->hasMany(PenetapanAK::class, 'pegawai_id');
    }

    public function pengajuanPendidikan(): HasMany
    {
        return $this->hasMany(PengajuanPendidikan::class, 'pegawai_id');
    }
}
