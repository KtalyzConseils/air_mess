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
 * Conditions generales d'utilisation AirMess.
 *
 * Version 3 (2026-09-24) : texte aligne sur les flux actuels :
 * marchand/particulier, livreur, admin, wallet, caution, paiement par destinataire
 * par defaut, geolocalisation et notifications.
 * A faire relire par un conseil juridique avant publication definitive.
 */
export default function TermsPage() {
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
          {t('legal.terms.title')} <Highlight>{t('legal.terms.titleHighlight')}</Highlight>
        </h1>
        <p className="text-body-l text-warm-500 mb-8">{t('legal.terms.subtitle')}</p>

        <Card variant="default" padding="lg" className="prose prose-warm max-w-none">
          <p className="text-caption text-warm-500 italic mb-6">
            {t('legal.placeholderNotice')}
          </p>

          <LegalSection title="1. Editeur et objet">
            <p>
              AirMess est exploite par <strong>KTALYZ CONSEILS</strong>, a Cotonou,
              Republique du Benin. Les presentes conditions generales encadrent
              l'acces et l'utilisation de la plateforme AirMess, incluant le site
              web marchand et administrateur, l'application mobile marchand
              AirMess, l'application mobile livreur, les services API et les
              services de support associes.
            </p>
            <p>
              AirMess organise la creation, l'attribution, le suivi et la
              supervision de courses de livraison entre expediteurs, destinataires
              et livreurs. L'utilisation du service implique l'acceptation des
              presentes conditions et de la{' '}
              <Link to="/legal/privacy" className="underline hover:text-ink">
                politique de confidentialite
              </Link>.
            </p>
          </LegalSection>

          <LegalSection title="2. Roles sur la plateforme">
            <LegalList
              items={[
                <>
                  <strong>Marchand</strong> : professionnel ou commerce utilisant
                  AirMess pour creer et suivre des courses, gerer ses adresses,
                  son wallet, ses encaissements et ses retraits.
                </>,
                <>
                  <strong>Particulier</strong> : utilisateur non professionnel
                  pouvant creer et suivre des courses depuis les interfaces
                  AirMess ouvertes a cet usage.
                </>,
                <>
                  <strong>Livreur independant</strong> : coursier valide par
                  AirMess, utilisant son propre moyen de transport, disposant
                  d'un wallet caution et recevant des propositions de courses
                  selon son profil, sa position et son solde disponible.
                </>,
                <>
                  <strong>Livreur AirMess</strong> : livreur autorise par AirMess
                  a traiter certaines courses sensibles, notamment les courses a
                  frais payes par le destinataire et les courses a forte valeur,
                  selon les regles operationnelles internes.
                </>,
                <>
                  <strong>Administrateur</strong> : utilisateur habilite par
                  AirMess a superviser les comptes, les courses, les incidents,
                  les wallets, les retraits, les parametres et les journaux
                  d'activite.
                </>,
                <>
                  <strong>Destinataire</strong> : personne recevant le colis. Il
                  peut etre amene a payer les frais de livraison ou le montant du
                  colis a la remise lorsque la course le prevoit.
                </>,
              ]}
            />
          </LegalSection>

          <LegalSection title="3. Compte, verification et securite">
            <p>
              L'utilisateur doit fournir des informations exactes, a jour et
              verifiables. AirMess peut demander une verification par telephone,
              email, SMS, code OTP ou tout autre moyen raisonnable.
            </p>
            <p>
              Les livreurs doivent fournir les informations et pieces requises :
              identite, telephone, photo, informations du vehicule, permis lorsque
              necessaire, contacts d'urgence et, le cas echeant, tout justificatif
              utile a la validation du compte. AirMess peut accepter, refuser,
              suspendre ou reactiver un profil livreur selon ses controles de
              securite, de conformite et de qualite de service.
            </p>
            <p>
              Chaque utilisateur est responsable de la confidentialite de ses
              identifiants. Toute action realisee depuis un compte authentifie est
              reputee effectuee par son titulaire, sauf preuve contraire.
            </p>
          </LegalSection>

          <LegalSection title="4. Creation et execution d'une course">
            <p>
              Pour creer une course, l'expediteur renseigne notamment le type de
              colis, les informations de retrait, les informations du destinataire,
              les positions de retrait et de livraison, l'urgence, la valeur
              declaree lorsqu'elle est utile, et les options d'encaissement.
            </p>
            <p>
              La course suit plusieurs etapes : creation, attente d'attribution,
              acceptation par un livreur, deplacement vers le point de retrait,
              prise en charge, livraison, validation ou incident. Des codes de
              retrait, livraison ou retour peuvent etre utilises pour securiser
              certaines etapes.
            </p>
            <p>
              AirMess peut refuser, bloquer, reattribuer, archiver ou annuler une
              course lorsqu'elle est incomplete, frauduleuse, dangereuse, impossible
              a executer ou contraire aux presentes conditions.
            </p>
          </LegalSection>

          <LegalSection title="5. Prix, paiement et encaissement">
            <p>
              Les prix sont affiches en francs CFA (XOF). Le montant de livraison
              est calcule selon les parametres AirMess, notamment la distance, le
              minimum tarifaire, l'urgence, les plafonds et les reglages
              administratifs applicables.
            </p>
            <p>
              Par defaut, les frais de livraison sont payes par le destinataire a
              la remise. Si le marchand ou l'expediteur coche l'option
              <strong> "Je paie moi-meme la livraison"</strong>, les frais sont
              factures au compte de l'expediteur, via wallet ou paiement direct
              selon le solde disponible et le parcours propose.
            </p>
            <p>
              Une course peut aussi prevoir un <strong>encaissement a la livraison</strong>.
              Dans ce cas, le livreur collecte aupres du destinataire le montant
              indique pour le colis, et, lorsque les frais de livraison sont a la
              charge du destinataire, le total peut comprendre le montant du colis
              et les frais de livraison.
            </p>
            <p>
              Les paiements et rechargements peuvent etre traites par des
              prestataires tiers tels que FedaPay, Mobile Money ou tout autre canal
              active par AirMess. AirMess ne demande jamais le code PIN Mobile Money
              ni les donnees completes de carte bancaire.
            </p>
          </LegalSection>

          <LegalSection title="6. Wallets, cautions et retraits">
            <p>
              AirMess utilise des wallets pour suivre les soldes, rechargements,
              paiements de courses, gains, cautions, retraits et ajustements. Un
              wallet ne constitue pas un compte bancaire et ne produit pas
              d'interets.
            </p>
            <p>
              Les marchands et particuliers peuvent recharger leur wallet et
              demander un retrait selon les limites, delais et controles en vigueur.
              AirMess peut bloquer temporairement un retrait en cas d'anomalie,
              suspicion de fraude, course ouverte, transaction en attente ou besoin
              de verification.
            </p>
            <p>
              Les livreurs independants peuvent devoir maintenir une caution ou un
              solde suffisant. Cette caution peut etre reservee, debitee, liberee ou
              ajustee selon les courses, incidents, retraits et arbitrages. Le
              livreur AirMess peut etre soumis a un regime operationnel distinct.
            </p>
          </LegalSection>

          <LegalSection title="7. Obligations des expediteurs">
            <LegalList
              items={[
                'renseigner des informations exactes sur le colis, la valeur declaree, les contacts et les adresses ;',
                'etre disponible au point de retrait ou designer une personne habilitee ;',
                'ne pas remettre de colis interdit, dangereux, illicite ou mal emballe ;',
                'payer ou faire payer les montants dus selon le mode choisi ;',
                'signaler rapidement tout incident depuis les outils prevus.',
              ]}
            />
          </LegalSection>

          <LegalSection title="8. Obligations des livreurs">
            <LegalList
              items={[
                "fournir des informations d'inscription exactes et conserver ses documents a jour ;",
                'respecter le code de la route, les regles de securite et les consignes raisonnables de livraison ;',
                "activer la geolocalisation necessaire lorsqu'il est disponible ou en course ;",
                'ne pas conserver, detourner, ouvrir ou endommager un colis ;',
                "utiliser les codes et actions d'application uniquement pour la course concernee ;",
                'remettre les montants encaisses et respecter les procedures de cloture, retour ou incident.',
              ]}
            />
          </LegalSection>

          <LegalSection title="9. Colis interdits ou soumis a restriction">
            <p>Sont interdits, sauf accord ecrit specifique d'AirMess lorsque la loi le permet :</p>
            <LegalList
              items={[
                'armes, munitions, explosifs, produits inflammables ou dangereux ;',
                'stupéfiants, substances psychotropes, produits contrefaits ou illicites ;',
                'animaux vivants, denrees perissables non adaptees au transport declare, produits medicaux sensibles sans autorisation ;',
                'argent liquide, bijoux, valeurs negotiables ou objets de tres forte valeur sans validation prealable ;',
                'tout bien dont la detention, le transport ou la remise est interdit par la loi applicable.',
              ]}
            />
            <p>
              L'expediteur reste responsable de la nature du colis. Une fausse
              declaration peut entrainer l'annulation de la course, la suspension du
              compte, la perte de toute indemnisation et, si necessaire, un
              signalement aux autorites competentes.
            </p>
          </LegalSection>

          <LegalSection title="10. Annulation, echec, retour et incident">
            <p>
              Une course peut etre annulee par l'expediteur, le livreur ou AirMess
              selon son etat d'avancement. Des frais peuvent rester dus lorsque le
              livreur s'est deplace, a pris en charge le colis ou qu'un retour est
              necessaire.
            </p>
            <p>
              En cas d'absence, refus du destinataire, adresse incorrecte, colis
              endommage, perte, vol, contestation d'encaissement ou comportement
              abusif, AirMess peut ouvrir ou arbitrer un incident. L'arbitrage peut
              entrainer un ajustement de wallet, une retenue sur caution, un
              remboursement partiel, une suspension ou toute mesure proportionnee.
            </p>
            <p>
              Les preuves examinees peuvent inclure les statuts de course, photos,
              positions GPS, historiques d'actions, notifications, appels support et
              informations transmises par les parties.
            </p>
          </LegalSection>

          <LegalSection title="11. API, integrations et comptes professionnels">
            <p>
              AirMess peut proposer des cles API et plans d'utilisation permettant a
              des marchands ou partenaires de creer des courses depuis leurs propres
              outils. L'utilisateur d'une cle API est responsable de sa conservation,
              de ses appels, des donnees transmises et du respect des limites de son
              plan.
            </p>
            <p>
              AirMess peut suspendre une cle ou une integration en cas d'abus,
              depassement, faille de securite, tentative de fraude ou atteinte a la
              stabilite du service.
            </p>
          </LegalSection>

          <LegalSection title="12. Notifications, localisation et permissions">
            <p>
              Les applications peuvent demander l'autorisation d'envoyer des
              notifications pour signaler les nouvelles courses, changements de
              statut, paiements, retraits, incidents et messages importants.
            </p>
            <p>
              L'application livreur utilise la geolocalisation, y compris en arriere
              plan lorsque le livreur est en ligne ou en course, afin d'attribuer les
              courses, suivre l'approche, securiser la livraison et aider le support
              en cas d'incident. Le livreur peut se mettre hors ligne ou retirer les
              permissions systeme, mais cela peut empecher la reception ou
              l'execution des courses.
            </p>
          </LegalSection>

          <LegalSection title="13. Suspension, restriction et suppression de compte">
            <p>
              AirMess peut restreindre, suspendre ou supprimer un compte en cas de
              fraude, impaye, usage abusif, comportement dangereux, pieces invalides,
              incident grave, atteinte au systeme ou violation des presentes
              conditions.
            </p>
            <p>
              L'utilisateur peut demander la suppression de son compte depuis les
              outils prevus ou via le support. Certaines donnees peuvent rester
              conservees lorsque la loi, la comptabilite, la prevention de la fraude,
              la resolution d'un litige ou la securite des courses l'exigent.
            </p>
          </LegalSection>

          <LegalSection title="14. Responsabilite">
            <p>
              AirMess fournit une plateforme technique et operationnelle de mise en
              relation, de suivi, de paiement et de supervision. AirMess met en
              oeuvre des moyens raisonnables pour assurer le fonctionnement du
              service, mais ne garantit pas l'absence totale d'interruption, de
              retard, d'erreur de reseau, d'indisponibilite d'un prestataire tiers ou
              de force majeure.
            </p>
            <p>
              AirMess ne peut etre tenue responsable des dommages indirects, pertes
              commerciales, pertes d'exploitation, prejudices d'image ou consequences
              d'une mauvaise declaration, d'un emballage insuffisant, d'un colis
              interdit ou d'une information erronee fournie par l'utilisateur.
            </p>
          </LegalSection>

          <LegalSection title="15. Donnees personnelles">
            <p>
              Les traitements de donnees personnelles sont decrits dans la{' '}
              <Link to="/legal/privacy" className="underline hover:text-ink">
                Politique de confidentialite
              </Link>, qui fait partie integrante des presentes conditions.
            </p>
          </LegalSection>

          <LegalSection title="16. Droit applicable et reglement des differends">
            <p>
              Les presentes conditions sont regies par le droit beninois. En cas de
              litige, les parties rechercheront d'abord une solution amiable avec le
              support AirMess. A defaut d'accord, le differend pourra etre porte
              devant les juridictions competentes de Cotonou, sous reserve des
              regles imperatives applicables.
            </p>
          </LegalSection>

          <LegalSection title="17. Contact">
            <p>
              Pour toute question relative aux presentes conditions :
              <br />
              <strong>KTALYZ CONSEILS - AirMess</strong>
              <br />
              Email : <strong>ktalyzconseils@gmail.com</strong>
              <br />
              Site : <strong>app.airmess-logistics.com</strong>
            </p>
          </LegalSection>

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
