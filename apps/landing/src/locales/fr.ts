import type { Translation } from './en'

const fr: Translation = {
  nav: {
    howItWorks: 'Comment ça marche',
    features: 'Fonctionnalités',
    drivers: 'Pour les livreurs',
    faq: 'FAQ',
    login: 'Se connecter',
    cta: 'Créer une livraison',
  },
  hero: {
    eyebrow: 'Pensé pour les marchands à Cotonou',
    titleLine1: 'Vous vendez.',
    titleHighlight: 'Nous livrons.',
    titleLine2: '',
    subtitle:
      'AirMess orchestre la livraison de vos commandes à Cotonou. Vos clients suivent chaque course en direct, jusqu’à leur porte. Vous, vous vous concentrez sur la vente.',
    ctaSender: 'Créer une livraison',
    ctaDriver: 'Devenir livreur',
    price: 'Livraison à partir de 500 FCFA',
    example:
      'Vous vendez un produit ? Créez une course, partagez le lien de suivi avec votre client, AirMess gère la livraison.',
    stats: {
      deliveries: 'Livraisons effectuées',
      pickup: 'Délai de prise en charge',
      cities: 'Villes couvertes',
    },
    live: {
      tag: 'Course en direct',
      pickup: 'Enlèvement',
      pickupValue: 'Marché de Ganhi',
      dropoff: 'Livraison',
      dropoffValue: 'Fidjrossè, Cotonou',
      courier: 'Kossi est en route',
      eta: 'Arrivée',
      etaValue: '12 min',
      distance: 'Distance',
      distanceValue: '4,2 km',
    },
  },
  social: {
    title: 'Ils nous font confiance à Cotonou',
  },
  how: {
    eyebrow: 'Le trajet',
    title: 'Trois étapes, de votre boutique à la porte du client.',
    steps: [
      {
        title: 'Créez une course',
        body: 'Saisissez les adresses d’enlèvement et de livraison, la taille du colis, puis confirmez. Le prix est affiché à l’avance.',
      },
      {
        title: 'Un livreur la prend',
        body: 'Le livreur disponible le plus proche accepte et se rend au point d’enlèvement. Sans attente.',
      },
      {
        title: 'Suivez jusqu’à la livraison',
        body: 'Suivez le livreur en direct sur la carte et partagez un lien de suivi. Payez en toute sécurité à l’arrivée.',
      },
    ],
  },
  wallet: {
    eyebrow: 'Encaissement intégré',
    title: 'On livre. On encaisse. On vous reverse.',
    body: 'Le livreur encaisse votre client — en espèces ou en Mobile Money — et confirme dans l’application. Votre portefeuille marchand est crédité automatiquement, net de commission. Vous retirez vers votre compte Mobile Money quand vous voulez.',
    steps: ['Le livreur encaisse', 'Votre wallet est crédité', 'Vous retirez à la demande'],
    protect: 'Vous ne courez plus après votre argent.',
    momo: 'Compatible MTN Mobile Money et Moov Money.',
  },
  features: {
    eyebrow: 'Ce que vous obtenez',
    title: 'Conçu pour une livraison rapide et fiable.',
    items: [
      { title: 'Suivi en temps réel', body: 'Visualisez chaque course sur la carte, de l’enlèvement à la livraison.' },
      { title: 'Notifications instantanées', body: 'Soyez alerté à chaque étape — acceptée, enlevée, livrée.' },
      { title: 'Portefeuille intégré', body: 'Encaissez à la livraison et soyez crédité automatiquement, net de commission.' },
      { title: 'Adresses enregistrées', body: 'Réutilisez vos points d’enlèvement et de livraison habituels en un geste.' },
      { title: 'Tableau de bord marchand', body: 'Gérez vos courses, factures et livreurs depuis un seul endroit.' },
      { title: 'Livreurs vérifiés', body: 'Chaque livreur est vérifié avant sa première livraison.' },
    ],
  },
  audiences: {
    senders: {
      tag: 'Vous vendez',
      title: 'Marchands',
      body: 'Boutique en ligne ou étal au marché ? Créez une livraison, AirMess gère la course, et vous êtes payé via votre portefeuille.',
      bullets: ['Livraison en ville le jour même', 'Lien de suivi en direct pour votre client', 'Encaissement à la livraison, crédité sur votre wallet'],
      cta: 'Créer une livraison',
    },
    drivers: {
      tag: 'Vous livrez',
      title: 'Livreurs',
      body: 'Transformez votre moto ou votre voiture en revenu. Acceptez les courses qui vous arrangent et soyez payé pour chacune.',
      bullets: ['Choisissez vos horaires', 'Rémunération transparente par course', 'Paiements hebdomadaires'],
      cta: 'Devenir livreur',
    },
  },
  driverCta: {
    eyebrow: 'Roulez avec AirMess',
    title: 'Sillonnez la ville. Soyez payé pour ça.',
    subtitle:
      'Rejoignez le réseau de livreurs et commencez à accepter des livraisons près de chez vous. L’inscription se fait en ligne, en quelques minutes.',
    stats: [
      { value: 'Chaque semaine', label: 'Paiements' },
      { value: 'Flexible', label: 'Vos horaires' },
      { value: 'Gratuit', label: 'Inscription' },
    ],
    cta: 'Commencer comme livreur',
    download: 'Télécharger l’app livreur (Android)',
    note: 'Une pièce d’identité valide et un véhicule suffisent pour postuler.',
  },
  faq: {
    eyebrow: 'Bon à savoir',
    title: 'Vos questions, nos réponses.',
    items: [
      {
        q: 'Où AirMess livre-t-il ?',
        a: 'Nous opérons à Cotonou et ses environs, avec de nouvelles zones régulièrement. Saisissez vos adresses pour vérifier la disponibilité immédiatement.',
      },
      {
        q: 'Combien coûte une livraison ?',
        a: 'Les livraisons démarrent à partir de 500 FCFA. Le prix exact dépend de la distance et de la taille du colis, et s’affiche avant la confirmation. Aucun frais caché.',
      },
      {
        q: 'Comment fonctionne l’encaissement ?',
        a: 'Le livreur encaisse votre client en espèces ou en Mobile Money. Votre portefeuille marchand est crédité automatiquement, net de commission, et vous retirez vers MTN MoMo ou Moov Money quand vous voulez.',
      },
      {
        q: 'Comment devenir livreur ?',
        a: 'Cliquez sur « Devenir livreur », renseignez vos informations et téléversez votre pièce d’identité. Une fois validé, vous pouvez accepter des courses.',
      },
      {
        q: 'Mes clients peuvent-ils suivre leur colis ?',
        a: 'Oui. Chaque course génère un lien de suivi partageable, avec la position en direct du livreur et son statut.',
      },
    ],
  },
  whatsapp: {
    label: 'Discuter sur WhatsApp',
    message: 'Bonjour, je souhaite organiser une livraison avec AirMess.',
  },
  footer: {
    tagline: 'Vous vendez, nous livrons — à Cotonou, suivi de bout en bout.',
    product: 'Produit',
    company: 'Entreprise',
    links: {
      howItWorks: 'Comment ça marche',
      features: 'Fonctionnalités',
      drivers: 'Pour les livreurs',
      sender: 'Créer une livraison',
      login: 'Se connecter',
      contact: 'Contact',
    },
    momo: 'Compatible MTN Mobile Money et Moov Money.',
    rights: 'Tous droits réservés.',
    madeBy: 'Un produit KTALYZ.',
  },
  lang: {
    en: 'EN',
    fr: 'FR',
    switch: 'Changer de langue',
  },
}

export default fr
