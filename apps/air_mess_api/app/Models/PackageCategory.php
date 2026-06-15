<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PackageCategory extends Model
{
    use HasFactory;

    protected $fillable = [
        'code', 'name', 'description',
        'max_weight_kg', 'requires_isothermal_bag', 'requires_refrigeration',
        'max_delivery_minutes', 'driver_instructions', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'max_weight_kg' => 'float',
            'requires_isothermal_bag' => 'boolean',
            'requires_refrigeration' => 'boolean',
            'is_active' => 'boolean',
        ];
    }
}
