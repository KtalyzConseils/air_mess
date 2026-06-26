import markUrl from '../assets/logo/airmess-mark.svg'
import wordmarkUrl from '../assets/logo/airmess-wordmark.svg'
import wordmarkWhiteUrl from '../assets/logo/airmess-wordmark-white.svg'

type Props = {
  /** Use the white wordmark for dark backgrounds (e.g. footer). */
  light?: boolean
}

export default function Logo({ light = false }: Props) {
  return (
    <a href="#top" className="inline-flex items-center gap-2.5" aria-label="AirMess — home">
      <img src={markUrl} alt="" aria-hidden="true" className="h-6 w-auto sm:h-7" />
      <img
        src={light ? wordmarkWhiteUrl : wordmarkUrl}
        alt="AirMess"
        className="h-4 w-auto sm:h-5"
      />
    </a>
  )
}
