<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AccountingLine extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = [
        'accounting_journal_id',
        'account_code',
        'account_name',
        'direction',
        'amount_fcfa',
        'currency',
        'holder_type',
        'holder_id',
        'counterparty_type',
        'counterparty_id',
        'metadata',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'amount_fcfa' => 'integer',
            'metadata' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function journal()
    {
        return $this->belongsTo(AccountingJournal::class, 'accounting_journal_id');
    }
}
