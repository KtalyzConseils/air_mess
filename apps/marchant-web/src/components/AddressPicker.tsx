import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchAddresses, type Address } from '../api/addresses'

interface Props {
  onSelect: (address: Address) => void
}

export default function AddressPicker({ onSelect }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const { data: addresses = [] } = useQuery({
    queryKey: ['addresses'],
    queryFn: fetchAddresses,
  })

  const filtered = addresses.filter((a) => {
    const q = search.toLowerCase()
    return (
      a.recipient_name.toLowerCase().includes(q) ||
      a.recipient_phone.includes(q) ||
      a.quartier.toLowerCase().includes(q) ||
      (a.label?.toLowerCase().includes(q) ?? false)
    )
  })

  function handlePick(addr: Address) {
    onSelect(addr)
    setOpen(false)
    setSearch('')
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-airmess-dark underline hover:no-underline"
      >
        📒 Choisir depuis le carnet
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[80vh] flex flex-col">
            <div className="p-4 border-b">
              <h3 className="font-bold text-airmess-dark mb-2">Carnet d'adresses</h3>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par nom, téléphone, quartier..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-airmess-yellow"
                autoFocus
              />
            </div>

            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 && (
                <div className="p-8 text-center text-gray-500 text-sm">
                  Aucune adresse correspondante.
                </div>
              )}
              {filtered.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => handlePick(a)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{a.recipient_name}</span>
                    {a.label && (
                      <span className="text-xs bg-airmess-yellow/30 px-2 py-0.5 rounded">
                        {a.label}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    📞 {a.recipient_phone} · {a.quartier}, {a.city}
                  </div>
                  {a.landmark && (
                    <div className="text-xs text-gray-400 italic mt-1">{a.landmark}</div>
                  )}
                </button>
              ))}
            </div>

            <div className="p-3 border-t text-right">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm text-gray-500 hover:underline"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
