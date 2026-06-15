<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CourseStatusHistory extends Model
{
    use HasFactory;

    protected $table = 'course_status_history';

    public $timestamps = false; // on a juste created_at

    protected $fillable = [
        'course_id', 'from_status', 'to_status',
        'changed_by_id', 'changed_by_type', 'reason', 'metadata',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function course()
    {
        return $this->belongsTo(Course::class);
    }

    public function changedBy()
    {
        return $this->belongsTo(User::class, 'changed_by_id');
    }
}
