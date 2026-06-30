<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Models\Course;
use App\Models\CourseIncident;
use App\Models\CourseStatusHistory;
use App\Models\Driver;
use App\Models\SupportNote;
use App\Models\User;
use App\Services\NotificationService;
use App\Services\UserWalletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\Rule;

/**
 * Endpoints réservés au support pour aider un utilisateur au téléphone.
 *
 * Règle d'or : aucune action ne touche au flux d'argent (pas de validation marchand,
 * pas d'approve retrait, pas d'ajustement wallet, pas de réassignation). Tout est
 * soit lecture, soit action douce (notif manuelle, reset password, note interne,
 * annulation d'une course PAS encore prise par un driver).
 *
 * Les routes ici sont gatées par `admin:support` (super inclus automatiquement) ou
 * `admin:support,ops,commercial` pour les notes (utiles à tous les rôles).
 */
class SupportController extends Controller
{
    // ============================================================
    // === ACTIONS SUR USERS =====================================
    // ============================================================

    /**
     * Renvoie un lien de reset password au user — pour le client qui dit
     * "j'ai oublié mon mot de passe" au téléphone. Réutilise le workflow standard.
     */
    public function sendPasswordReset(Request $request, User $user): JsonResponse
    {
        if (! $user->email) {
            return response()->json(['message' => "Cet utilisateur n'a pas d'email enregistré."], 422);
        }

        $status = Password::sendResetLink(['email' => $user->email]);

        return response()->json([
            'message' => $status === Password::RESET_LINK_SENT
                ? "Lien de réinitialisation envoyé à {$user->email}."
                : "Échec de l'envoi du lien (statut Laravel : {$status}).",
        ], $status === Password::RESET_LINK_SENT ? 200 : 422);
    }

