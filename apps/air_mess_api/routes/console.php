<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Renouvellement automatique des abos marchand : tous les jours à 8h
Schedule::command('subscription:check')
    ->dailyAt('08:00')
    ->timezone('Africa/Porto-Novo')
    ->onOneServer()       // au cas où on aurait plusieurs serveurs un jour
    ->withoutOverlapping(); // si la commande tourne déjà, ne pas la relancer
