{{--
    Vue de test du layout email — sert à `php artisan mail:test`.
    Démontre tous les éléments réutilisables (titre, paragraphe, callout,
    button, divider, code, KPI) pour itérer visuellement le design.

    Cette vue n'est PAS utilisée en production — uniquement pour le rendu
    de test. Si tu modifies `base.blade.php`, l'aperçu se met à jour ici.
--}}
@extends('emails.layouts.base', ['preheader' => 'Aperçu du layout email Air Mess — éléments réutilisables'])

@section('content')

    {{-- ===== H1 ===== --}}
    <h1 style="margin:0 0 8px 0; font-size:24px; font-weight:800; line-height:1.2; color:#1A1614; letter-spacing:-0.01em;">
        Bonjour {{ $name }} 👋
    </h1>
    <p style="margin:0 0 24px 0; font-size:14px; color:#6b7280;">
        Cette vue regroupe tous les blocs disponibles dans le layout email.
    </p>

    {{-- ===== Paragraphe standard ===== --}}
    <p style="margin:0 0 16px 0; font-size:15px; line-height:1.6; color:#1A1614;">
        Voici un <strong>paragraphe standard</strong>. Air Mess est la plateforme de livraison
        rapide pour Cotonou et le Bénin. Ce paragraphe sert à valider le rendu de la copie
        normale dans le mail : interligne, contraste, et taille de police.
    </p>

    {{-- ===== Lead (paragraphe d'intro plus large) ===== --}}
    <p style="margin:0 0 24px 0; font-size:17px; line-height:1.55; color:#1A1614; font-weight:500;">
        Tu peux utiliser une variante <em>lead</em> en augmentant la taille à 17px et le
        poids à 500 — utile pour la première phrase importante.
    </p>

    {{-- ===== H2 ===== --}}
    <h2 style="margin:32px 0 12px 0; font-size:18px; font-weight:700; color:#1A1614; padding-bottom:8px; border-bottom:1px solid #EEE8DC;">
        Titre de section (H2)
    </h2>
    <p style="margin:0 0 24px 0; font-size:15px; line-height:1.6; color:#1A1614;">
        Les H2 sont précédés d'une marge généreuse et soulignés par une fine ligne cream.
        À utiliser pour séparer les sections.
    </p>

    {{-- ===== Callout info (jaune) — utilisé quand c'est un état d'attente / info clé ===== --}}
    <div style="background-color:#FFF8DD; border-left:4px solid #FFCC00; padding:14px 18px; border-radius:6px; margin:0 0 20px 0;">
        <p style="margin:0; color:#8a6800; font-size:14px; line-height:1.5;">
            <strong>Callout info :</strong> message contextuel important (validation en attente,
            étape suivante…). Fond jaune subtil + bordure gauche jaune brand.
        </p>
    </div>

    {{-- ===== Callout warning (orange) ===== --}}
    <div style="background-color:#fef3c7; border-left:4px solid #f59e0b; padding:14px 18px; border-radius:6px; margin:0 0 20px 0;">
        <p style="margin:0; color:#92400e; font-size:14px; line-height:1.5;">
            <strong>⏳ Callout warning :</strong> action en attente, délai, vérification en cours.
        </p>
    </div>

    {{-- ===== Callout success (vert) ===== --}}
    <div style="background-color:#dcfce7; border-left:4px solid #22c55e; padding:14px 18px; border-radius:6px; margin:0 0 20px 0;">
        <p style="margin:0; color:#166534; font-size:14px; line-height:1.5;">
            <strong>✓ Callout succès :</strong> compte validé, paiement reçu, livraison effectuée.
        </p>
    </div>

    {{-- ===== Callout danger (rouge) ===== --}}
    <div style="background-color:#fee2e2; border-left:4px solid #D40511; padding:14px 18px; border-radius:6px; margin:0 0 24px 0;">
        <p style="margin:0; color:#991b1b; font-size:14px; line-height:1.5;">
            <strong>⚠ Callout danger :</strong> rejet, problème grave, suspension de compte.
        </p>
    </div>

    {{-- ===== Bloc KPI (style « facture / récap ») ===== --}}
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:24px 0; border:1px solid #EEE8DC; border-radius:8px; overflow:hidden;">
        <tr>
            <td style="padding:14px 18px; border-bottom:1px solid #EEE8DC; background-color:#FAF7F0;">
                <p style="margin:0; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; color:#6b7280; font-weight:700;">
                    Récapitulatif
                </p>
            </td>
        </tr>
        <tr>
            <td style="padding:14px 18px; border-bottom:1px solid #EEE8DC;">
                <table role="presentation" width="100%">
                    <tr>
                        <td style="font-size:14px; color:#6b7280;">Référence</td>
                        <td style="font-size:14px; color:#1A1614; font-weight:600; text-align:right; font-family:monospace;">AM-12345</td>
                    </tr>
                </table>
            </td>
        </tr>
        <tr>
            <td style="padding:14px 18px; border-bottom:1px solid #EEE8DC;">
                <table role="presentation" width="100%">
                    <tr>
                        <td style="font-size:14px; color:#6b7280;">Statut</td>
                        <td style="font-size:14px; color:#1A1614; font-weight:600; text-align:right;">Livrée</td>
                    </tr>
                </table>
            </td>
        </tr>
        <tr>
            <td style="padding:14px 18px; background-color:#FAF7F0;">
                <table role="presentation" width="100%">
                    <tr>
                        <td style="font-size:14px; color:#6b7280; font-weight:600;">Total</td>
                        <td style="font-size:18px; color:#1A1614; font-weight:800; text-align:right;">2 500 FCFA</td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    {{-- ===== Bouton primaire ===== --}}
    <p style="margin:0 0 8px 0; font-size:13px; color:#6b7280; text-transform:uppercase; letter-spacing:0.5px; font-weight:600;">
        Bouton primaire (jaune)
    </p>
    <x-emails.button :url="$frontendUrl">
        Action principale
    </x-emails.button>

    {{-- ===== Bouton danger ===== --}}
    <p style="margin:24px 0 8px 0; font-size:13px; color:#6b7280; text-transform:uppercase; letter-spacing:0.5px; font-weight:600;">
        Bouton danger
    </p>
    <x-emails.button :url="$frontendUrl" color="danger">
        Action destructrice
    </x-emails.button>

    {{-- ===== Bouton success ===== --}}
    <p style="margin:24px 0 8px 0; font-size:13px; color:#6b7280; text-transform:uppercase; letter-spacing:0.5px; font-weight:600;">
        Bouton succès
    </p>
    <x-emails.button :url="$frontendUrl" color="success">
        Confirmer
    </x-emails.button>

    {{-- ===== Divider ===== --}}
    <hr style="border:none; border-top:1px solid #EEE8DC; margin:32px 0;" />

    {{-- ===== Bloc code / référence technique ===== --}}
    <p style="margin:0 0 8px 0; font-size:13px; color:#6b7280;">
        Code de référence :
    </p>
    <div style="background-color:#FAF7F0; border:1px solid #EEE8DC; padding:10px 14px; border-radius:6px; font-family:monospace; font-size:14px; color:#1A1614; margin:0 0 20px 0; letter-spacing:0.05em;">
        REF-2026-06-30-XYZ123
    </div>

    {{-- ===== Texte secondaire (signature, mention légale) ===== --}}
    <p style="margin:24px 0 0 0; font-size:13px; line-height:1.6; color:#6b7280;">
        Texte secondaire — pour les notes de bas, signatures, mentions légales.
        Une question ? Réponds simplement à cet email.
    </p>

    <p style="margin:16px 0 0 0; font-size:13px; line-height:1.6; color:#6b7280;">
        — L'équipe Air Mess
    </p>

@endsection
