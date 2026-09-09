<?php

namespace App\Console\Commands;

use App\Models\Admin;
use App\Models\Course;
use App\Services\NotificationService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class MonitorUnassignedCourses extends Command
{
    protected $signature = 'courses:monitor-unassigned';
    protected $description = 'Alerte les administrateurs pour les courses toujours sans livreur';

    public function handle(NotificationService $notifier): int
    {
        $admins = Admin::query()->whereIn('sub_role', [Admin::ROLE_SUPER, Admin::ROLE_OPS, Admin::ROLE_SUPPORT])
            ->with('user:id,email')->get()->pluck('user')->filter();

        Course::query()->where('status', Course::STATUS_AWAITING)->whereNull('driver_id')
            ->chunkById(100, function ($courses) use ($admins, $notifier) {
                foreach ($courses as $course) {
                    $minutes = ($course->offer_broadcasted_at ?? $course->created_at)->diffInMinutes(now());
                    $thresholds = $course->urgency === 'express' ? [10, 15] : [1200, 1440];
                    $sent = $course->offer_alerts_sent ?? [];

                    foreach ($thresholds as $threshold) {
                        $key = (string) $threshold;
                        if ($minutes < $threshold || in_array($key, $sent, true)) continue;

                        $label = $course->urgency === 'express' ? "{$threshold} minutes" : ($threshold / 60).' heures';
                        $title = 'Course sans livreur';
                        $body = "{$course->reference} attend un livreur depuis {$label}.";
                        foreach ($admins as $adminUser) {
                            $notifier->sendToUser($adminUser->id, 'course.unassigned_alert', $title, $body, [
                                'screen' => 'admin_unassigned_courses', 'threshold' => $threshold,
                            ], $course->id);
                        }

                        $emails = $admins->pluck('email')->filter()->unique()->all();
                        if ($emails !== []) Mail::raw($body, fn ($mail) => $mail->to($emails)->subject($title));
                        $sent[] = $key;
                    }

                    if ($sent !== ($course->offer_alerts_sent ?? [])) {
                        $course->forceFill(['offer_alerts_sent' => array_values(array_unique($sent))])->save();
                    }
                }
            });

        return self::SUCCESS;
    }
}
