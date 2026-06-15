<?php

namespace App\Observers;

use App\Models\Course;
use App\Models\CourseStatusHistory;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class CourseObserver
{
    /**
     * Avant l'insertion : générer reference et tracking_token.
     */
    public function creating(Course $course): void
    {
        \Log::info('🔵 CourseObserver::creating fired for course');
        
        if (empty($course->reference)) {
            $year = now()->format('Y');
            $lastSeq = Course::whereYear('created_at', $year)->count() + 1;
            $course->reference = sprintf('AM-%s-%05d', $year, $lastSeq);
        }

        if (empty($course->tracking_token)) {
            $course->tracking_token = Str::random(10);
        }
    }

    /**
     * Après l'insertion : log la création comme premier événement.
     */
    public function created(Course $course): void
    {
        CourseStatusHistory::create([
            'course_id'       => $course->id,
            'from_status'     => null,
            'to_status'       => $course->status,
            'changed_by_id'   => Auth::id(),
            'changed_by_type' => Auth::check() ? 'user' : 'system',
            'reason'          => 'Création de la course',
        ]);
    }

    /**
     * À chaque update : log la transition de statut si elle a changé.
     */
    public function updated(Course $course): void
    {
        if ($course->wasChanged('status')) {
            CourseStatusHistory::create([
                'course_id'       => $course->id,
                'from_status'     => $course->getOriginal('status'),
                'to_status'       => $course->status,
                'changed_by_id'   => Auth::id(),
                'changed_by_type' => Auth::check() ? 'user' : 'system',
            ]);
        }
    }
}
