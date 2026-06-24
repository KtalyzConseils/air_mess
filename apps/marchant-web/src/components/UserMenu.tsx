import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../stores/authStore'
import { fetchWallet } from '../api/wallet'

function getInitials(name: string): string {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('') || '?'
  )
}

function formatFcfa(n: number): string {
  return n.toLocaleString('fr-FR') + ' FCFA'
}

export default function UserMenu() {
  const { user, logout } = useAuthStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const displayName =
    user?.marchant?.raison_sociale ??
    (user?.individual ? `${user.individual.first_name} ${user.individual.last_name}`.trim() : null) ??
    user?.name ?? 'Utilisateur'
  const initials = getInitials(displayName)

  const isMarchant = user?.type === 'marchant'
  const isIndividual = user?.type === 'individual'

  // Wallet (marchand + particulier) — récupéré seulement quand le menu est ouvert
  // pour éviter une requête à chaque navigation.
  const { data: wallet } = useQuery({
    queryKey: ['wallet'],
    queryFn: fetchWallet,
    enabled: open && (isMarchant || isIndividual),
    staleTime: 30_000,
  })

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-10 h-10 rounded-full bg-airmess-yellow text-airmess-dark font-bold flex items-center justify-center hover:opacity-90 transition"
        title={displayName}
      >
        {initials}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-100 py-2 z-50 text-airmess-dark">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold truncate">{displayName}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>

          {(isMarchant || isIndividual) && (
            <Link
              to="/wallet"
              onClick={() => setOpen(false)}
              className="block px-4 py-3 border-b border-gray-100 bg-gray-50 hover:bg-gray-100 transition"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  <span className="text-base">💰</span>
                  <span className="text-sm font-semibold text-airmess-dark">Mon wallet</span>
                </span>
                {wallet?.is_low && (
                  <span className="text-[10px] uppercase font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded">
                    Bas
                  </span>
                )}
              </div>

              {wallet ? (
                <>
                  <p className="text-base font-bold text-airmess-dark mt-1">
                    {formatFcfa(wallet.available)}
                  </p>
                  {wallet.pending_reserved > 0 && (
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {formatFcfa(wallet.pending_reserved)} réservés
                    </p>
                  )}
                  <p className="text-xs text-airmess-dark/70 mt-1 underline">
                    Recharger →
                  </p>
                </>
              ) : (
                <p className="text-xs text-gray-500 mt-1">Voir le solde →</p>
              )}
            </Link>
          )}

          <Link
            to="/profile"
            onClick={() => setOpen(false)}
            className="w-full px-4 py-2 text-sm flex items-center gap-2 text-gray-700 hover:bg-gray-50"
          >
            <span>👤</span>
            <span>Mon profil</span>
          </Link>

          <div className="border-t border-gray-100 my-1" />

          <button
            onClick={() => {
              setOpen(false)
              logout()
            }}
            className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 text-airmess-red hover:bg-red-50"
          >
            <span>↪</span>
            <span>Déconnexion</span>
          </button>
        </div>
      )}
    </div>
  )
}
