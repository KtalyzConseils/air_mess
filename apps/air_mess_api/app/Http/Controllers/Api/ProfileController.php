<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ProfileController extends Controller
{
    public function updateMarchant(Request $request): JsonResponse
    {
        $user = $request->user();
        $marchant = $user->marchant;

        if (! $marchant) {
            return response()->json(['message' => 'Profil marchand introuvable.'], 404);
        }

        $data = $request->validate([
            'name'             => ['required', 'string', 'max:150'],
            'phone'            => [
                'nullable',
                'string',
                'max:20',
                Rule::unique('users', 'phone')->ignore($user->id),
            ],
            'raison_sociale'   => ['required', 'string', 'max:150'],
            'ifu_rccm'         => ['nullable', 'string', 'max:100'],
            'secteur_activite' => [
                'required',
                Rule::in(['supermarche', 'restaurant', 'boutique', 'pharmacie', 'ecommerce', 'autre']),
            ],
        ]);

        DB::transaction(function () use ($user, $marchant, $data) {
            $user->update([
                'name'  => trim($data['name']),
                'phone' => isset($data['phone']) && trim($data['phone']) !== ''
                    ? trim($data['phone'])
                    : null,
            ]);

            $marchant->update([
                'raison_sociale'   => trim($data['raison_sociale']),
                'ifu_rccm'         => isset($data['ifu_rccm']) && trim($data['ifu_rccm']) !== ''
                    ? trim($data['ifu_rccm'])
                    : null,
                'secteur_activite' => $data['secteur_activite'],
            ]);
        });

        return response()->json([
            'message' => 'Profil marchand mis à jour.',
            'user'    => $user->fresh()->load(['marchant', 'individual', 'driver', 'admin']),
        ]);
    }
}
