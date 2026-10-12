@extends('emails.layouts.base')

@section('content')
    <h1 style="margin:0 0 16px 0; font-size:24px; color:#0F172A;">
        Nouvelle réponse au formulaire commerçant
    </h1>

    <p style="margin:0 0 16px 0; line-height:1.6; font-size:15px;">
        Une nouvelle inscription vient d'être enregistrée sur la liste d'attente des commerçants.
        Le détail de toutes les réponses est disponible dans le fichier CSV joint à cet email.
    </p>

    <table cellpadding="6" cellspacing="0" border="0" style="margin:16px 0; font-size:14px; width:100%;">
        <tr>
            <td style="color:#6b7280; width:150px;">Référence</td>
            <td style="font-weight:600;">#{{ $waitlist->id }}</td>
        </tr>
        <tr>
            <td style="color:#6b7280;">Date</td>
            <td>{{ $waitlist->created_at?->format('d/m/Y à H:i') }}</td>
        </tr>
        <tr>
            <td style="color:#6b7280;">Commerce</td>
            <td>{{ $waitlist->shop_name ?: $waitlist->commerce_type }}</td>
        </tr>
        <tr>
            <td style="color:#6b7280;">Contact</td>
            <td>{{ $waitlist->contact_name ?: 'Non renseigné' }}</td>
        </tr>
        <tr>
            <td style="color:#6b7280;">Email</td>
            <td>{{ $waitlist->email }}</td>
        </tr>
        <tr>
            <td style="color:#6b7280;">WhatsApp</td>
            <td>{{ $waitlist->whatsapp ?: 'Non renseigné' }}</td>
        </tr>
        <tr>
            <td style="color:#6b7280;">Code bonus 500 F</td>
            <td style="font-weight:600;">{{ $waitlist->bonus_code }}</td>
        </tr>
    </table>

    <div style="background-color:#d1fae5; border-left:4px solid #10b981; padding:12px 16px; border-radius:6px; margin:16px 0;">
        <p style="margin:0; color:#065f46; font-size:14px;">
            <strong>Rappel :</strong> le répondant a droit à un bonus de 500 F sur sa première
            commande de livraison dès le lancement du service.
        </p>
    </div>

    <p style="margin:24px 0 0 0; line-height:1.6; font-size:13px; color:#6b7280;">
        Cet email est envoyé automatiquement à chaque nouvelle soumission du formulaire commerçant.
    </p>
@endsection
