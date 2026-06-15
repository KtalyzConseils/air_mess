<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Admin extends Model
{
    use HasFactory;

    public const ROLE_SUPER = 'super';
    public const ROLE_OPS = 'ops';
    public const ROLE_COMMERCIAL = 'commercial';
    public const ROLE_SUPPORT = 'support';

    protected $fillable = [
        'user_id',
        'first_name',
        'last_name',
        'sub_role',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function isSuper(): bool      { return $this->sub_role === self::ROLE_SUPER; }
    public function isOps(): bool        { return $this->sub_role === self::ROLE_OPS; }
    public function isCommercial(): bool { return $this->sub_role === self::ROLE_COMMERCIAL; }
    public function isSupport(): bool    { return $this->sub_role === self::ROLE_SUPPORT; }
}
