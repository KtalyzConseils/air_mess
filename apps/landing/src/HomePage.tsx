import { useEffect } from 'react'
import homepageHtml from './pages/homepage.html?raw'

export default function HomePage() {
  useEffect(() => {
    const menuButton = document.querySelector<HTMLButtonElement>('.menu-toggle')
    const mobileMenu = document.querySelector<HTMLElement>('.mobile-menu')

    const handleMenuToggle = () => {
      const isOpen = menuButton?.getAttribute('aria-expanded') === 'true'
      menuButton?.setAttribute('aria-expanded', String(!isOpen))
      mobileMenu?.classList.toggle('open', !isOpen)
    }

    menuButton?.addEventListener('click', handleMenuToggle)

    mobileMenu?.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        mobileMenu?.classList.remove('open')
        menuButton?.setAttribute('aria-expanded', 'false')
      })
    })

    const revealItems = document.querySelectorAll<HTMLElement>('.reveal')
    let observer: IntersectionObserver | undefined

    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('visible')
              observer?.unobserve(entry.target)
            }
          })
        },
        { threshold: 0.12, rootMargin: '0px 0px -35px' },
      )

      revealItems.forEach((item) => observer?.observe(item))
    } else {
      revealItems.forEach((item) => item.classList.add('visible'))
    }

    return () => {
      menuButton?.removeEventListener('click', handleMenuToggle)
      observer?.disconnect()
    }
  }, [])

  return <div dangerouslySetInnerHTML={{ __html: homepageHtml }} />
}
