import { Suspense, lazy } from 'react'
import HomePage from './HomePage'

// Keep the marketing landing lean: the survey pages are only loaded when a
// visitor opens one of the /landing/* routes. This splits their large form
// logic out of the main home-page bundle.
const LandingCommercantsPage = lazy(() => import('./pages/LandingCommercantsPage'))
const LandingDriversPage = lazy(() => import('./pages/LandingDriversPage'))

function SurveyPageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-6 text-center">
      <p className="text-body text-warm-500">Chargement...</p>
    </div>
  )
}

export default function App() {
  if (window.location.pathname === '/landing/merchants_learn') {
    return (
      <Suspense fallback={<SurveyPageFallback />}>
        <LandingCommercantsPage />
      </Suspense>
    )
  }

  if (window.location.pathname === '/landing/drivers_learn') {
    return (
      <Suspense fallback={<SurveyPageFallback />}>
        <LandingDriversPage />
      </Suspense>
    )
  }

  return <HomePage />
}
