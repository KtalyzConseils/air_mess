import { Link } from 'react-router-dom'

export default function DriverRegisterSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-airmess-dark p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-airmess-dark mb-2">Candidature reçue</h1>
          <p className="text-gray-600">
            Vos informations et documents sont en cours de vérification par notre équipe.
          </p>
        </div>

        <div className="mt-6 bg-amber-50 border-l-4 border-amber-400 p-4 rounded">
          <p className="text-sm text-amber-900">
            <strong>Prochaine étape :</strong> vous recevrez un <strong>email sous 48h</strong> dès que
            votre compte sera activé. Vous pourrez alors vous connecter à l'application Air Mess Livreur
            et commencer à accepter des courses.
          </p>
        </div>

        <div className="mt-6 bg-gray-50 p-4 rounded">
          <p className="text-sm font-semibold text-gray-700 mb-2">📱 En attendant, téléchargez l'app :</p>
          <div className="flex gap-3 justify-center">
            <span className="px-3 py-2 bg-gray-200 text-gray-500 rounded text-sm">
              Play Store (bientôt)
            </span>
            <span className="px-3 py-2 bg-gray-200 text-gray-500 rounded text-sm">
              App Store (bientôt)
            </span>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link to="/login" className="text-sm text-airmess-dark font-semibold hover:underline">
            Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  )
}
