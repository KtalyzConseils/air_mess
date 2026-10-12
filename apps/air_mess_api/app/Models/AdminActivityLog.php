<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AdminActivityLog extends Model
{
    protected $fillable = [
        'admin_id',
        'target_admin_id',
        'action',
        'summary',
        'changes',
        'ip_address',
        'user_agent',
    ];

    protected function casts(): array
    {
        return [
            'changes' => 'array',
        ];
    }

    public function admin()
    {
        return $this->belongsTo(Admin::class);
    }

    public function targetAdmin()
    {
        return $this->belongsTo(Admin::class, 'target_admin_id');
    }
}
