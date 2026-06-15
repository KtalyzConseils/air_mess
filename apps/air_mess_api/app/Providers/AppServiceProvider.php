<?php

namespace App\Providers;

use App\Models\Course;
use App\Models\CourseStatusHistory;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }



    public function boot(): void
    {
        Log::info('🟢 AppServiceProvider::boot');

        // Personnalise le lien envoyé dans l'email de reset password :
        // il doit pointer vers la SPA, pas vers une URL Laravel inexistante.
        \Illuminate\Auth\Notifications\ResetPassword::createUrlUsing(function ($notifiable, string $token) {
            $frontendUrl = config('app.frontend_url', 'http://localhost:5173');
            return "{$frontendUrl}/reset-password?token={$token}&email=" . urlencode($notifiable->getEmailForPasswordReset());
        });

        // Personnalise le contenu de l'email (sujet, intro, etc.) en français
        \Illuminate\Auth\Notifications\ResetPassword::toMailUsing(function ($notifiable, string $url) {
            return (new \Illuminate\Notifications\Messages\MailMessage)
                ->subject('Réinitialisation de votre mot de passe — Air Mess')
                ->greeting('Bonjour 👋')
                ->line('Vous avez demandé une réinitialisation de votre mot de passe.')
                ->action('Réinitialiser mon mot de passe', $url)
                ->line('Ce lien expire dans 60 minutes.')
                ->line("Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.")
                ->salutation("— L'équipe Air Mess");
        });

        // CREATING — set reference + tracking_token
        Course::creating(function (Course $course) {
            Log::info('🔵 Course CREATING fired');

            if (empty($course->reference)) {
                $year = date('Y');
                $lastSeq = Course::whereYear('created_at', $year)->count() + 1;
                $course->reference = sprintf('AM-%s-%05d', $year, $lastSeq);
            }
            if (empty($course->tracking_token)) {
                $course->tracking_token = Str::random(10);
            }
        });

        // CREATED — log creation in history
        Course::created(function (Course $course) {
            Log::info('🟣 Course CREATED fired');

            CourseStatusHistory::create([
                'course_id'       => $course->id,
                'from_status'     => null,
                'to_status'       => $course->status,
                'changed_by_id'   => Auth::id(),
                'changed_by_type' => Auth::check() ? 'user' : 'system',
                'reason'          => 'Création de la course',
            ]);
        });

        // UPDATED — log status transition
        Course::updated(function (Course $course) {
            if ($course->wasChanged('status')) {
                CourseStatusHistory::create([
                    'course_id'       => $course->id,
                    'from_status'     => $course->getOriginal('status'),
                    'to_status'       => $course->status,
                    'changed_by_id'   => Auth::id(),
                    'changed_by_type' => Auth::check() ? 'user' : 'system',
                ]);
            }
        });
    }
}
