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
        'ak_pak_pelantikan',
        'ak_historis',
        'ak_lama',
        'ak_baru',
        'ak_booster',
        'ak_carry_over',
        'ak_kumulatif',
        'status_kelayakan',
        'catatan_kelayakan',
        'is_final',
    ];

    protected function casts(): array
    {
        return [
            'tahun' => 'integer',
            'ak_dasar' => 'decimal:2',
            'ak_pak_pelantikan' => 'decimal:2',
            'ak_historis' => 'decimal:2',
            'ak_lama' => 'decimal:2',
            'ak_baru' => 'decimal:2',
            'ak_booster' => 'decimal:2',
            'ak_carry_over' => 'decimal:2',
            'ak_kumulatif' => 'decimal:2',
            'is_final' => 'boolean',
        ];
    }

    public function pegawai(): BelongsTo
    {
        return $this->belongsTo(Pegawai::class, 'pegawai_id');
    }
}