    /**
     * Envoie une notification manuelle à un user — typique cas où le support
     * appelle pour clarifier ("votre course est partie, le livreur vous appelle
     * dans 5 min") et veut laisser une trace push/historique.
     *
     * Limité à 200 caractères pour éviter qu'on s'en serve comme messagerie.
     */
    public function sendNotificationToUser(
        Request $request,
        User $user,
        NotificationService $notifier,
    ): JsonResponse {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:80'],
            'body'  => ['required', 'string', 'max:200'],
        ]);

        $admin = $request->user()->admin;
        $notifier->sendToUser(
            $user->id,
            'support.manual',
            $data['title'],
            $data['body'],
            ['by_admin_id' => $admin->id],
        );

        return response()->json(['message' => 'Notification envoyée.']);
    }

    // ============================================================
    // === ANNULATION COURSE NON ASSIGNÉE ========================
    // ============================================================

    /**
     * Annule une course pour le compte du marchand/particulier — uniquement
     * si elle n'a PAS encore été acceptée par un driver. Refund auto du hold
     * wallet via UserWalletService::releaseReservation.
     *
     * Si déjà assignée à un driver → 422, le support doit escalader à ops
     * (qui a accès à reassignCourse ou peut décider d'une compensation driver).
     */
    public function cancelCourse(
        Request $request,
        Course $course,
        NotificationService $notifier,
        UserWalletService $walletService,
    ): JsonResponse {
        $data = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ]);

        $allowed = [Course::STATUS_PENDING_PREP, Course::STATUS_AWAITING];
        if (! in_array($course->status, $allowed, true)) {
            return response()->json([
                'message' => "Annulation support impossible : la course est en statut « {$course->status} ». "
                    . "Le support n'annule que les courses pas encore prises par un livreur. "
                    . "Escalade à ops pour les autres cas.",
            ], 422);
        }

        $previousStatus = $course->status;
        $admin = $request->user()->admin;

        DB::transaction(function () use ($course, $data, $previousStatus, $admin, $walletService) {
            $course->update([
                'status'              => Course::STATUS_CANCELLED,
                'cancelled_at'        => now(),
                'cancellation_reason' => '[Support] ' . $data['reason'],
                'cancelled_by'        => $admin->user_id,
            ]);

            if ($course->paid_from_wallet) {
                $walletService->releaseReservation(
                    $course->sender,
                    $course,
                    (int) $course->delivery_fee,
                );
            }

            CourseStatusHistory::create([
                'course_id'       => $course->id,
                'from_status'     => $previousStatus,
                'to_status'       => Course::STATUS_CANCELLED,
                'changed_by_id'   => $admin->user_id,
                'changed_by_type' => 'admin',
                'reason'          => '[Support] ' . $data['reason'],
            ]);
        });

        $notifier->sendToUser(
            $course->sender_id,
            'course.cancelled_by_support',
            '↩️ Course annulée par le support',
            "Votre course {$course->reference} a été annulée à votre demande. Motif : {$data['reason']}",
            ['reference' => $course->reference],
            $course->id,
        );

        return response()->json([
            'message' => 'Course annulée. Hold wallet libéré si applicable.',
            'course'  => $course->fresh(),
        ]);
    }

    // ============================================================
    // === NOTES INTERNES (CRUD) =================================
    // ============================================================

    /**
     * Liste les notes attachées à une entité (course, user, incident).
     * Ouvert à tous les rôles admin (ops/commercial/support/super).
     */
    public function listNotes(Request $request): JsonResponse
    {
        $data = $request->validate([
            'notable_type' => ['required', Rule::in([
                SupportNote::NOTABLE_COURSE,
                SupportNote::NOTABLE_USER,
                SupportNote::NOTABLE_INCIDENT,
            ])],
            'notable_id'   => ['required', 'integer', 'min:1'],
        ]);

        $notes = SupportNote::with('admin')
            ->where('notable_type', $data['notable_type'])
            ->where('notable_id', $data['notable_id'])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (SupportNote $n) => [
                'id'           => $n->id,
                'body'         => $n->body,
                'escalated_to' => $n->escalated_to,
                'created_at'   => $n->created_at,
                'author'       => [
                    'id'        => $n->admin?->id,
                    'name'      => trim(($n->admin?->first_name ?? '') . ' ' . ($n->admin?->last_name ?? '')),
                    'sub_role'  => $n->admin?->sub_role,
                ],
            ]);

        return response()->json(['notes' => $notes]);
    }

    /**
     * Crée une note. Si `escalated_to` est passé, c'est une escalade explicite
     * (le rôle cible verra un badge sur l'entité dans sa liste).
     *
     * Vérifie aussi que l'entité existe — sinon on accepterait des notes orphelines.
     */
    public function storeNote(Request $request): JsonResponse
    {
        $data = $request->validate([
            'notable_type' => ['required', Rule::in([
                SupportNote::NOTABLE_COURSE,
                SupportNote::NOTABLE_USER,
                SupportNote::NOTABLE_INCIDENT,
            ])],
            'notable_id'   => ['required', 'integer', 'min:1'],
            'body'         => ['required', 'string', 'min:3', 'max:2000'],
            'escalated_to' => ['nullable', Rule::in([
                SupportNote::ESCALATED_OPS,
                SupportNote::ESCALATED_COMMERCIAL,
                SupportNote::ESCALATED_SUPER,
            ])],
        ]);

        // Vérifier que l'entité référencée existe vraiment
        $exists = match ($data['notable_type']) {
            SupportNote::NOTABLE_COURSE   => Course::whereKey($data['notable_id'])->exists(),
            SupportNote::NOTABLE_USER     => User::whereKey($data['notable_id'])->exists(),
            SupportNote::NOTABLE_INCIDENT => CourseIncident::whereKey($data['notable_id'])->exists(),
        };
        if (! $exists) {
            return response()->json(['message' => "Entité {$data['notable_type']}#{$data['notable_id']} introuvable."], 404);
        }

        $admin = $request->user()->admin;
        $note  = SupportNote::create([
            'admin_id'     => $admin->id,
            'notable_type' => $data['notable_type'],
            'notable_id'   => $data['notable_id'],
            'body'         => $data['body'],
            'escalated_to' => $data['escalated_to'] ?? null,
        ]);

        return response()->json([
            'message' => 'Note enregistrée.',
            'note'    => [
                'id'           => $note->id,
                'body'         => $note->body,
                'escalated_to' => $note->escalated_to,
                'created_at'   => $note->created_at,
                'author'       => [
                    'id'       => $admin->id,
                    'name'     => trim(($admin->first_name ?? '') . ' ' . ($admin->last_name ?? '')),
                    'sub_role' => $admin->sub_role,
                ],
            ],
        ], 201);
    }

    /**
     * Suppression : seul l'auteur OU un super-admin peut effacer.
     * Pas d'édition (immuable hors author) — si une note est fausse, on en écrit une rectificative.
     */
    public function destroyNote(Request $request, SupportNote $note): JsonResponse
    {
        $admin = $request->user()->admin;
        $isAuthor = $note->admin_id === $admin->id;
        $isSuper  = $admin->isSuper();

        if (! $isAuthor && ! $isSuper) {
            return response()->json([
                'message' => "Seul l'auteur de la note ou un super-admin peut la supprimer.",
            ], 403);
        }

        $note->delete();
        return response()->json(['message' => 'Note supprimée.']);
    }
}
