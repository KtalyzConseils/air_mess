import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Card from '../../components/ui/Card'
import PageEyebrow from '../../components/ui/PageEyebrow'
import Highlight from '../../components/Highlight'
import wordmark from '../../assets/logo/airmess-wordmark.svg'

/**
 * Conditions générales d'utilisation — page publique.
 *
 * ⚠️ Contenu PLACEHOLDER — à remplacer par le texte final validé par un avocat
 * spécialisé dans le droit numérique béninois. La structure ci-dessous couvre les
 * sections standard SaaS + spécificités "livraison" (responsabilité en cas de
 * perte/vol/dommage). Bumper `TERMS_VERSION` côté back (User::TERMS_VERSION)
 * après chaque modification substantielle : tous les utilisateurs revoient
 * automatiquement la modale d'acceptation.
 */
export default function TermsPage() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-airmess-dark text-cream px-4 md:px-6 py-3 md:py-4 border-b border-warm-600/20">
        <Link to="/" className="inline-flex items-center gap-3">
          <img src={wordmark} alt="Air Mess" className="h-6 invert" />
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <PageEyebrow label={t('legal.eyebrow')} className="mb-4" />
        <h1 className="text-h1 md:text-display-2 text-ink leading-tight mb-2">
          {t('legal.terms.title')} <Highlight>{t('legal.terms.titleHighlight')}</Highlight>
        </h1>
        <p className="text-body-l text-warm-500 mb-8">
          {t('legal.terms.subtitle')}
        </p>

        <Card variant="default" padding="lg" className="prose prose-warm max-w-none">
          <p className="text-caption text-warm-500 italic mb-6">
            {t('legal.placeholderNotice')}
          </p>

          <h2 className="text-h2 text-ink font-bold mt-6 mb-3">1. Objet</h2>
          <p className="text-body text-warm-700 leading-relaxed mb-4">
            Les présentes conditions régissent l'accès et l'utilisation de la plateforme Air Mess,
            service de mise en relation entre expéditeurs (marchands et particuliers) et livreurs
            indépendants au Bénin, exploité par KTALYZ SARL.
          </p>

          <h2 className="text-h2 text-ink font-bold mt-6 mb-3">2. Comptes utilisateurs</h2>
          <p className="text-body text-warm-700 leading-relaxed mb-4">
            L'inscription à Air Mess est soumise à la fourniture d'informations exactes et à jour.
            Chaque utilisateur est responsable de la confidentialité de ses identifiants et de
            toute activité effectuée depuis son compte.
          </p>

          <h2 className="text-h2 text-ink font-bold mt-6 mb-3">3. Règles de service — Livraisons</h2>
          <p className="text-body text-warm-700 leading-relaxed mb-4">
            Les frais de livraison, les délais et les codes de retrait/livraison sont communiqués
            lors de la création de chaque course. En cas de perte, vol ou dommage confirmés,
            Air Mess s'engage à indemniser l'expéditeur dans la limite de la valeur déclarée du
            colis renseignée lors de la création de la course.
          </p>

          <h2 className="text-h2 text-ink font-bold mt-6 mb-3">4. Paiements et wallet</h2>
          <p className="text-body text-warm-700 leading-relaxed mb-4">
            Les paiements sont opérés via Fedapay et les opérateurs Mobile Money agréés au Bénin.
            Le solde du wallet appartient à l'utilisateur et peut être retiré selon les modalités
            décrites dans son espace personnel, sous réserve des vérifications anti-fraude.
          </p>

          <h2 className="text-h2 text-ink font-bold mt-6 mb-3">5. Suspension et résiliation</h2>
          <p className="text-body text-warm-700 leading-relaxed mb-4">
            Air Mess se réserve le droit de suspendre ou de bannir tout compte en cas de fraude
            avérée, d'utilisation abusive ou de violation manifeste des présentes conditions.
            L'utilisateur peut résilier son compte à tout moment depuis son profil.
          </p>

          <h2 className="text-h2 text-ink font-bold mt-6 mb-3">6. Droit applicable</h2>
          <p className="text-body text-warm-700 leading-relaxed mb-4">
            Les présentes conditions sont régies par le droit béninois. Tout litige non résolu
            à l'amiable relève de la compétence des tribunaux de Cotonou.
          </p>

          <p className="text-caption text-warm-500 mt-8 pt-6 border-t border-warm-200">
            {t('legal.terms.lastUpdated')}
          </p>
        </Card>

        <div className="mt-8 text-center">
          <Link to="/legal/privacy" className="text-caption text-warm-600 hover:text-ink underline">
            {t('legal.readPrivacyInstead')}
          </Link>
        </div>
      </main>
    </div>
  )
}
