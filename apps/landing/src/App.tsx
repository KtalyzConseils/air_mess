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

export default function App() {
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
