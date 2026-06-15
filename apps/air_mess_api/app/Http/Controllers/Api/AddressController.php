<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Address;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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
        $data = $this->enrichWithCoordinates($request->validate($this->rules()));

        $address = Address::create([
            ...$data,
            'user_id' => $request->user()->id,
        ]);

        return response()->json(['address' => $address], 201);
    }

    public function update(Request $request, Address $address): JsonResponse
    {
        $this->authorizeOwnership($request, $address);
        $data = $this->enrichWithCoordinates($request->validate($this->rules()));
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
        ];
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
