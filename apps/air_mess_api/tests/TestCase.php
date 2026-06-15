<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\DB;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->registerSqliteMathFunctions();
    }

    /**
     * Le SQLite bundle avec le PHP de Laragon (Windows) n'a pas le module math
     * active (sqrt, sin, cos, asin, radians manquent). On les branche via PDO
     * pour que la formule Haversine de la production marche aussi en test.
     */
    private function registerSqliteMathFunctions(): void
    {
        if (DB::getDriverName() !== 'sqlite') {
            return;
        }
        $pdo = DB::getPdo();
        $pdo->sqliteCreateFunction('sin',     'sin',     1);
        $pdo->sqliteCreateFunction('cos',     'cos',     1);
        $pdo->sqliteCreateFunction('asin',    'asin',    1);
        $pdo->sqliteCreateFunction('acos',    'acos',    1);
        $pdo->sqliteCreateFunction('sqrt',    'sqrt',    1);
        $pdo->sqliteCreateFunction('pow',     'pow',     2);
        $pdo->sqliteCreateFunction('radians', 'deg2rad', 1);
        $pdo->sqliteCreateFunction('degrees', 'rad2deg', 1);
    }
}
