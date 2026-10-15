<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Address;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Database\UniqueConstraintViolationException;
use App\Services\MapsLinkParser;

class AddressController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $addresses = Address::where('user_id', $request->user()->id)
            ->orderByDesc('usage_count')
            ->orderByDesc('updated_at')
            ->get();

        return response()->json(['addresses' => $addresses]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate($this->rules());
        $clientReference = $validated['client_reference'] ?? null;
        unset($validated['client_reference']);

        $data = $this->enrichWithCoordinates($validated);
        $userId = $request->user()->id;

        // Sans reference d'appel : comportement historique (creation systematique).
        if ($clientReference === null) {
            $address = Address::create([...$data, 'user_id' => $userId]);

            return response()->json(['address' => $address], 201);
        }

        // Idempotence : la meme reference ne cree qu'une adresse. Le rejeu d'une
        // requete deja aboutie renvoie l'adresse existante (200) sans ecrire.
        $existing = $this->findByClientReference($userId, $clientReference);
        if ($existing) {
            return response()->json(['address' => $existing], 200);
        }

        try {
            $address = Address::create([
                ...$data,
                'user_id' => $userId,
                'client_reference' => $clientReference,
            ]);
        } catch (UniqueConstraintViolationException $exception) {
            // Deux requetes simultanees avec la meme reference : la base tranche,
            // on renvoie celle qui a gagne au lieu d'une 500.
            $address = $this->findByClientReference($userId, $clientReference);
            if (! $address) {
                throw $exception;
            }

            return response()->json(['address' => $address], 200);
        }

        return response()->json(['address' => $address], 201);
    }

    public function update(Request $request, Address $address): JsonResponse
    {
        $this->authorizeOwnership($request, $address);
        $data = $this->enrichWithCoordinates($request->validate($this->rules()));
        // La reference d'appel sert uniquement a la creation : un PATCH ne doit
        // pas reecrire la cle d'idempotence de l'adresse.
        unset($data['client_reference']);
        $address->update($data);
        return response()->json(['address' => $address->fresh()]);
    }


    public function destroy(Request $request, Address $address): JsonResponse
    {
        $this->authorizeOwnership($request, $address);
        $address->delete();
        return response()->json(['message' => 'Adresse supprimée.']);
    }

    private function authorizeOwnership(Request $request, Address $address): void
    {
        if ($address->user_id !== $request->user()->id) {
            abort(403, 'Cette adresse ne vous appartient pas.');
        }
    }

    private function rules(): array
    {
        return [
            'label'           => ['nullable', 'string', 'max:100'],
            'recipient_name'  => ['required', 'string', 'max:150'],
            'recipient_phone' => ['required', 'string', 'max:20'],
            'street'          => ['nullable', 'string', 'max:255'],
            'landmark'        => ['nullable', 'string', 'max:255'],
            'quartier'        => ['required', 'string', 'max:100'],
            'city'            => ['required', 'string', 'max:100'],
            'maps_link'       => ['nullable', 'string', 'max:1000'],
            'instructions'    => ['nullable', 'string'],
            'is_default'      => ['boolean'],
            'client_reference' => ['nullable', 'string', 'max:64'],
        ];
    }

    private function findByClientReference(int $userId, string $clientReference): ?Address
    {
        return Address::where('user_id', $userId)
            ->where('client_reference', $clientReference)
            ->first();
    }

    /**
     * À partir des données validées, complète lat/lng si maps_link parsable.
     */
    private function enrichWithCoordinates(array $data): array
    {
        $coords = MapsLinkParser::parse($data['maps_link'] ?? null);
        if ($coords) {
            $data['lat'] = $coords['lat'];
            $data['lng'] = $coords['lng'];
        } else {
            // si pas de lien (ou non parsable), on reset pour pas garder d'anciennes coords incorrectes
            $data['lat'] = null;
            $data['lng'] = null;
        }
        return $data;
    }
}
