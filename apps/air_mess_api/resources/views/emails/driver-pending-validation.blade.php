@extends('emails.layouts.base')

@section('content')
    <h1 style="margin:0 0 16px 0; font-size:24px; color:#0F172A;">
        🆕 Nouveau livreur à valider
    </h1>

    <p style="margin:0 0 16px 0; line-height:1.6; font-size:15px;">
        Un nouveau livreur vient de s'inscrire sur RMess et attend la vérification de ses documents.
    </p>

    <table cellpadding="6" cellspacing="0" border="0" style="margin:16px 0; font-size:14px; width:100%;">
        <tr>
            <td style="color:#6b7280; width:140px;">Nom complet</td>
            <td style="font-weight:600;">{{ $driver->first_name }} {{ $driver->last_name }}</td>
        </tr>
        <tr>
            <td style="color:#6b7280;">Téléphone</td>
            <td>{{ $driver->user->phone }}</td>
        </tr>
        <tr>
            <td style="color:#6b7280;">Email</td>
            <td>{{ $driver->user->email }}</td>
        </tr>
        <tr>
            <td style="color:#6b7280;">Véhicule</td>
            <td>{{ ucfirst($driver->vehicle_type) }} — plaque {{ $driver->vehicle_plate }}</td>
        </tr>
        <tr>
            <td style="color:#6b7280;">Documents fournis</td>
            <td>
                CNI ✓ · Permis ✓
                @if ($driver->photo_url) · Photo ✓ @endif
            </td>
        </tr>
    </table>

    <div style="background-color:#fef3c7; border-left:4px solid #f59e0b; padding:12px 16px; border-radius:6px; margin:16px 0;">
        <p style="margin:0; color:#92400e; font-size:14px;">
            <strong>Action requise :</strong> vérifier la CNI et le permis, puis activer le compte
            depuis le backoffice pour que le livreur puisse accepter des courses.
        </p>
    </div>

    <x-emails.button :url="$frontendUrl . '/admin/drivers'">
        Voir les livreurs à valider
    </x-emails.button>
@endsection
