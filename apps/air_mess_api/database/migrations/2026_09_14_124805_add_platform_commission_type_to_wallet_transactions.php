<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Ajoute le type `platform_commission` au wallet driver : débit de la part AirMess
 * (commission) quand un livreur INDÉPENDANT livre une course "payée à la livraison"
 * (delivery_fee_paid_by=recipient).
 *
 * Contexte : sur ce type de course, le livreur encaisse en cash/mobile money la
 * TOTALITÉ du delivery_fee directement auprès du destinataire — cet argent ne
 * transite jamais par le wallet AirMess. Pour que le livreur ne garde que sa part
 * légitime (driver_commission_percent), on débite automatiquement de son wallet
 * la différence (delivery_fee - driver_earnings) au moment de la livraison.
 * Le driver n'est proposé cette course que si son wallet peut déjà couvrir ce
 * montant (cf. filtre offeredCourses/showCourse), donc le solde ne doit jamais
 * manquer en pratique — le CHECK garde quand même le signe strictement négatif.
 *
 * Ne concerne pas les livreurs "airmess" (salariés) : ils ne touchent aucune
 * commission sur ces courses, tout l'argent collecté revient à la plateforme
 * (traqué via PlatformEarning, pas via ce type de transaction).
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check');
        DB::statement(<<<'SQL'
            ALTER TABLE wallet_transactions
            ADD CONSTRAINT wallet_transactions_type_check
            CHECK (type IN (
                'deposit', 'withdraw', 'pickup_debit', 'refund', 'earning',
                'adjustment_credit', 'adjustment_debit', 'adjustment_incident',
                'platform_commission'
            ))
        SQL);

        DB::statement('ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_amount_sign_check');
        DB::statement(<<<'SQL'
            ALTER TABLE wallet_transactions
            ADD CONSTRAINT wallet_transactions_amount_sign_check
            CHECK (
                (type IN ('deposit', 'refund', 'earning', 'adjustment_credit') AND amount_fcfa > 0)
                OR
                (type IN ('withdraw', 'pickup_debit', 'adjustment_debit', 'platform_commission') AND amount_fcfa < 0)
                OR
                (type = 'adjustment_incident' AND amount_fcfa <> 0)
            )
        SQL);
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check');
        DB::statement(<<<'SQL'
            ALTER TABLE wallet_transactions
            ADD CONSTRAINT wallet_transactions_type_check
            CHECK (type IN (
                'deposit', 'withdraw', 'pickup_debit', 'refund', 'earning',
                'adjustment_credit', 'adjustment_debit', 'adjustment_incident'
            ))
        SQL);

        DB::statement('ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_amount_sign_check');
        DB::statement(<<<'SQL'
            ALTER TABLE wallet_transactions
            ADD CONSTRAINT wallet_transactions_amount_sign_check
            CHECK (
                (type IN ('deposit', 'refund', 'earning', 'adjustment_credit') AND amount_fcfa > 0)
                OR
                (type IN ('withdraw', 'pickup_debit', 'adjustment_debit') AND amount_fcfa < 0)
                OR
                (type = 'adjustment_incident' AND amount_fcfa <> 0)
            )
        SQL);
    }
};
