import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Card from '../../components/ui/Card'
import PageEyebrow from '../../components/ui/PageEyebrow'
import Highlight from '../../components/Highlight'
import wordmark from '../../assets/logo/airmess-wordmark.svg'

/**
 * Conditions générales d'utilisation — page publique.
 *
 * ⚠️ Version 2 (2026-08-01) : projet rédigé selon les usages du droit béninois
 * (Loi n°2017-20 du 20 avril 2018 portant Code du numérique, Loi n°2009-09 du
 * 22 mai 2009 sur la protection des données à caractère personnel, Actes
 * uniformes OHADA). À relire par un avocat avant version définitive.
 * Les mentions "[À VÉRIFIER : …]" doivent être validées par l'éditeur.
 * Bumper `TERMS_VERSION` côté back après chaque modification substantielle.
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

          <h2 className="text-h2 text-ink font-bold mt-6 mb-3">1. Éditeur et objet</h2>
          <p className="text-body text-warm-700 leading-relaxed mb-4">
            La plateforme Air Mess est éditée par
            <strong> KTALYZ CONSEILS</strong>, société de droit béninois, dont le
            siège social est situé à <strong>Hindé, Cotonou</strong>,
            {/* immatriculée au Registre du Commerce et du Crédit Mobilier sous le
            numéro <strong>[À VÉRIFIER : n° RCCM]</strong>,
            IFU <strong>[À VÉRIFIER : n° IFU]</strong>. */}
          </p>
          <p className="text-body text-warm-700 leading-relaxed mb-4">
            Les présentes Conditions Générales d'Utilisation (« CGU ») ont pour
            objet de définir les modalités d'accès et d'utilisation de la
            Plateforme, qui met en relation, à titre onéreux, des expéditeurs
            (marchands et particuliers) avec des livreurs indépendants opérant
            en République du Bénin.
          </p>

          <h2 className="text-h2 text-ink font-bold mt-6 mb-3">2. Définitions</h2>
          <ul className="list-disc pl-6 mb-4 text-body text-warm-700 leading-relaxed space-y-2">
            <li><strong>Plateforme</strong> : le site web app.airmess-logistics.com et les applications mobiles Air Mess Livreur et Air Mess Marchand.</li>
            <li><strong>Utilisateur</strong> : toute personne physique ou morale disposant d'un compte, quel que soit son type (Marchand, Particulier, Livreur).</li>
            <li><strong>Marchand</strong> : professionnel titulaire d'un IFU exerçant une activité commerciale déclarée.</li>
            <li><strong>Particulier</strong> : personne physique majeure agissant à titre non professionnel.</li>
            <li><strong>Livreur</strong> : personne physique majeure exerçant une activité indépendante de coursier ou livreur, dont le compte a été validé par Air Mess après vérification documentaire.</li>
            <li><strong>Course</strong> : opération de prise en charge, transport et remise d'un colis, réservée via la Plateforme.</li>
            <li><strong>Wallet</strong> : compte de paiement interne à la Plateforme, adossé ou Mobile Money de l'Utilisateur.</li>
            <li><strong>Caution</strong> : provision financière constituée par le Livreur, prélevée sur son wallet dédié au moment de la prise en charge de la course, et libérée à sa clôture.</li>
          </ul>

          <h2 className="text-h2 text-ink font-bold mt-6 mb-3">3. Acceptation et modifications</h2>
          <p className="text-body text-warm-700 leading-relaxed mb-4">
            L'acceptation des CGU est matérialisée par la case à cocher lors
            de la création du compte. Elle vaut adhésion pleine, entière et
            sans réserve. Air Mess se réserve le droit de modifier les CGU à
            tout moment. En cas de modification substantielle, l'Utilisateur
            est invité à accepter la nouvelle version dès sa prochaine
            connexion : l'accès aux fonctionnalités du service est conditionné
            à cette acceptation.
          </p>

          <h2 className="text-h2 text-ink font-bold mt-6 mb-3">4. Description du service</h2>
          <p className="text-body text-warm-700 leading-relaxed mb-4">
            Air Mess est une plateforme de mise en relation. Les Marchands et
            Particuliers commandent des Courses en indiquant les points
            d'enlèvement et de livraison, la nature du colis et sa valeur
            déclarée. La Plateforme calcule un tarif indicatif basé sur la
            distance et attribue la Course à un Livreur disponible selon des
            règles de proximité et de performance.
          </p>
          <p className="text-body text-warm-700 leading-relaxed mb-4">
            Air Mess n'est pas partie au contrat de transport conclu entre
            l'expéditeur et le Livreur. Elle intervient en qualité
            d'intermédiaire technique et financier, garante de la bonne
            exécution du service via ses règles internes (validation,
            caution, réclamations, indemnisation forfaitaire).
          </p>

          <h2 className="text-h2 text-ink font-bold mt-6 mb-3">5. Inscription et compte</h2>
          <p className="text-body text-warm-700 leading-relaxed mb-4">
            L'inscription est ouverte aux personnes majeures. L'Utilisateur
            garantit l'exactitude des informations qu'il communique et
            s'engage à les tenir à jour. Il est seul responsable de la
            confidentialité de son mot de passe et de toute action réalisée
            depuis son compte.
          </p>
          <p className="text-body text-warm-700 leading-relaxed mb-4">
            Un même Utilisateur peut cumuler plusieurs profils (par exemple
            Livreur et Marchand), chacun soumis à sa propre procédure de
            validation. Un seul mode peut être « actif » à un instant donné.
          </p>

          <h2 className="text-h2 text-ink font-bold mt-6 mb-3">6. Vérification d'identité — Livreurs</h2>
          <p className="text-body text-warm-700 leading-relaxed mb-4">
            L'inscription des Livreurs est soumise à validation manuelle par
            Air Mess sur la base des pièces suivantes :
          </p>
          <ul className="list-disc pl-6 mb-4 text-body text-warm-700 leading-relaxed space-y-1">
            <li>pièce d'identité en cours de validité (CNI, CIP ou passeport) ;</li>
            <li>permis de conduire correspondant au véhicule déclaré, le cas échéant ;</li>
            <li>photographie personnelle ;</li>
            <li>contacts d'urgence.</li>
          </ul>
          <p className="text-body text-warm-700 leading-relaxed mb-4">
            La validation intervient sous un délai indicatif de 48 heures
            ouvrées. Air Mess peut refuser une inscription sans avoir à en
            justifier les motifs, notamment en cas de doute sur l'identité,
            l'authenticité des documents ou les antécédents.
          </p>

          <h2 className="text-h2 text-ink font-bold mt-6 mb-3">7. Obligations et comportements interdits</h2>
          <p className="text-body text-warm-700 leading-relaxed mb-4">
            L'Utilisateur s'engage à utiliser la Plateforme conformément à
            sa destination, aux présentes CGU et aux lois en vigueur. Sont
            notamment interdits :
          </p>
          <ul className="list-disc pl-6 mb-4 text-body text-warm-700 leading-relaxed space-y-1">
            <li>l'usurpation d'identité ou la création de faux comptes ;</li>
            <li>l'utilisation de la Plateforme à des fins frauduleuses, de blanchiment ou de contournement de l'ordre public ;</li>
            <li>tout comportement portant atteinte à la sécurité, à l'intégrité ou à la réputation d'un autre Utilisateur (harcèlement, menaces, propos discriminatoires) ;</li>
            <li>toute tentative d'accès non autorisé aux systèmes de la Plateforme, extraction massive de données, ou contournement des mécanismes techniques de sécurité (constitutif des infractions prévues au Livre V du Code du numérique).</li>
          </ul>

          <h2 className="text-h2 text-ink font-bold mt-6 mb-3">8. Objets interdits au transport</h2>
          <p className="text-body text-warm-700 leading-relaxed mb-4">
            Sont strictement interdits comme objet d'une Course :
          </p>
          <ul className="list-disc pl-6 mb-4 text-body text-warm-700 leading-relaxed space-y-1">
            <li>armes, munitions, explosifs, produits pyrotechniques ;</li>
            <li>stupéfiants et substances psychotropes ;</li>
            <li>animaux vivants ;</li>
            <li>matières dangereuses ou classées ADR (inflammables, corrosives, radioactives, gaz sous pression) ;</li>
            <li>espèces monétaires (sauf convention particulière avec Air Mess), lingots, valeurs négociables ;</li>
            <li>tout bien dont la détention, le transport ou la commercialisation est prohibé par la loi béninoise.</li>
          </ul>
          <p className="text-body text-warm-700 leading-relaxed mb-4">
            L'expéditeur est seul responsable de la nature du colis remis.
            Toute fausse déclaration engage sa responsabilité civile et pénale
            et prive automatiquement le colis de toute garantie ou
            indemnisation.
          </p>

          <h2 className="text-h2 text-ink font-bold mt-6 mb-3">9. Tarifs, paiements et facturation</h2>
          <p className="text-body text-warm-700 leading-relaxed mb-4">
            Les tarifs sont exprimés en francs CFA (XOF), toutes taxes comprises
            le cas échéant, et calculés en fonction de la distance, du type de
            véhicule et de paramètres réglables par Air Mess. Le prix
            définitif est affiché avant validation de la Course.
          </p>
          <p className="text-body text-warm-700 leading-relaxed mb-4">
            Les paiements sont opérés via des prestataires agréés (Fedapay,
            opérateurs Mobile Money — MTN Mobile Money, Moov Africa Money, et
            tout autre canal ajouté ultérieurement). Air Mess n'a pas accès
            aux données de paiement complètes de l'Utilisateur, qui sont
            traitées directement par ces prestataires.
          </p>
          <p className="text-body text-warm-700 leading-relaxed mb-4">
            Une facture peut être émise sur demande. Les Marchands reçoivent
            un relevé mensuel de leurs opérations, disponible dans leur espace.
          </p>

          <h2 className="text-h2 text-ink font-bold mt-6 mb-3">10. Wallet et caution Livreur</h2>
          <p className="text-body text-warm-700 leading-relaxed mb-4">
            <strong>Wallet Marchand/Particulier</strong> — l'Utilisateur peut
            approvisionner un wallet interne à la Plateforme pour régler ses
            Courses. Les fonds ne portent pas intérêt. Ils sont retirables à
            tout moment, sous réserve des vérifications anti-fraude et d'un
            délai de traitement pouvant atteindre <strong>[À VÉRIFIER : X]</strong> jours
            ouvrés.
          </p>
          <p className="text-body text-warm-700 leading-relaxed mb-4">
            <strong>Caution Livreur</strong> — pour chaque Course prise en
            charge, une caution est prélevée sur le wallet Livreur au moment
            du pickup et automatiquement libérée à la clôture de la Course.
            La caution garantit la valeur du colis en cas de perte, vol ou
            détournement imputable au Livreur. En cas d'incident, elle peut
            être partiellement ou totalement retenue selon les règles
            décrites à l'article 12.
          </p>

          <h2 className="text-h2 text-ink font-bold mt-6 mb-3">11. Responsabilité et indemnisation</h2>
          <p className="text-body text-warm-700 leading-relaxed mb-4">
            En cas de perte, vol ou détérioration d'un colis pendant une
            Course, l'expéditeur peut ouvrir un incident depuis son espace
            dans un délai de <strong>1</strong> jour  suivant la clôture
            (ou la fin annoncée) de la Course. Air Mess instruit le dossier
            et prononce, s'il y a lieu, une indemnisation forfaitaire dans la
            limite de la valeur déclarée du colis renseignée lors de la
            création de la Course, plafonnée <strong> au montant juger par l'administrateur de la plateforme </strong>.
          </p>
          <p className="text-body text-warm-700 leading-relaxed mb-4">
            L'indemnisation est exclue lorsque la déclaration est manifestement
            insincère, en cas de fausse déclaration sur la nature du colis
            (article 8), en cas de force majeure (article 14), ou lorsque
            l'expéditeur ne peut apporter aucun commencement de preuve de la
            valeur invoquée.
          </p>
          <p className="text-body text-warm-700 leading-relaxed mb-4">
            Air Mess ne saurait être tenue responsable des retards, dommages
            indirects ou pertes économiques (manque à gagner, préjudice
            d'image) subis à l'occasion d'une Course.
          </p>

          <h2 className="text-h2 text-ink font-bold mt-6 mb-3">12. Incidents et litiges entre Utilisateurs</h2>
          <p className="text-body text-warm-700 leading-relaxed mb-4">
            Tout incident (colis endommagé, contestation destinataire,
            comportement inapproprié, absence à un rendez-vous, etc.) doit
            être signalé via les outils prévus dans l'application. Air Mess
            statue au regard des éléments transmis (photos, historique de
            positions GPS, historique des échanges) et applique le cas
            échéant les mesures suivantes : ajustement du prix, retenue sur
            caution, avertissement, suspension temporaire, résiliation du
            compte.
          </p>

          <h2 className="text-h2 text-ink font-bold mt-6 mb-3">13. Propriété intellectuelle</h2>
          <p className="text-body text-warm-700 leading-relaxed mb-4">
            La marque « Air Mess », les logos, l'identité visuelle, les
            interfaces, les textes et l'ensemble des composants logiciels de
            la Plateforme sont la propriété exclusive de KTALYZ SARL ou de
            ses concédants et sont protégés par les législations sur la
            propriété intellectuelle et par la Convention de Berne. Toute
            reproduction, extraction ou réutilisation non expressément
            autorisée est interdite.
          </p>

          <h2 className="text-h2 text-ink font-bold mt-6 mb-3">14. Force majeure</h2>
          <p className="text-body text-warm-700 leading-relaxed mb-4">
            Aucune Partie ne pourra être tenue responsable d'un manquement à
            ses obligations résultant d'un cas de force majeure au sens de la
            jurisprudence : notamment coupure généralisée d'électricité ou de
            réseau, catastrophe naturelle, épidémie déclarée, émeute, grève
            générale, décision d'autorité publique rendant l'exécution du
            service impossible.
          </p>

          <h2 className="text-h2 text-ink font-bold mt-6 mb-3">15. Suspension et résiliation</h2>
          <p className="text-body text-warm-700 leading-relaxed mb-4">
            Air Mess peut suspendre ou résilier un compte, sans indemnité et
            sans préavis, en cas de manquement grave aux CGU, de fraude
            avérée, d'incidents répétés ou de comportement mettant en danger
            un autre Utilisateur. L'Utilisateur peut résilier son compte à
            tout moment depuis son espace ; les données sont ensuite
            conservées dans les conditions décrites dans la Politique de
            confidentialité.
          </p>

          <h2 className="text-h2 text-ink font-bold mt-6 mb-3">16. Données personnelles</h2>
          <p className="text-body text-warm-700 leading-relaxed mb-4">
            Le traitement des données personnelles fait l'objet d'un document
            distinct — la <Link to="/legal/privacy" className="text-warm-700 underline hover:text-ink">Politique de confidentialité</Link> —
            qui fait partie intégrante des présentes CGU.
          </p>

          <h2 className="text-h2 text-ink font-bold mt-6 mb-3">17. Loi applicable et juridiction</h2>
          <p className="text-body text-warm-700 leading-relaxed mb-4">
            Les présentes CGU sont régies par le droit béninois. Tout
            différend relatif à leur interprétation ou à leur exécution sera
            soumis, à défaut de résolution amiable dans un délai de trente
            (30) jours, à la compétence exclusive des tribunaux de Cotonou.
          </p>

          <h2 className="text-h2 text-ink font-bold mt-6 mb-3">18. Contact</h2>
          <p className="text-body text-warm-700 leading-relaxed mb-4">
            Toute demande relative aux présentes CGU peut être adressée à :
            <br />
            <strong>KTALYZ SARL — Air Mess</strong><br />
            E-mail : <strong>ktalyzconseils@gmail.com</strong><br />
            Téléphone : <strong> +229 XX XX XX XX</strong>
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
