<?php

namespace Database\Seeders;

use App\Models\Course;
use App\Models\User;
use Illuminate\Database\Seeder;

/** Données de démonstration locales, sans observer ni envoi de notification. */
class UnassignedSortDemoSeeder extends Seeder
{
    public function run(): void
    {
        if (config('app.env') !== 'local') {
            throw new \RuntimeException('Ce seeder est réservé à la base locale.');
        }

        $sender = User::whereIn('type', ['marchant', 'individual'])->firstOrFail();
        $stamp = now()->format('ymdHis');
        $now = now();

        Course::withoutEvents(function () use ($sender, $stamp, $now) {
            foreach ([6, 1, 3, 19, 13, 16] as $index => $hours) {
                $reference = 'TRI-'.$stamp.'-'.$index;
                Course::factory()->create([
                    'reference' => $reference,
                    'sender_id' => $sender->id,
                    'driver_id' => null,
                    'status' => Course::STATUS_AWAITING,
                    'urgency' => 'standard',
                    'offer_broadcasted_at' => $now->copy()->subHours($hours),
                    'created_at' => $now->copy()->subHours($hours + 1),
                    'offer_alerts_sent' => [],
                    'origin_name' => 'TEST TRI — diffusion il y a '.$hours.' h',
                    'origin_quartier' => 'TEST TRI '.$hours.' h — Cadjèhoun',
                    'destination_quartier' => 'Fidjrossè',
                    'package_description' => 'Démonstration locale du tri des diffusions, ne pas livrer.',
                    'has_collection' => false,
                    'collection_amount' => null,
                    'collection_method' => null,
                    'paid_from_wallet' => false,
                ]);
                $this->command?->info($reference.' — '.($hours < 12 ? 'Nouvelle' : 'À surveiller').' — '.$hours.' h');
            }
        });
    }
}
