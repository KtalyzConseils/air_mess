export const GA_MEASUREMENT_ID = 'G-KVMJQF9J8Z'

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

export function trackPageView(path: string, title = document.title) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return

  window.gtag('config', GA_MEASUREMENT_ID, {
    page_path: path,
    page_title: title,
  })
}
