import Navbar from './components/Navbar'
import Hero from './components/Hero'
import SocialProof from './components/SocialProof'
import HowItWorks from './components/HowItWorks'
import WalletSection from './components/WalletSection'
import Features from './components/Features'
import Audiences from './components/Audiences'
import DriverCta from './components/DriverCta'
import Faq from './components/Faq'
import Footer from './components/Footer'
import WhatsAppButton from './components/WhatsAppButton'
import LandingCommercantsPage from './pages/LandingCommercantsPage'
import LandingDriversPage from './pages/LandingDriversPage'

export default function App() {
  if (window.location.pathname === '/landing/merchants_learn') {
    return <LandingCommercantsPage />
  }

  if (window.location.pathname === '/landing/drivers_learn') {
    return <LandingDriversPage />
  }

  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <SocialProof />
        <HowItWorks />
        <WalletSection />
        <Features />
        <Audiences />
        <DriverCta />
        <Faq />
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  )
}
