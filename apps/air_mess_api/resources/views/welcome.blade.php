<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ config('app.name', 'Air Mess') }} — API</title>
    <link rel="icon" href="{{ asset('docs/favicon.svg') }}" type="image/svg+xml">

    <style>
        :root {
            --cream:        #FAF7F0;
            --ink:          #1A1614;
            --muted:        #6B6560;
            --yellow:       #FFCC00;
            --yellow-light: #FFD633;
            --red:          #D40511;
            --card:         #FFFFFF;
            --border:       rgba(26, 22, 20, 0.10);
            --panel:        #1A1614;
            --panel-soft:   #221D1A;
        }
        @media (prefers-color-scheme: dark) {
            :root {
                --cream:  #0F0D0C;
                --ink:    #EDEBE8;
                --muted:  #A1998F;
                --card:   #171412;
                --border: rgba(255, 250, 237, 0.14);
                --panel:  #000000;
                --panel-soft: #0A0A0A;
            }
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        html { -webkit-text-size-adjust: 100%; }

        body {
            font-family: "Instrument Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
            background: var(--cream);
            color: var(--ink);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1.5rem;
            -webkit-font-smoothing: antialiased;
        }

        .shell {
            width: 100%;
            max-width: 56rem;
            display: flex;
            flex-direction: column-reverse;
            border-radius: 1rem;
            overflow: hidden;
            box-shadow: 0 1px 0 0 var(--border) inset, 0 0 0 1px var(--border);
            background: var(--card);
        }
        @media (min-width: 900px) {
            .shell { flex-direction: row; }
        }

        /* ---- Colonne texte ---- */
        .content {
            flex: 1;
            padding: 2.5rem 2rem;
        }
        @media (min-width: 900px) {
            .content { padding: 3.5rem 3.25rem; }
        }

        .logo {
            height: 34px;
            width: auto;
            margin-bottom: 2rem;
        }
        .logo-dark { display: none; }
        @media (prefers-color-scheme: dark) {
            .logo-light { display: none; }
            .logo-dark  { display: block; }
        }

        h1 {
            font-size: 1.35rem;
            font-weight: 600;
            letter-spacing: -0.01em;
            margin-bottom: 0.4rem;
        }
        .lead {
            color: var(--muted);
            font-size: 0.95rem;
            line-height: 1.5;
            margin-bottom: 1.75rem;
        }

        .steps { list-style: none; margin-bottom: 1.75rem; }
        .steps li {
            position: relative;
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 0.55rem 0;
            font-size: 0.9rem;
        }
        /* ligne verticale reliant les puces */
        .steps li::before {
            content: "";
            position: absolute;
            left: 6px;
            border-left: 1px solid var(--border);
        }
        .steps li:first-child::before { top: 50%; bottom: 0; }
        .steps li:last-child::before  { top: 0; bottom: 50%; }
        .steps li:only-child::before  { display: none; }

        .dot {
            position: relative;
            z-index: 1;
            flex-shrink: 0;
            width: 13px; height: 13px;
            border-radius: 999px;
            background: var(--card);
            border: 1px solid var(--border);
            display: grid;
            place-items: center;
        }
        .dot::after {
            content: "";
            width: 6px; height: 6px;
            border-radius: 999px;
            background: var(--yellow);
        }

        a.link {
            color: var(--ink);
            font-weight: 600;
            text-decoration: underline;
            text-underline-offset: 3px;
            text-decoration-color: var(--yellow);
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }
        a.link:hover { text-decoration-color: var(--ink); }
        a.link svg { width: 10px; height: 10px; }

        .actions { display: flex; flex-wrap: wrap; gap: 0.6rem; }
        .btn {
            display: inline-block;
            padding: 0.6rem 1.15rem;
            border-radius: 0.55rem;
            font-size: 0.9rem;
            font-weight: 600;
            text-decoration: none;
            transition: transform .05s ease, filter .15s ease;
            border: 1px solid transparent;
        }
        .btn:active { transform: translateY(1px); }
        .btn-primary {
            background: var(--yellow);
            color: #1A1614;
        }
        .btn-primary:hover { filter: brightness(0.96); }
        .btn-ghost {
            background: transparent;
            color: var(--ink);
            border-color: var(--border);
        }
        .btn-ghost:hover { border-color: var(--ink); }

        .version {
            margin-top: 2rem;
            color: var(--muted);
            font-size: 0.85rem;
        }

        /* ---- Panneau de marque ---- */
        .brand {
            position: relative;
            background:
                radial-gradient(120% 120% at 80% 0%, var(--panel-soft) 0%, var(--panel) 60%);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 3rem 2rem;
            min-height: 220px;
        }
        @media (min-width: 900px) {
            .brand { width: 42%; min-height: auto; }
        }
        .brand img { width: 62%; max-width: 240px; height: auto; }
        .brand .glow {
            position: absolute;
            width: 260px; height: 260px;
            background: radial-gradient(circle, rgba(255,204,0,0.18), transparent 68%);
            filter: blur(6px);
            pointer-events: none;
        }
        .brand .tagline {
            position: absolute;
            bottom: 1.4rem;
            left: 0; right: 0;
            text-align: center;
            color: rgba(255, 250, 237, 0.55);
            font-size: 0.72rem;
            letter-spacing: 0.16em;
            text-transform: uppercase;
        }
    </style>
</head>
<body>
    <div class="shell">
        <!-- Texte -->
        <div class="content">
            <img class="logo logo-light" src="{{ asset('images/airmess-wordmark.svg') }}" alt="Air Mess">
            <img class="logo logo-dark"  src="{{ asset('images/airmess-wordmark-white.svg') }}" alt="Air Mess">

            <h1>L'API de livraison Air Mess</h1>
            <p class="lead">
                Créez et suivez vos courses par API, gérez wallets, webhooks et clés.<br>
                Pour bien démarrer&nbsp;:
            </p>

            <ul class="steps">
                <li>
                    <span class="dot"></span>
                    <span>
                        Lisez la
                        <a class="link" href="{{ url('/docs') }}" target="_blank" rel="noopener">
                            <span>Documentation de l'API</span>
                            <svg viewBox="0 0 10 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M7.70833 6.95834V2.79167H3.54167M2.5 8L7.5 3.00001" stroke="currentColor" stroke-linecap="square"/>
                            </svg>
                        </a>
                    </span>
                </li>
                <li>
                    <span class="dot"></span>
                    <span>
                        Ouvrez votre
                        <a class="link" href="{{ config('app.frontend_url') }}" target="_blank" rel="noopener">
                            <span>Espace marchand</span>
                            <svg viewBox="0 0 10 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M7.70833 6.95834V2.79167H3.54167M2.5 8L7.5 3.00001" stroke="currentColor" stroke-linecap="square"/>
                            </svg>
                        </a>
                    </span>
                </li>
            </ul>

            <div class="actions">
                <a class="btn btn-primary" href="{{ url('/docs') }}" target="_blank" rel="noopener">
                    Lire la documentation
                </a>
                <a class="btn btn-ghost" href="{{ config('app.frontend_url') }}" target="_blank" rel="noopener">
                    Accéder à l'application
                </a>
            </div>

            <p class="version">Air Mess API — Laravel v{{ app()->version() }} · PHP {{ PHP_VERSION }}</p>
        </div>

        <!-- Panneau de marque -->
        <div class="brand">
            <span class="glow"></span>
            <img src="{{ asset('images/airmess-mark-white.svg') }}" alt="">
            <span class="tagline">Logistique &amp; Livraison</span>
        </div>
    </div>
</body>
</html>
