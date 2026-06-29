const en = {
  nav: {
    howItWorks: 'How it works',
    features: 'Features',
    drivers: 'For couriers',
    faq: 'FAQ',
    login: 'Log in',
    cta: 'Create a delivery',
  },
  hero: {
    eyebrow: 'Built for merchants in Cotonou',
    titleLine1: 'You sell.',
    titleHighlight: 'We deliver.',
    titleLine2: '',
    subtitle:
      'AirMess orchestrates the delivery of your orders across Cotonou. Your customers track every run live, all the way to their door. You focus on selling.',
    ctaSender: 'Create a delivery',
    ctaDriver: 'Become a courier',
    price: 'Delivery from 500 FCFA',
    example:
      'You sell a product? Create a run, share the tracking link with your customer — AirMess handles the delivery.',
    stats: {
      deliveries: 'Deliveries completed',
      pickup: 'Avg. pickup time',
      cities: 'Cities covered',
    },
    live: {
      tag: 'Live course',
      pickup: 'Pickup',
      pickupValue: 'Ganhi Market',
      dropoff: 'Drop-off',
      dropoffValue: 'Fidjrossè, Cotonou',
      courier: 'Kossi is on the way',
      eta: 'ETA',
      etaValue: '12 min',
      distance: 'Distance',
      distanceValue: '4.2 km',
    },
  },
  social: {
    title: 'Trusted by merchants across Cotonou',
  },
  how: {
    eyebrow: 'The route',
    title: 'Three stops, door to door.',
    steps: [
      {
        title: 'Create a course',
        body: 'Enter the pickup and drop-off addresses, the package size, and confirm. You get a price upfront.',
      },
      {
        title: 'A courier picks it up',
        body: 'The closest available courier accepts and heads to the pickup point. No waiting on the line.',
      },
      {
        title: 'Track to delivery',
        body: 'Follow the courier live on the map and share a tracking link. Pay securely when it arrives.',
      },
    ],
  },
  wallet: {
    eyebrow: 'Integrated cash-in',
    title: 'We deliver. We collect. We pay you out.',
    body: 'The courier collects payment from your customer — in cash or Mobile Money — and confirms it in the app. Your merchant wallet is credited automatically, net of commission. Withdraw to your Mobile Money account whenever you want.',
    steps: ['The courier collects', 'Your wallet is credited', 'You withdraw on demand'],
    protect: 'You no longer chase your money.',
    momo: 'Works with MTN Mobile Money and Moov Money.',
  },
  features: {
    eyebrow: 'What you get',
    title: 'Built for fast, accountable delivery.',
    items: [
      { title: 'Real-time tracking', body: 'Watch every course move on the map, from pickup to drop-off.' },
      { title: 'Instant notifications', body: 'Get alerted at each step — accepted, picked up, delivered.' },
      { title: 'Integrated wallet', body: 'Collect on delivery and get credited automatically, net of commission.' },
      { title: 'Saved addresses', body: 'Reuse your frequent pickup and delivery points in one tap.' },
      { title: 'Merchant dashboard', body: 'Manage every course, invoice, and courier from one place.' },
      { title: 'Verified couriers', body: 'Every courier is identity-checked before their first delivery.' },
    ],
  },
  audiences: {
    senders: {
      tag: 'You sell',
      title: 'Merchants',
      body: 'Run an online shop or a market stall? Create a delivery, let AirMess handle the run, and get paid through your wallet.',
      bullets: ['Same-day city delivery', 'Live tracking link for your customer', 'Cash-in on delivery, credited to your wallet'],
      cta: 'Create a delivery',
    },
    drivers: {
      tag: 'You deliver',
      title: 'Couriers',
      body: 'Turn your bike or car into income. Accept the courses that fit your day and get paid for every delivery.',
      bullets: ['Choose your own hours', 'Transparent pay per course', 'Weekly payouts'],
      cta: 'Become a courier',
    },
  },
  driverCta: {
    eyebrow: 'Drive with AirMess',
    title: 'Ride the city. Get paid for it.',
    subtitle:
      'Join the courier network and start accepting deliveries near you. Sign up online — it takes a few minutes.',
    stats: [
      { value: 'Weekly', label: 'Payouts' },
      { value: 'Flexible', label: 'Your own hours' },
      { value: 'Free', label: 'To sign up' },
    ],
    cta: 'Start as a courier',
    download: 'Download the courier app (Android)',
    note: 'A valid ID and a vehicle are all you need to apply.',
  },
  faq: {
    eyebrow: 'Good to know',
    title: 'Questions, answered.',
    items: [
      {
        q: 'Where does AirMess deliver?',
        a: 'We operate across Cotonou and nearby areas, with new zones opening regularly. Enter your addresses to check availability instantly.',
      },
      {
        q: 'How much does a delivery cost?',
        a: 'Deliveries start from 500 FCFA. The exact price is based on distance and package size, and shown before you confirm. No hidden fees.',
      },
      {
        q: 'How does cash-in work?',
        a: 'The courier collects payment from your customer in cash or Mobile Money. Your merchant wallet is credited automatically, net of commission, and you withdraw to MTN MoMo or Moov Money whenever you want.',
      },
      {
        q: 'How do I become a courier?',
        a: 'Tap "Become a courier", fill in your details, and upload your ID. Once approved, you can start accepting courses.',
      },
      {
        q: 'Can my customers track their package?',
        a: 'Yes. Every course generates a tracking link you can share, with the courier’s live position and status.',
      },
    ],
  },
  whatsapp: {
    label: 'Chat on WhatsApp',
    message: "Hello, I'd like to arrange a delivery with AirMess.",
  },
  footer: {
    tagline: 'You sell, we deliver — across Cotonou, tracked end to end.',
    product: 'Product',
    company: 'Company',
    links: {
      howItWorks: 'How it works',
      features: 'Features',
      drivers: 'For couriers',
      sender: 'Create a delivery',
      login: 'Log in',
      contact: 'Contact',
    },
    momo: 'Works with MTN Mobile Money and Moov Money.',
    rights: 'All rights reserved.',
    madeBy: 'A KTALYZ product.',
  },
  lang: {
    en: 'EN',
    fr: 'FR',
    switch: 'Change language',
  },
}

export default en
export type Translation = typeof en
