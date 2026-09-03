<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PenetapanAK extends Model
{
    use HasUuids;

    protected $table = 'penetapan_ak';

    protected $fillable = [
        'pegawai_id',
        'tahun',
        'ak_dasar',
        'ak_lama',
        'ak_baru',
        'ak_kumulatif',
    ];

    public function pegawai(): BelongsTo
    {
        return $this->belongsTo(Pegawai::class, 'pegawai_id');
    }
}
