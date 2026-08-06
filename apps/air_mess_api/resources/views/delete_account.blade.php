<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Air Mess — Suppression de compte</title>
    <link rel="icon" href="{{ asset('docs/favicon.svg') }}" type="image/svg+xml">

    <style>
        :root {
            --cream:        #FAF7F0;
            --ink:          #1A1614;
            --muted:        #6B6560;
            --yellow:       #FFCC00;
            --yellow-light: #FFD633;
            --red:          #D40511;
            --red-light:    #EF4444;
            --card:         #FFFFFF;
            --border:       rgba(26, 22, 20, 0.10);
            --panel:        #1A1614;
            --panel-soft:   #221D1A;
            --success-bg:   #DCFCE7;
            --success-text: #15803D;
            --error-bg:     #FEE2E2;
            --error-text:   #991B1B;
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
                --success-bg:   #062F1F;
                --success-text: #4ADE80;
                --error-bg:     #450A0A;
                --error-text:   #F87171;
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
            animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @media (min-width: 900px) {
            .shell { flex-direction: row; }
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.98) translateY(10px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
        }

        /* ---- Colonne texte ---- */
        .content {
            flex: 1;
            padding: 2.5rem 2rem;
        }
        @media (min-width: 900px) {
            .content { padding: 3.5rem 3.25rem; }
        }

        .logo-container {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 2rem;
        }

        .logo {
            height: 34px;
            width: auto;
        }
        .logo-dark { display: none; }
        @media (prefers-color-scheme: dark) {
            .logo-light { display: none; }
            .logo-dark  { display: block; }
        }

        .back-link {
            font-size: 0.85rem;
            color: var(--muted);
            text-decoration: none;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: color 0.2s ease;
        }
        .back-link:hover {
            color: var(--ink);
        }

        h1 {
            font-size: 1.5rem;
            font-weight: 700;
            letter-spacing: -0.01em;
            margin-bottom: 0.5rem;
            color: var(--ink);
        }
        .lead {
            color: var(--muted);
            font-size: 0.95rem;
            line-height: 1.6;
            margin-bottom: 1.75rem;
        }

        .alert {
            padding: 1rem;
            border-radius: 0.75rem;
            font-size: 0.9rem;
            line-height: 1.5;
            margin-bottom: 1.5rem;
            display: flex;
            align-items: flex-start;
            gap: 10px;
        }
        .alert-success {
            background: var(--success-bg);
            color: var(--success-text);
            border: 1px solid rgba(21, 128, 61, 0.15);
        }
        .alert-error {
            background: var(--error-bg);
            color: var(--error-text);
            border: 1px solid rgba(153, 27, 27, 0.15);
        }

        .warning-card {
            background: rgba(212, 5, 17, 0.04);
            border: 1px dashed rgba(212, 5, 17, 0.3);
            border-radius: 0.75rem;
            padding: 1.25rem;
            margin-bottom: 2rem;
            color: var(--ink);
        }
        .warning-card h3 {
            font-size: 0.95rem;
            font-weight: 700;
            color: var(--red);
            margin-bottom: 0.5rem;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .warning-card p {
            font-size: 0.85rem;
            line-height: 1.5;
            color: var(--muted);
        }

        /* ---- Formulaire ---- */
        .form-group {
            margin-bottom: 1.25rem;
        }
        .form-group label {
            display: block;
            font-size: 0.8rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--muted);
            margin-bottom: 0.4rem;
        }
        .form-control {
            width: 100%;
            height: 3.25rem;
            padding: 0 1rem;
            font-family: inherit;
            font-size: 0.95rem;
            border-radius: 0.75rem;
            border: 2px solid var(--border);
            background: var(--cream);
            color: var(--ink);
            outline: none;
            transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .form-control:focus {
            border-color: var(--yellow);
            box-shadow: 0 0 0 3px rgba(255, 204, 0, 0.2);
        }

        .checkbox-group {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            margin: 1.5rem 0 2rem 0;
            cursor: pointer;
        }
        .checkbox-group input {
            margin-top: 3px;
            width: 16px;
            height: 16px;
            accent-color: var(--red);
            cursor: pointer;
        }
        .checkbox-group span {
            font-size: 0.85rem;
            line-height: 1.4;
            color: var(--muted);
            user-select: none;
        }

        .btn {
            display: block;
            width: 100%;
            height: 3.25rem;
            border-radius: 0.75rem;
            font-size: 0.95rem;
            font-weight: 700;
            border: none;
            cursor: pointer;
            transition: background-color 0.2s ease, transform 0.05s ease;
            text-align: center;
            line-height: 3.25rem;
            text-decoration: none;
        }
        .btn-danger {
            background: var(--red);
            color: #FFFFFF;
        }
        .btn-danger:hover {
            background: var(--red-light);
        }
        .btn-danger:active {
            transform: translateY(1px);
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
            background: radial-gradient(circle, rgba(212,5,17,0.12), transparent 68%);
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
        <!-- Texte / Formulaire -->
        <div class="content">
            <div class="logo-container">
                <img class="logo logo-light" src="{{ asset('images/airmess-wordmark.svg') }}" alt="Air Mess">
                <img class="logo logo-dark"  src="{{ asset('images/airmess-wordmark-white.svg') }}" alt="Air Mess">
                <a href="{{ url('/') }}" class="back-link">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 8H4M4 8L8 4M4 8L8 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span>Retour</span>
                </a>
            </div>

            <h1>Suppression de votre compte</h1>
            <p class="lead">
                Conformément à nos conditions et à la réglementation de protection des données, vous pouvez demander la suppression complète et définitive de votre compte Air Mess.
            </p>

            @if (session('success'))
                <div class="alert alert-success">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                    </svg>
                    <div>{{ session('success') }}</div>
                </div>
            @endif

            @if ($errors->has('error'))
                <div class="alert alert-error">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                    </svg>
                    <div>{{ $errors->first('error') }}</div>
                </div>
            @endif

            @if (!session('success'))
                <div class="warning-card">
                    <h3>
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                        </svg>
                        Attention : action irréversible
                    </h3>
                    <p>
                        La suppression de votre compte entraînera la perte définitive de toutes vos données : historique de courses, informations de profil, documents d'identité ainsi que tout solde restant sur votre portefeuille ou caution.
                    </p>
                </div>

                <form action="{{ route('delete-account.destroy') }}" method="POST">
                    @csrf

                    <div class="form-group">
                        <label for="email">Adresse email</label>
                        <input type="email" id="email" name="email" class="form-control" value="{{ old('email') }}" required placeholder="votre.email@example.com">
                        @if ($errors->has('email'))
                            <span style="color: var(--red); font-size: 0.8rem; margin-top: 4px; display: block;">{{ $errors->first('email') }}</span>
                        @endif
                    </div>

                    <div class="form-group">
                        <label for="password">Mot de passe</label>
                        <input type="password" id="password" name="password" class="form-control" required placeholder="••••••••">
                        @if ($errors->has('password'))
                            <span style="color: var(--red); font-size: 0.8rem; margin-top: 4px; display: block;">{{ $errors->first('password') }}</span>
                        @endif
                    </div>

                    <label class="checkbox-group">
                        <input type="checkbox" id="confirm_deletion" name="confirm_deletion" required {{ old('confirm_deletion') ? 'checked' : '' }}>
                        <span>Je comprends que cette action est définitive et que la suppression de mes données de livraison et de mon solde de caution est immédiate.</span>
                    </label>

                    <button type="submit" class="btn btn-danger">Supprimer définitivement mon compte</button>
                </form>
            @endif
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
