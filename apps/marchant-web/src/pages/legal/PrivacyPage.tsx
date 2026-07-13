import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Card from '../../components/ui/Card'
import PageEyebrow from '../../components/ui/PageEyebrow'
import Highlight from '../../components/Highlight'
import wordmark from '../../assets/logo/airmess-wordmark.svg'

/**
 * Politique de confidentialité — page publique.
 *
 * ⚠️ Contenu PLACEHOLDER — à faire relire par un avocat, notamment pour
 * conformité à la loi béninoise 2017-20 sur la protection des données personnelles
 * et au code numérique 2018.
 */
export default function PrivacyPage() {
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
          {t('legal.privacy.title')} <Highlight>{t('legal.privacy.titleHighlight')}</Highlight>
        </h1>
        <p className="text-body-l text-warm-500 mb-8">
          {t('legal.privacy.subtitle')}
        </p>

        <Card variant="default" padding="lg" className="prose prose-warm max-w-none">
          <p className="text-caption text-warm-500 italic mb-6">
            {t('legal.placeholderNotice')}
          </p>

          <h2 className="text-h2 text-ink font-bold mt-6 mb-3">1. Données collectées</h2>
          <p className="text-body text-warm-700 leading-relaxed mb-4">
            Nom, prénom, adresse email, numéro de téléphone, mot de passe (haché), position GPS
            (livreurs uniquement, pendant les courses), coordonnées Mobile Money, historique des
            courses et des paiements. Les documents d'identité des livreurs sont conservés le temps
            de la vérification puis chiffrés.
          </p>

          <h2 className="text-h2 text-ink font-bold mt-6 mb-3">2. Finalités</h2>
          <p className="text-body text-warm-700 leading-relaxed mb-4">
            Fournir le service de livraison, mettre en relation les parties, traiter les paiements,
            prévenir la fraude, respecter nos obligations légales et communiquer avec vous à propos
            de vos courses.
          </p>

          <h2 className="text-h2 text-ink font-bold mt-6 mb-3">3. Partage des données</h2>
          <p className="text-body text-warm-700 leading-relaxed mb-4">
            Vos données sont partagées avec les prestataires strictement nécessaires : Fedapay
            (paiements), opérateurs Mobile Money, hébergeurs (serveurs européens). Nous ne
            revendons jamais vos données à des tiers.
          </p>

          <h2 className="text-h2 text-ink font-bold mt-6 mb-3">4. Durée de conservation</h2>
          <p className="text-body text-warm-700 leading-relaxed mb-4">
            Les données de compte sont conservées tant que le compte est actif. Les traces
            comptables (transactions wallet, courses livrées) sont conservées 10 ans pour
            conformité fiscale. Les positions GPS des livreurs sont supprimées 30 jours après
            la fin de chaque course.
          </p>

          <h2 className="text-h2 text-ink font-bold mt-6 mb-3">5. Vos droits</h2>
          <p className="text-body text-warm-700 leading-relaxed mb-4">
            Vous disposez d'un droit d'accès, de rectification et de suppression de vos données.
            Vous pouvez exercer ces droits en contactant notre support depuis le menu "Aide" de
            l'application, ou par email.
          </p>

          <h2 className="text-h2 text-ink font-bold mt-6 mb-3">6. Sécurité</h2>
          <p className="text-body text-warm-700 leading-relaxed mb-4">
            Les mots de passe sont hachés avec bcrypt. Les échanges avec nos serveurs sont
            chiffrés en TLS. Les documents d'identité sont stockés dans un espace privé chiffré
            au repos.
          </p>

          <p className="text-caption text-warm-500 mt-8 pt-6 border-t border-warm-200">
            {t('legal.privacy.lastUpdated')}
          </p>
        </Card>

        <div className="mt-8 text-center">
          <Link to="/legal/terms" className="text-caption text-warm-600 hover:text-ink underline">
            {t('legal.readTermsInstead')}
          </Link>
        </div>
      </main>
    </div>
  )
}
