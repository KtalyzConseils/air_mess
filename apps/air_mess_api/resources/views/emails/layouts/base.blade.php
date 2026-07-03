{{--
    Layout email Air Mess
    --------------------
    Les emails utilisent des `<table>` car les clients (Outlook, Yahoo, Gmail iOS…)
    ne supportent pas `flex`/`grid`. Tous les styles sont INLINE — les `<style>`
    sont nettoyés par Gmail dans les threads forwardés.

    Variables :
      $subject  : titre <title> + sujet inbox (fallback "Air Mess")
      $preheader: texte d'aperçu inbox (caché visuellement)
      $slot     : contenu si appel composant
      @section('content') : contenu si appel extends

    Logos : servis par URL absolue via asset(). Cela nécessite que APP_URL soit
    configuré sur le domaine public de prod (ex: https://api.airmess-logistics.com).
    On garde une double-image :
      - un logo signature "mark" (36×36)
      - un wordmark blanc (h:24, largeur auto)
    Un fallback texte est prévu pour Outlook desktop (qui ne rend pas les SVG) —
    on peut plus tard générer des variantes .png si un support Outlook parfait
    devient nécessaire.
--}}
@php
    $markUrl = asset('images/airmess-mark.svg');
    $wordmarkUrl = asset('images/airmess-wordmark-white.svg');
@endphp
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light only">
    <meta name="supported-color-schemes" content="light only">
    <title>{{ $subject ?? 'Air Mess' }}</title>
    {{-- Manrope via Google Fonts (rendu sur Apple Mail, Gmail web, iOS Mail ; --}}
    {{-- les autres clients tomberont sur la pile système — c'est OK, c'est cohérent.) --}}
    <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;700;800&display=swap" rel="stylesheet">
</head>
<body style="margin:0; padding:0; background-color:#FAF7F0; font-family:'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color:#1A1614; -webkit-text-size-adjust:100%;">

    {{-- Preheader : aperçu inbox, masqué visuellement --}}
    @if (! empty($preheader))
        <div style="display:none; max-height:0; overflow:hidden; mso-hide:all; opacity:0; color:transparent; height:0; width:0;">
            {{ $preheader }}
        </div>
    @endif

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#FAF7F0;">
        <tr>
            <td align="center" style="padding: 32px 16px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px; background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow: 0 1px 3px rgba(26,22,20,0.08);">

                    {{-- ===========================================================
                         Header — airmess-dark + logos SVG (mark + wordmark blanc)
                         Les images sont servies via URL absolue (asset() → APP_URL).
                         APP_URL doit pointer vers le domaine public de l'API en prod
                         (ex: https://api.airmess-logistics.com). Si APP_URL vaut
                         localhost, les images n'apparaîtront pas dans un vrai envoi.

                         Pourquoi <img src=".svg"> plutôt que <svg> inline ?
                         → Gmail (web + mobile) STRIPPE toute balise <svg> inline
                           pour raison de sécurité — le SVG inline reste vide.
                         → SVG via <img src> est supporté par Gmail, Yahoo, Apple
                           Mail. Outlook desktop ne rend pas le SVG mais garde
                           l'alt text et le layout — dégrade proprement.
                         =========================================================== --}}
                    <tr>
                        <td style="background-color:#1A1614; padding:28px 32px;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td style="vertical-align:middle;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                            <tr>
                                                {{-- Mark : <img> avec URL absolue --}}
                                                <td style="vertical-align:middle; padding-right:12px; line-height:0;">
                                                    <img src="{{ $markUrl }}" alt="Air Mess" width="36" height="36" style="display:block; width:36px; height:36px; border:0; outline:none;">
                                                </td>
                                                {{-- Wordmark : <img> avec URL absolue, hauteur 24, largeur auto --}}
                                                <td style="vertical-align:middle; line-height:0;">
                                                    <img src="{{ $wordmarkUrl }}" alt="Air Mess" height="24" style="display:block; height:24px; width:auto; border:0; outline:none;">
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding-top:8px;">
                                        <p style="margin:0; color:#9ca3af; font-size:12px; font-weight:500; font-family:'Manrope', Arial, sans-serif;">
                                            Plateforme de livraison · Bénin
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    {{-- Accent jaune signature — barre fine 4px sous le header --}}
                    <tr>
                        <td style="height:4px; background-color:#FFCC00; font-size:0; line-height:0;">&nbsp;</td>
                    </tr>

                    {{-- ===========================================================
                         Contenu
                         =========================================================== --}}
                    <tr>
                        <td style="padding: 36px 32px; font-size:15px; line-height:1.6; color:#1A1614;">
                            {{ $slot ?? '' }}
                            @yield('content')
                        </td>
                    </tr>

                    {{-- ===========================================================
                         Footer
                         =========================================================== --}}
                    <tr>
                        <td style="padding:20px 32px; background-color:#FAF7F0; border-top: 1px solid #EEE8DC;">
                            <p style="margin:0 0 6px 0; font-size:12px; color:#6b7280; line-height:1.5;">
                                Cet email a été envoyé automatiquement par Air Mess.
                                Si vous n'êtes pas à l'origine de cette action, vous pouvez l'ignorer.
                            </p>
                            <p style="margin:0; font-size:11px; color:#9ca3af;">
                                © {{ date('Y') }} Air Mess · KTALYZ · Cotonou, Bénin
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
