import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'
import Card from '../../components/ui/Card'
import PageEyebrow from '../../components/ui/PageEyebrow'
import Highlight from '../../components/Highlight'
import wordmark from '../../assets/logo/airmess-wordmark.svg'

function LegalSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="mt-6">
      <h2 className="text-h2 text-ink font-bold mb-3">{title}</h2>
      <div className="space-y-4 text-body text-warm-700 leading-relaxed">{children}</div>
    </section>
  )
}

function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc pl-6 space-y-2">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  )
}

/**
 * Politique de confidentialite AirMess.
 *
 * Version 3 (2026-09-24) : alignee sur les apps marchand, particulier,
 * livreur, admin, API, wallet, notifications et localisation.
 * A faire relire par un conseil juridique / DPO avant publication definitive.
 */
export default function PrivacyPage() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-airmess-dark text-cream px-4 md:px-6 py-3 md:py-4 border-b border-warm-600/20">
        <Link to="/" className="inline-flex items-center gap-3">
          <img src={wordmark} alt="AirMess" className="h-6 invert" />
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <PageEyebrow label={t('legal.eyebrow')} className="mb-4" />
        <h1 className="text-h1 md:text-display-2 text-ink leading-tight mb-2">
          {t('legal.privacy.title')} <Highlight>{t('legal.privacy.titleHighlight')}</Highlight>
        </h1>
        <p className="text-body-l text-warm-500 mb-8">{t('legal.privacy.subtitle')}</p>

        <Card variant="default" padding="lg" className="prose prose-warm max-w-none">
          <p className="text-caption text-warm-500 italic mb-6">
            {t('legal.placeholderNotice')}
          </p>

          <LegalSection title="1. Responsable du traitement">
            <p>
              Le responsable du traitement des donnees personnelles collectees via
              AirMess est <strong>KTALYZ CONSEILS</strong>, a Cotonou, Republique
              du Benin.
            </p>
            <p>
              Pour toute question relative a vos donnees personnelles, vous pouvez
              ecrire a : <strong>ktalyzconseils@gmail.com</strong>.
            </p>
          </LegalSection>

          <LegalSection title="2. Cadre applicable">
            <p>
              AirMess traite les donnees personnelles conformement au droit beninois,
              notamment au Code du numerique en Republique du Benin et aux regles
              applicables a la protection des donnees a caractere personnel. L'APDP
              est l'autorite competente en matiere de controle et de recours.
            </p>
          </LegalSection>

          <LegalSection title="3. Donnees collectees">
            <p>
              Les donnees collectees dependent du role de l'utilisateur, des
              fonctionnalites utilisees et des permissions accordees.
            </p>
            <LegalList
              items={[
                <>
                  <strong>Compte et identification</strong> : nom, prenom ou nom
                  commercial, email, telephone, mot de passe chiffre, date de
                  creation, derniere connexion, type de compte, statut, version et
                  date d'acceptation des conditions.
                </>,
                <>
                  <strong>Marchands et particuliers</strong> : informations de
                  commerce ou de profil, adresses frequentes, contacts de retrait,
                  destinataires, historique de courses, preferences et documents
                  transmis au support.
                </>,
                <>
                  <strong>Livreurs</strong> : informations personnelles, photo,
                  pieces d'identite, permis si necessaire, contacts d'urgence,
                  informations vehicule, type de livreur, statut de validation,
                  disponibilite, positions GPS, courses acceptees, refusees ou
                  realisees, incidents et statistiques operationnelles.
                </>,
                <>
                  <strong>Courses</strong> : points de retrait et livraison,
                  coordonnees GPS, contacts expediteur/destinataire, type de colis,
                  taille, urgence, valeur declaree, montant a encaisser, frais,
                  statut, codes, photos optionnelles, incidents et preuves associees.
                </>,
                <>
                  <strong>Wallets et paiements</strong> : soldes, rechargements,
                  retraits, reservations, gains, cautions, transactions, references
                  de paiement, statut de paiement, methode de retrait et informations
                  strictement necessaires au traitement financier.
                </>,
                <>
                  <strong>Technique et securite</strong> : adresse IP, appareil,
                  version d'application, systeme d'exploitation, identifiants de
                  notification push, logs d'acces, actions administrateur et erreurs
                  techniques.
                </>,
              ]}
            />
          </LegalSection>

          <LegalSection title="4. Donnees de localisation">
            <p>
              La localisation est essentielle au fonctionnement d'AirMess : calcul de
              distance, affichage des points de retrait/livraison, attribution de
              courses, suivi de l'approche du livreur et resolution d'incidents.
            </p>
            <p>
              Pour les livreurs, la position peut etre collectee lorsque
              l'utilisateur est en ligne, lorsqu'une course est proposee, acceptee ou
              en cours, et, si l'autorisation systeme est accordee, en arriere-plan.
              Cette collecte en arriere-plan permet de recevoir des courses, de
              suivre une livraison active et d'assurer la securite operationnelle du
              service.
            </p>
            <p>
              Si la permission de localisation est refusee ou retiree, certaines
              fonctions peuvent etre indisponibles, notamment la reception de
              propositions de courses ou le suivi d'une livraison.
            </p>
          </LegalSection>

          <LegalSection title="5. Finalites des traitements">
            <LegalList
              items={[
                'creer, verifier et securiser les comptes utilisateurs ;',
                'creer, attribuer, suivre, annuler, archiver et facturer les courses ;',
                'mettre en relation expediteurs, destinataires, livreurs et support ;',
                'calculer les prix, encaissements, cautions, gains, retraits et ajustements ;',
                'envoyer des notifications transactionnelles, emails, SMS ou messages necessaires au service ;',
                'gerer les incidents, reclamations, fraudes, litiges et preuves ;',
                "administrer la plateforme, les roles, les droits et les journaux d'activite ;",
                "ameliorer la stabilite, la securite, la qualite et l'ergonomie des applications ;",
                'respecter les obligations comptables, fiscales, juridiques et de securite.',
              ]}
            />
          </LegalSection>

          <LegalSection title="6. Bases juridiques">
            <p>
              Selon les cas, les traitements reposent sur l'execution du contrat
              AirMess, le consentement de l'utilisateur, le respect d'obligations
              legales, l'interet legitime d'AirMess a securiser et ameliorer son
              service, ou la constatation, l'exercice et la defense de droits.
            </p>
            <p>
              Les permissions mobiles telles que notifications, camera, galerie ou
              localisation sont demandees via le systeme d'exploitation et peuvent
              etre modifiees depuis les reglages de l'appareil.
            </p>
          </LegalSection>

          <LegalSection title="7. Destinataires des donnees">
            <p>
              Les donnees sont accessibles uniquement aux personnes et services qui
              en ont besoin : operations, support, comptabilite, administration,
              developpement, securite, et utilisateurs directement concernes par une
              course.
            </p>
            <p>
              Certaines informations sont partagees entre utilisateurs pour executer
              la livraison : nom, telephone, adresse, position de course, statut,
              reference, codes ou consignes utiles. AirMess ne vend pas les donnees
              personnelles de ses utilisateurs.
            </p>
          </LegalSection>

          <LegalSection title="8. Prestataires et sous-traitants">
            <p>
              AirMess peut faire appel a des prestataires techniques, notamment pour
              l'hebergement, la base de donnees, les sauvegardes, les paiements,
              Mobile Money, emails, SMS, OTP, notifications push, cartes, recherche
              de lieux, analytics techniques, support et supervision.
            </p>
            <p>
              Ces prestataires peuvent inclure, selon les environnements actifs :
              FedaPay, operateurs Mobile Money, Firebase/Google, Expo, Brevo,
              services d'hebergement, services de cartographie et services de
              messagerie transactionnelle. Ils agissent selon leurs propres
              obligations de securite et les instructions donnees par AirMess lorsque
              cela est applicable.
            </p>
          </LegalSection>

          <LegalSection title="9. Transferts hors du Benin">
            <p>
              Certains prestataires peuvent traiter ou heberger des donnees hors du
              Benin. Lorsque c'est le cas, AirMess s'efforce de retenir des
              prestataires offrant des garanties de securite, de confidentialite et
              de protection compatibles avec la nature des donnees traitees.
            </p>
          </LegalSection>

          <LegalSection title="10. Durees de conservation">
            <LegalList
              items={[
                <>
                  <strong>Compte actif</strong> : pendant toute la duree
                  d'utilisation du service.
                </>,
                <>
                  <strong>Compte supprime</strong> : suppression ou anonymisation des
                  donnees non necessaires, sous reserve des obligations legales,
                  comptables, securitaires ou contentieuses.
                </>,
                <>
                  <strong>Courses, paiements, wallet et comptabilite</strong> :
                  conservation pendant la duree necessaire a la preuve, aux audits,
                  aux obligations fiscales/comptables et a la resolution des litiges.
                </>,
                <>
                  <strong>Pieces livreur</strong> : conservation pendant la duree de
                  validation et d'activite, puis archivage limite lorsque necessaire
                  pour la securite, la fraude ou le contentieux.
                </>,
                <>
                  <strong>Positions GPS</strong> : conservation limitee aux besoins
                  operationnels, de preuve et de support lies aux courses et
                  incidents.
                </>,
                <>
                  <strong>Logs techniques et administratifs</strong> : conservation
                  limitee aux besoins de securite, diagnostic, audit et preuve.
                </>,
              ]}
            />
          </LegalSection>

          <LegalSection title="11. Securite">
            <p>
              AirMess met en oeuvre des mesures techniques et organisationnelles
              raisonnables : chiffrement des communications, mots de passe haches,
              controle des acces, journalisation des actions sensibles, separation
              des roles, sauvegardes, surveillance des erreurs et limitation des
              acces administratifs.
            </p>
            <p>
              Aucun systeme n'est totalement exempt de risque. En cas d'incident de
              securite affectant des donnees personnelles, AirMess prend les mesures
              necessaires pour limiter l'impact, informer les personnes concernees
              lorsque la loi l'exige et cooperer avec l'autorite competente.
            </p>
          </LegalSection>

          <LegalSection title="12. Vos droits">
            <p>
              Vous pouvez demander l'acces a vos donnees, leur rectification, leur
              suppression lorsque possible, la limitation ou l'opposition a certains
              traitements, ainsi que toute information utile sur l'utilisation de vos
              donnees.
            </p>
            <p>
              Pour exercer vos droits, contactez AirMess a l'adresse indiquee a
              l'article 1. Une verification d'identite peut etre demandee pour
              proteger votre compte et eviter qu'un tiers accede a vos donnees.
            </p>
          </LegalSection>

          <LegalSection title="13. Recours">
            <p>
              Si vous estimez que vos droits ne sont pas respectes, vous pouvez
              contacter AirMess afin de rechercher une solution. Vous pouvez
              egalement vous adresser a l'Autorite de Protection des Donnees a
              caractere Personnel (APDP) du Benin ou a la juridiction competente.
            </p>
          </LegalSection>

          <LegalSection title="14. Cookies, stockage local et outils similaires">
            <p>
              Les sites et applications AirMess peuvent utiliser des cookies,
              jetons, stockage local ou stockage securise pour maintenir la session,
              retenir certaines preferences, securiser l'acces, enregistrer un token
              de notification ou ameliorer l'experience utilisateur.
            </p>
            <p>
              Si des outils de mesure d'audience ou d'analyse sont actives, ils sont
              utilises pour comprendre l'usage du service et ameliorer les parcours.
              Les reglages de consentement seront adaptes lorsque la loi ou la
              nature de l'outil l'exige.
            </p>
          </LegalSection>

          <LegalSection title="15. Camera, galerie et documents">
            <p>
              Les applications peuvent demander l'acces a la camera ou a la galerie
              pour joindre une photo de colis, une photo de profil, un document
              d'identite, un justificatif ou une preuve d'incident. Ces fichiers sont
              utilises uniquement pour la fonctionnalite demandee, la verification,
              le support ou la resolution d'un litige.
            </p>
          </LegalSection>

          <LegalSection title="16. Modifications de la politique">
            <p>
              AirMess peut modifier la presente politique pour tenir compte de
              l'evolution des applications, de la reglementation, des prestataires
              ou des pratiques internes. En cas de modification substantielle, une
              nouvelle acceptation peut etre demandee dans l'application.
            </p>
          </LegalSection>

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
