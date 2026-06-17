import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import AppHeader from '../components/AppHeader'
import AddressFormModal from '../components/AddressFormModal'
import { fetchAddresses, deleteAddress, type Address } from '../api/addresses'

export default function AddressesPage() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Address | null>(null)

  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: fetchAddresses,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAddress,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['addresses'] }),
  })

  function openCreate() {
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(addr: Address) {
    setEditing(addr)
    setModalOpen(true)
  }

  function confirmDelete(addr: Address) {
    if (confirm(`Supprimer l'adresse "${addr.recipient_name}" ?`)) {
      deleteMutation.mutate(addr.id)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />

      <main className="max-w-5xl mx-auto p-4 md:p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-airmess-dark">Carnet d'adresses</h2>
          <button
            onClick={openCreate}
            className="bg-airmess-yellow text-airmess-dark font-bold px-4 py-2 rounded-lg hover:opacity-90"
          >
            + Nouvelle adresse
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {isLoading && <div className="p-10 text-center text-gray-500">Chargement...</div>}

          {!isLoading && addresses.length === 0 && (
            <div className="p-10 text-center text-gray-500">
              Aucune adresse enregistrée. Crée ta première !
            </div>
          )}

          {addresses.length > 0 && (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-6 py-3 text-left">Étiquette</th>
                  <th className="px-6 py-3 text-left">Destinataire</th>
                  <th className="px-6 py-3 text-left">Téléphone</th>
                  <th className="px-6 py-3 text-left">Quartier</th>
                  <th className="px-6 py-3 text-center">Utilisations</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {addresses.map((addr) => (
                  <tr key={addr.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium">
                      {addr.label ?? <span className="text-gray-400 italic">—</span>}
                    </td>
                    <td className="px-6 py-3">{addr.recipient_name}</td>
                    <td className="px-6 py-3 font-mono text-xs">{addr.recipient_phone}</td>
                    <td className="px-6 py-3 text-gray-600">{addr.quartier}, {addr.city}</td>
                    <td className="px-6 py-3 text-center text-gray-500">{addr.usage_count}</td>
                    <td className="px-6 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => openEdit(addr)}
                        className="text-airmess-dark hover:underline text-xs mr-3"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => confirmDelete(addr)}
                        className="text-airmess-red hover:underline text-xs"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      <AddressFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
      />
    </div>
  )
}
