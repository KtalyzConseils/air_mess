<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Course;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class AccountDeletionController extends Controller
{
    /**
     * Affiche le formulaire de suppression de compte.
     */
    public function show()
    {
        return view('delete_account');
    }

    /**
     * Gère la demande de suppression de compte.
     */
    public function destroy(Request $request)
    {
        $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'confirm_deletion' => ['required', 'accepted'],
        ], [
            'email.required' => 'L\'adresse email est requise.',
            'email.email' => 'L\'adresse email doit être valide.',
            'password.required' => 'Le mot de passe est requis.',
            'confirm_deletion.accepted' => 'Vous devez cocher la case pour confirmer la suppression.',
        ]);

        $user = User::where('email', $request->input('email'))->first();

        if (!$user || !Hash::check($request->input('password'), $user->password)) {
            return back()->withErrors([
                'email' => 'Identifiants incorrects. Veuillez vérifier votre adresse email et votre mot de passe.',
            ])->withInput($request->except('password'));
        }

        // Vérification des courses actives pour les marchands
        if ($user->isMarchant()) {
            $hasActiveCourses = Course::where('sender_id', $user->id)
                ->whereNotIn('status', Course::TERMINAL_STATUSES)
                ->exists();

            if ($hasActiveCourses) {
                return back()->withErrors([
                    'error' => 'Suppression impossible : vous avez des courses en cours.',
                ])->withInput($request->except('password'));
            }
        }

        // Vérification des courses actives pour les drivers
        if ($user->isDriver() && $user->driver) {
            $hasActiveCourses = Course::where('driver_id', $user->driver->id)
                ->whereNotIn('status', Course::TERMINAL_STATUSES)
                ->exists();

            if ($hasActiveCourses) {
                return back()->withErrors([
                    'error' => 'Suppression impossible : vous avez des livraisons en cours.',
                ])->withInput($request->except('password'));
            }
        }

        DB::transaction(function () use ($user) {
            // Supprime les jetons API Sanctum
            $user->tokens()->delete();
            // Supprime l'utilisateur (ceci supprime le marchand/livreur et ses adresses/wallets en cascade)
            $user->delete();
        });

        // Déconnexion de la session web si existante
        Auth::logout();
        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return redirect()->route('delete-account.show')->with('success', 'Votre compte et toutes vos données personnelles ont été supprimés définitivement de nos bases.');
    }
}
