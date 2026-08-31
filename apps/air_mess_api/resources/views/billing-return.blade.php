<!doctype html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Retour vers AirMess</title>
    <style>
        body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #fdfcf9; color: #1a1614; font-family: Arial, sans-serif; }
        main { max-width: 420px; padding: 32px; text-align: center; }
        a { display: inline-block; margin-top: 20px; padding: 15px 22px; border-radius: 14px; background: #ffcc00; color: #1a1614; font-weight: 700; text-decoration: none; }
    </style>
</head>
<body>
    <main>
        <h1>Paiement traité</h1>
        <p>Retour automatique vers l'application AirMess…</p>
        <a href="{{ $appUrl }}">Revenir dans AirMess</a>
    </main>
    <script>
        window.location.replace(@json($appUrl));
    </script>
</body>
</html>
