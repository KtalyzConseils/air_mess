<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CourseOfferAdminAction extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['metadata' => 'array'];
    }

    public function adminUser()
    {
        return $this->belongsTo(User::class, 'admin_user_id');
    }
}
