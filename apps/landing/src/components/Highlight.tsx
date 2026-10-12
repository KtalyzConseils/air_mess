import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  color?: 'yellow' | 'red'
  className?: string
}

export default function Highlight({ children, color = 'yellow', className = '' }: Props) {
  const fillColor = color === 'red' ? '#D40511' : '#FFCC00'
  const opacity = color === 'red' ? 0.22 : 0.65

  return (
    <span className={`relative inline-block ${className}`}>
      <span className="relative z-10">{children}</span>
      <svg aria-hidden="true" className="absolute inset-x-0 bottom-0 -mb-0.5 h-[55%] w-full pointer-events-none ams-anim-highlight-draw" viewBox="0 0 200 30" preserveAspectRatio="none">
        <path d="M3 22 Q 35 8, 75 18 T 145 16 Q 175 10, 197 22 L 197 30 L 3 30 Z" fill={fillColor} opacity={opacity} />
      </svg>
    </span>
  )
}