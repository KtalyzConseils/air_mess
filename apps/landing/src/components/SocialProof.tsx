import { useContent } from '../content'
import beninSupermarche from '../assets/partners/01_Benin_SuperMarche.jpg'
import cotonouPizza from '../assets/partners/02_Cotonou_Pizza.png'
import apg from '../assets/partners/03_APG_Abidjan_Poulet_Grille.jpg'
import gbandj00 from '../assets/partners/04_gbandj00.png'
import attieke from '../assets/partners/05_Attieke_2.0.png'
import saladbar from '../assets/partners/06_Cotonou_SaladBar.jpg'
import cotonouFood from '../assets/partners/07_Cotonou_Food.png'

const partners = [
  { src: beninSupermarche, name: 'Bénin SuperMarché' },
  { src: cotonouPizza, name: 'Cotonou Pizza' },
  { src: apg, name: 'APG — Abidjan Poulet Grillé' },
  { src: gbandj00, name: 'gbandj00' },
  { src: attieke, name: 'Attiéké 2.0' },
  { src: saladbar, name: 'Cotonou SaladBar' },
  { src: cotonouFood, name: 'Cotonou Food' },
]

// Duplicated once so the marquee can loop seamlessly (-50% shift).
const loop = [...partners, ...partners]

export default function SocialProof() {
  const c = useContent()

  return (
    <section className="border-y border-faint bg-paper/60 py-10">
      <p className="data-label text-center text-muted">{c.social.title}</p>

      {/* Auto-scrolling marquee (pauses on hover); faded edges */}
      <div
        className="relative mt-7 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]"
      >
        <ul className="marquee-track flex w-max items-center">
          {loop.map((p, i) => (
            <li
              key={i}
              aria-hidden={i >= partners.length}
              className="mr-5 flex h-16 w-28 shrink-0 items-center justify-center rounded-xl border border-faint bg-white p-2 sm:mr-6 sm:h-20 sm:w-32"
            >
              <img
                src={p.src}
                alt={i < partners.length ? p.name : ''}
                loading="lazy"
                className="max-h-full max-w-full object-contain"
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
