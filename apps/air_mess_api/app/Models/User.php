<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, HasApiTokens ;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */

    public const TYPE_MARCHANT = 'marchant';
    public const TYPE_INDIVIDUAL = 'individual';
    public const TYPE_DRIVER = 'driver';
    public const TYPE_ADMIN = 'admin';

    protected $fillable = [
        'name',
        'email',
        'phone',
        'password',
        'type',
        'is_active',
        'email_verified_at',
        'phone_verified_at',
        'last_login_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'phone_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'is_active' => 'boolean',
            'password' => 'hashed',
        ];
    }

    // ===== Relations vers les profils =====

    public function marchant()
    {
        return $this->hasOne(Marchant::class);
    }

    public function individual()
    {
        return $this->hasOne(Individual::class);
    }

    public function driver()
    {
        return $this->hasOne(Driver::class);
    }

    public function admin()
    {
        return $this->hasOne(Admin::class);
    }

    /**
     * Apps dev créées par ce user (mode développeur API).
     * Un marchand OU un particulier peut en avoir.
     */
    public function apiApplications()
    {
        return $this->hasMany(ApiApplication::class);
    }

    /**
     * Wallet payeur (marchand + particulier). Créé à l'inscription, 1 par user.
     * Les drivers ont leur propre wallet (DriverWallet) — pas celui-ci.
     */
    public function wallet()
    {
        return $this->hasOne(UserWallet::class);
    }

    public function walletTransactions()
    {
        return $this->hasMany(UserWalletTransaction::class);
    }

    // ===== Helpers de type =====

    public function isMarchant(): bool   { return $this->type === self::TYPE_MARCHANT; }
    public function isIndividual(): bool { return $this->type === self::TYPE_INDIVIDUAL; }
    public function isDriver(): bool     { return $this->type === self::TYPE_DRIVER; }
    public function isAdmin(): bool      { return $this->type === self::TYPE_ADMIN; }

    /**
     * Retourne le profil associé selon le type d'utilisateur.
     */
    public function profile()
    {
        return match ($this->type) {
            self::TYPE_MARCHANT   => $this->marchant,
            self::TYPE_INDIVIDUAL => $this->individual,
            self::TYPE_DRIVER     => $this->driver,
            self::TYPE_ADMIN      => $this->admin,
        };
    }
}

