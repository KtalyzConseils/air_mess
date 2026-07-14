import type { ReactNode } from 'react'
import type { UseFormRegisterReturn } from 'react-hook-form'

export interface VehicleTypeOption {
  value: 'moto' | 'scooter' | 'voiture' | 'velo'
  label: string
  icon: ReactNode
}

interface Props {
  label: string
  options: VehicleTypeOption[]
  /** register('vehicle_type', ...) — les radios natifs marchent avec RHF sans Controller. */
  registration: UseFormRegisterReturn
  error?: string
}

/**
 * Choix du type de véhicule en cartes-radio cliquables (remplace le <select>
 * à emojis). Radios natifs masqués (sr-only) : le style sélectionné passe par
 * `peer-checked:` et la navigation clavier reste standard.
 */
export default function VehicleTypeCards({ label, options, registration, error }: Props) {
  return (
    <fieldset>
      <legend className="block mb-1.5 text-caption text-warm-600 font-medium">
        {label} <span className="text-airmess-red">*</span>
      </legend>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {options.map((option) => (
          <label
            key={option.value}
            className="relative flex cursor-pointer flex-col items-center gap-2 rounded-md border border-warm-300 bg-off-white px-3 py-4 text-center transition-all duration-200 hover:border-warm-400 has-checked:border-airmess-yellow has-checked:bg-airmess-yellow/10 has-checked:shadow-glow-yellow"
          >
            <input
              type="radio"
              value={option.value}
              className="peer sr-only"
              {...registration}
            />
            <span className="text-warm-600 peer-checked:text-ink" aria-hidden>
              {option.icon}
            </span>
            <span className="text-body-s font-medium text-ink">{option.label}</span>
          </label>
        ))}
      </div>

      {error && <p className="mt-1.5 text-caption text-airmess-red">{error}</p>}
    </fieldset>
  )
}
