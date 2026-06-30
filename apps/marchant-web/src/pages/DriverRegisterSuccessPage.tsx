import { Link } from 'react-router-dom'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import wordmark from '../assets/logo/airmess-wordmark.svg'
import mark from '../assets/logo/airmess-mark.svg'

export default function DriverRegisterSuccessPage() {
  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Header minimal */}
      <div className="p-6 md:p-8">
        <Link to="/" className="inline-block">
          <img src={wordmark} alt="Air Mess" className="h-8 w-auto" />
        </Link>
      </div>

      <main className="flex-1 flex items-center justify-center px-4 pb-12">
        <Card variant="signature" padding="lg" className="max-w-lg w-full ams-anim-scale-in">
          {/* Mark décoratif + grosse coche */}
          <div className="text-center mb-6">
            <div className="relative inline-block">
              <img src={mark} alt="" aria-hidden className="h-16 w-auto opacity-20" />
              <div className="absolute inset-0 flex items-center justify-center text-display-1">
                ✅
              </div>
            </div>
          </div>

          <h1 className="text-h1 text-ink text-center">Candidature reçue</h1>
          <p className="text-body text-warm-600 text-center mt-3">
            Vos informations et documents sont en cours de vérification par notre équipe.
          </p>

          {/* Prochaine étape — encart warning chaud */}
          <div className="mt-6 bg-warning-bg border-l-4 border-warning rounded-md p-4">
            <div className="flex items-start gap-2">
              <Badge variant="warning" size="sm">Prochaine étape</Badge>
            </div>
            <p className="text-body-s text-warm-700 mt-3">
              Vous recevrez un <strong className="text-ink">email sous 48h</strong> dès que votre compte
              sera activé. Vous pourrez alors vous connecter à <strong className="text-ink">Air Mess Livreur</strong>
              {' '}et commencer à accepter des courses.
            </p>
          </div>

          {/* Téléchargement app (à venir) */}
          <div className="mt-6 bg-warm-100 rounded-md p-4">
            <p className="text-eyebrow uppercase text-warm-600 mb-3">📱 En attendant</p>
            <p className="text-body-s text-warm-600 mb-3">
              Téléchargez l'application livreur pour être prêt dès l'activation :
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <span className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-off-white border border-warm-200 text-warm-500 rounded-md text-body-s font-medium cursor-not-allowed">
                <span aria-hidden>🤖</span> Play Store
                <Badge variant="neutral" size="sm" className="ml-auto">bientôt</Badge>
              </span>
              <span className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-off-white border border-warm-200 text-warm-500 rounded-md text-body-s font-medium cursor-not-allowed">
                <span aria-hidden>🍎</span> App Store
                <Badge variant="neutral" size="sm" className="ml-auto">bientôt</Badge>
              </span>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link to="/login" className="flex-1">
              <Button variant="secondary" size="md" fullWidth>
                Retour à la connexion
              </Button>
            </Link>
            <Link to="/" className="flex-1">
              <Button variant="dark" size="md" pill fullWidth>
                Accueil →
              </Button>
            </Link>
          </div>
        </Card>
      </main>

      {/* Footer minimal */}
      <p className="text-center text-caption text-warm-400 pb-6">
        © 2026 KTALYZ — Air Mess
      </p>
    </div>
  )
}
