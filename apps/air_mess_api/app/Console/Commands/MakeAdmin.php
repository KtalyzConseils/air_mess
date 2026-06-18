<?php

namespace App\Console\Commands;

use App\Models\Admin;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;

class MakeAdmin extends Command
{
    protected $signature = 'airmess:make-admin
        {--name= : Nom complet}
        {--email= : Email de connexion}
        {--phone= : Téléphone}
        {--role= : Rôle admin (super, ops, commercial, support)}';

    protected $description = 'Crée un compte administrateur RMess (interactif).';

    public function handle(): int
    {
        $roles = [Admin::ROLE_SUPER, Admin::ROLE_OPS, Admin::ROLE_COMMERCIAL, Admin::ROLE_SUPPORT];

        $name  = $this->option('name')  ?: $this->ask('Nom complet');
        $email = $this->option('email') ?: $this->ask('Email de connexion');
        $phone = $this->option('phone') ?: $this->ask('Téléphone');
        $role  = $this->option('role')  ?: $this->choice('Rôle', $roles, 0);

        $password = $this->secret('Mot de passe (min. 8 caractères)');
        $confirm  = $this->secret('Confirme le mot de passe');

        if ($password !== $confirm) {
            $this->error('Les mots de passe ne correspondent pas.');
            return self::FAILURE;
        }

        $validator = Validator::make(
            compact('name', 'email', 'phone', 'role', 'password'),
            [
                'name'     => ['required', 'string', 'max:255'],
                'email'    => ['required', 'email', 'unique:users,email'],
                'phone'    => ['required', 'string', 'unique:users,phone'],
                'role'     => ['required', 'in:' . implode(',', $roles)],
                'password' => ['required', 'string', 'min:8'],
            ],
        );

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $err) {
                $this->error($err);
            }
            return self::FAILURE;
        }

        // Découpe best-effort du nom en prénom / nom.
        $parts     = preg_split('/\s+/', trim($name), 2);
        $firstName = $parts[0] ?? $name;
        $lastName  = $parts[1] ?? '';

        $user = User::create([
            'name'      => $name,
            'email'     => $email,
            'phone'     => $phone,
            'password'  => $password, // cast 'hashed' -> hashé automatiquement par le modèle
            'type'      => 'admin',
            'is_active' => true,
        ]);

        Admin::create([
            'user_id'    => $user->id,
            'first_name' => $firstName,
            'last_name'  => $lastName,
            'sub_role'   => $role,
        ]);

        $this->info("✅ Admin créé : {$email} (rôle {$role}, user #{$user->id})");

        return self::SUCCESS;
    }
}
