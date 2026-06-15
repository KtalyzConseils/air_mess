import type { ReactNode } from 'react'

interface Props {
  title: string
  description?: string
  children: ReactNode
}

export default function FormSection({ title, description, children }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
      <div className="mb-4 pb-4 border-b">
        <h3 className="font-bold text-airmess-dark">{title}</h3>
        {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
      </div>
      {children}
    </div>
  )
}
