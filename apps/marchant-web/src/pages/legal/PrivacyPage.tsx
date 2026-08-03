import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Card from '../../components/ui/Card'
import PageEyebrow from '../../components/ui/PageEyebrow'
import Highlight from '../../components/Highlight'
import wordmark from '../../assets/logo/airmess-wordmark.svg'

/**
 * Politique de confidentialité — page publique.
 *
 * ⚠️ Version 2 (2026-08-01) : projet rédigé en visant la conformité à la
 * Loi n°2009-09 du 22 mai 2009 portant protection des données à caractère
 * personnel au Bénin et au Code du numérique (Loi n°2017-20 du 20 avril 2018).
 * À faire relire par un avocat / le DPO avant version définitive.
 * Les mentions "[À VÉRIFIER : …]" doivent être validées par l'éditeur.
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

          <h2 className="text-h2 text-ink font-bold mt-6 mb-3">1. Responsable du traitement</h2>
          <p className="text-body text-warm-700 leading-relaxed mb-4">
            Le responsable du traitement des données à caractère personnel
            collectées via la Plateforme Air Mess est :<br />
            <strong>KTALYZ CONSEILS</strong>, société de droit béninois, siège
            {/* social <strong>[À VÉRIFIER : adresse, Cotonou]</strong>,
            RCCM <strong>[À VÉRIFIER : n° RCCM]</strong>,
            IFU <strong>[À VÉRIFIER : n° IFU]</strong>. */}
          </p>
          <p className="text-body text-warm-700 leading-relaxed mb-4">
            Pour toute question relative à vos données personnelles, vous
            pouvez contacter notre Délégué à la Protection des Données (DPO) :
            <br />
            E-mail : <strong>ktalyzconseils@gmail.com</strong>
          </p>

          <h2 className="text-h2 text-ink font-bold mt-6 mb-3">2. Cadre légal applicable</h2>
          <p className="text-body text-warm-700 leading-relaxed mb-4">
            Le traitement de vos données est soumis à la législation
            béninoise, en particulier :
          </p>
          <ul className="list-disc pl-6 mb-4 text-body text-warm-700 leading-relaxed space-y-1">
            <li>Loi n°2009-09 du 22 mai 2009 portant protection des données à caractère personnel en République du Bénin ;</li>
            <li>Loi n°2017-20 du 20 avril 2018 portant Code du numérique en République du Bénin, notamment ses Livres IV (données personnelles) et V (cybercriminalité) ;</li>
            <li>Contrôle exercé par l'Autorité de Protection des Données à caractère Personnel (APDP) du Bénin.</li>
          </ul>

          <h2 className="text-h2 text-ink font-bold mt-6 mb-3">3. Données collectées</h2>
          <p className="text-body text-warm-700 leading-relaxed mb-4">
            <strong>Tous Utilisateurs</strong> — nom, prénom, adresse
            électronique, numéro de téléphone (vérifié par SMS), mot de passe
            (haché, jamais lisible), date de création du compte, préférences
            de langue et de notification, identifiants d'appareil pour les
            notifications push, adresse IP de connexion.
          </p>
          <p className="text-body text-warm-700 leading-relaxed mb-4">
            <strong>Marchands</strong> — raison sociale, secteur d'activité,
            IFU / RCCM, adresses de retrait fréquentes, historique des Courses
            passées.
          </p>
          <p className="text-body text-warm-700 leading-relaxed mb-4">
            <strong>Particuliers</strong> — adresses fréquentes, historique
            des Courses passées.
          </p>
          <p className="text-body text-warm-700 leading-relaxed mb-4">
            <strong>Livreurs</strong> — genre, date de naissance, pièce
            d'identité (CNI, CIP ou passeport recto/verso selon type), permis
            de conduire (voiture uniquement), photographie personnelle,
            contacts d'urgence, informations véhicule (type, marque,
            immatriculation), position GPS pendant les périodes de
            disponibilité (marche uniquement quand vous êtes « en ligne »),
            historique des Courses réalisées, statistiques de performance
            (taux d'acceptation, note, incidents).
          </p>
          <p className="text-body text-warm-700 leading-relaxed mb-4">
            <strong>Paiements</strong> — Air Mess ne stocke jamais votre
            numéro complet de carte, PIN ou code Mobile Money. Ces données
            sont traitées directement par nos prestataires de paiement
            agréés. Nous conservons uniquement un identifiant de transaction
            et le statut (succès / échec).
          </p>

          <h2 className="text-h2 text-ink font-bold mt-6 mb-3">4. Finalités et bases légales</h2>
          <ul className="list-disc pl-6 mb-4 text-body text-warm-700 leading-relaxed space-y-2">
            <li><strong>Fourniture du service</strong> (mise en relation, calcul de tarif, suivi de course, notifications) — exécution du contrat.</li>
            <li><strong>Vérification d'identité des Livreurs</strong> — obligation légale et exécution du contrat.</li>
            <li><strong>Traitement des paiements et tenue de la comptabilité</strong> — exécution du contrat et obligations fiscales et comptables.</li>
            <li><strong>Prévention de la fraude et sécurité</strong> — intérêt légitime.</li>
            <li><strong>Amélioration du service et statistiques anonymisées</strong> — intérêt légitime.</li>
            <li><strong>Envoi de messages transactionnels</strong> (statut de course, alertes de paiement) — exécution du contrat.</li>
            <li><strong>Envoi de communications commerciales</strong> — consentement, révocable à tout moment.</li>
          </ul>

          <h2 className="text-h2 text-ink font-bold mt-6 mb-3">5. Destinataires</h2>
          <p className="text-body text-warm-700 leading-relaxed mb-4">
            Vos données ne sont accessibles qu'aux personnes strictement
            habilitées au sein de KTALYZ SARL (support, opérations,
            comptabilité, développement) et à nos sous-traitants ci-dessous,
            liés par des obligations contractuelles de confidentialité.
            Certaines données sont partagées entre Utilisateurs pour la
            réalisation de la Course (nom du Livreur, numéro de téléphone
            temporairement visible, position en temps réel côté expéditeur).
          </p>
          <p className="text-body text-warm-700 leading-relaxed mb-4">
            <strong>Nous ne revendons jamais vos données à des tiers.</strong>
          </p>

          <h2 className="text-h2 text-ink font-bold mt-6 mb-3">6. Sous-traitants et prestataires</h2>
          <ul className="list-disc pl-6 mb-4 text-body text-warm-700 leading-relaxed space-y-2">
            <li><strong>Fedapay</strong> (paiements, agrégation Mobile Money) — Bénin.</li>
            <li><strong>MTN Mobile Money, Moov Africa Money</strong> — opérateurs Mobile Money agréés.</li>
            <li><strong>Google Firebase</strong> (vérification OTP téléphone, notifications push, Google Maps) — États-Unis / Europe, encadré par les clauses contractuelles types.</li>
            <li><strong>Brevo</strong> (envoi d'e-mails transactionnels et OTP) — Union européenne.</li>
            <li><strong>Hébergement infrastructure</strong> : <strong>Hostiger , USA</strong>.</li>
          </ul>

          {/* <h2 className="text-h2 text-ink font-bold mt-6 mb-3">7. Transferts hors du Bénin</h2>
          <p className="text-body text-warm-700 leading-relaxed mb-4">
            Certains de nos prestataires sont établis hors du Bénin
            (Union européenne, États-Unis). Ces transferts sont encadrés par
            des garanties appropriées : décisions d'adéquation locales,
            clauses contractuelles types, ou dispositions équivalentes prévues
            par le Code du numérique béninois. Vous pouvez obtenir copie de
            ces garanties en écrivant au DPO.
          </p> */}

          <h2 className="text-h2 text-ink font-bold mt-6 mb-3">7. Durées de conservation</h2>
          <ul className="list-disc pl-6 mb-4 text-body text-warm-700 leading-relaxed space-y-2">
            <li><strong>Compte actif</strong> : tant que le compte n'est pas supprimé.</li>
            <li><strong>Compte supprimé</strong> : anonymisation sous 30 jours des données non soumises à obligation de conservation.</li>
            <li><strong>Traces comptables et pièces justificatives</strong> (factures, Courses, transactions wallet) : 10 ans à compter de la clôture de l'exercice, conformément aux obligations fiscales et comptables.</li>
            <li><strong>Documents d'identité Livreur</strong> : conservés le temps de la validation puis chiffrés et archivés pendant la durée d'exercice de l'activité + 5 ans, en cas de contentieux ou de demande d'autorité compétente.</li>
            <li><strong>Positions GPS</strong> : supprimées 30 jours après la fin de chaque Course.</li>
            <li><strong>Journaux de connexion et logs techniques</strong> : 12 mois.</li>
            <li><strong>Cookies</strong> : voir article 12.</li>
          </ul>

          <h2 className="text-h2 text-ink font-bold mt-6 mb-3">8. Sécurité</h2>
          <p className="text-body text-warm-700 leading-relaxed mb-4">
            Nous mettons en œuvre des mesures techniques et organisationnelles
            adaptées : mots de passe hachés avec bcrypt, communications
            chiffrées en TLS 1.2 minimum, chiffrement au repos des documents
            d'identité, séparation des environnements, journalisation des
            accès administrateurs, principe du moindre privilège, sauvegardes
            régulières. En cas de violation de données susceptible d'engendrer
            un risque pour vos droits, nous notifierons l'APDP et, si
            nécessaire, les personnes concernées, dans les délais prévus par
            la loi.
          </p>

          <h2 className="text-h2 text-ink font-bold mt-6 mb-3">10. Vos droits</h2>
          <p className="text-body text-warm-700 leading-relaxed mb-4">
            Conformément à la Loi n°2009-09 et au Livre IV du Code du
            numérique, vous disposez des droits suivants sur vos données :
          </p>
          <ul className="list-disc pl-6 mb-4 text-body text-warm-700 leading-relaxed space-y-1">
            <li><strong>Droit d'accès</strong> — obtenir la confirmation qu'un traitement est effectué et une copie des données.</li>
            <li><strong>Droit de rectification</strong> — faire corriger toute donnée inexacte ou incomplète.</li>
            <li><strong>Droit à l'effacement</strong> — demander la suppression, sous réserve des données à conserver légalement.</li>
            <li><strong>Droit d'opposition</strong> — vous opposer à un traitement fondé sur l'intérêt légitime, à des fins commerciales.</li>
            <li><strong>Droit à la limitation</strong> du traitement.</li>
            <li><strong>Droit à la portabilité</strong> — recevoir vos données dans un format structuré et lisible.</li>
            <li><strong>Droit de définir des directives</strong> relatives au sort de vos données après votre décès.</li>
          </ul>
          <p className="text-body text-warm-700 leading-relaxed mb-4">
            Ces droits s'exercent auprès du DPO à l'adresse mentionnée à
            l'article 1 (une preuve d'identité pourra être demandée en cas
            de doute). Nous répondons dans un délai maximal d'un mois.
          </p>

          <h2 className="text-h2 text-ink font-bold mt-6 mb-3">11. Recours</h2>
          <p className="text-body text-warm-700 leading-relaxed mb-4">
            Si vous estimez que le traitement de vos données n'est pas
            conforme à la loi, vous pouvez introduire une réclamation auprès
            de l'Autorité de Protection des Données à caractère Personnel
            (APDP) du Bénin, ou saisir la juridiction compétente.
          </p>

          <h2 className="text-h2 text-ink font-bold mt-6 mb-3">12. Cookies et traceurs</h2>
          <p className="text-body text-warm-700 leading-relaxed mb-4">
            Le site web utilise des cookies strictement nécessaires à son
            fonctionnement (maintien de session, préférence de langue),
            exemptés de consentement. Nous n'utilisons pas actuellement de
            cookies publicitaires ni de traceurs tiers à des fins de mesure
            d'audience commerciale. Toute évolution sur ce point fera l'objet
            d'un bandeau de consentement conforme.
          </p>

          <h2 className="text-h2 text-ink font-bold mt-6 mb-3">13. Notifications push et géolocalisation</h2>
          <p className="text-body text-warm-700 leading-relaxed mb-4">
            <strong>Notifications push</strong> — envoyées via Google Firebase
            Cloud Messaging pour vous alerter d'événements liés à vos
            Courses. Vous pouvez les désactiver à tout moment depuis les
            réglages système de votre appareil.
          </p>
          <p className="text-body text-warm-700 leading-relaxed mb-4">
            <strong>Géolocalisation Livreur</strong> — active uniquement
            quand vous êtes « en ligne » ou en cours de livraison, y compris
            en tâche de fond, ce qui est nécessaire à l'attribution et au
            suivi des Courses. Vous pouvez la désactiver en repassant en mode
            hors-ligne : dans ce cas, aucune Course ne peut vous être
            proposée.
          </p>

          <h2 className="text-h2 text-ink font-bold mt-6 mb-3">14. Modifications</h2>
          <p className="text-body text-warm-700 leading-relaxed mb-4">
            La présente politique peut être modifiée pour tenir compte de
            l'évolution de la réglementation, des fonctionnalités de la
            Plateforme ou de nos pratiques. Toute modification substantielle
            est portée à votre connaissance via l'application ou par e-mail,
            et fait l'objet d'une nouvelle acceptation lorsque cela est
            requis par la loi.
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
