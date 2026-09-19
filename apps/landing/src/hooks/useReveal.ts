import { useEffect, useRef, useState } from 'react'

/**
 * Adds an `is-visible` class once the element scrolls into view.
 * One-shot: it does not re-hide on scroll out.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node || visible) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true)
            observer.disconnect()
          }
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [visible])

  return { ref, className: visible ? 'reveal is-visible' : 'reveal' }
}
