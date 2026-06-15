import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import Field from './Field'
import { createAddress, updateAddress, type Address, type AddressPayload } from '../api/addresses'

interface Props {
  open: boolean
  onClose: () => void
  editing: Address | null
}

export default function AddressFormModal({ open, onClose, editing }: Props) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, reset, formState: { errors } } = useForm<AddressPayload>()

  useEffect(() => {
    if (open) {
      reset(editing ?? {
        label: '',
        recipient_name: '',
        recipient_phone: '',
        quartier: '',
        city: 'Cotonou',
      })
    }
  }, [open, editing, reset])

  const mutation = useMutation({
    mutationFn: (payload: AddressPayload) =>
      editing ? updateAddress(editing.id, payload) : createAddress(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] })
      onClose()
    },
  })

  if (!open) return null

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-airmess-yellow focus:border-transparent outline-none'

  const apiError =
    mutation.error instanceof AxiosError
      ? mutation.error.response?.data?.message ?? 'Erreur.'
      : null

  function onSubmit(values: AddressPayload) {
    const payload: AddressPayload = {
      ...values,
    }
    mutation.mutate(payload)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          <h3 className="text-lg font-bold text-airmess-dark mb-4">
            {editing ? 'Modifier l\'adresse' : 'Nouvelle adresse'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Étiquette" className="md:col-span-2">
              <input {...register('label')} className={inputClass} placeholder="ex: Maison, Bureau" />
            </Field>
            <Field label="Nom destinataire" required error={errors.recipient_name?.message}>
              <input {...register('recipient_name', { required: 'Obligatoire' })} className={inputClass} />
            </Field>
            <Field label="Téléphone" required>
              <input {...register('recipient_phone', { required: 'Obligatoire' })} className={inputClass} />
            </Field>
            <Field label="Rue / adresse" className="md:col-span-2">
              <input {...register('street')} className={inputClass} />
            </Field>
            <Field label="Point de repère" className="md:col-span-2">
              <input {...register('landmark')} className={inputClass} placeholder="ex: Maison à portail bleu" />
            </Field>
            <Field label="Quartier" required>
              <input {...register('quartier', { required: 'Obligatoire' })} className={inputClass} />
            </Field>
            <Field label="Ville" required>
              <input {...register('city', { required: 'Obligatoire' })} className={inputClass} />
            </Field>
            <Field label="🔗 Lien Google Maps" className="md:col-span-2">
              <input
                {...register('maps_link')}
                className={inputClass}
                placeholder="Colle l'URL depuis Google Maps (facultatif)"
              />
              <p className="text-xs text-gray-500 mt-1">
                Si renseigné, on extrait automatiquement les coordonnées pour pré-remplir la livraison.
              </p>
            </Field>

            <Field label="Instructions livreur" className="md:col-span-2">
              <textarea {...register('instructions')} rows={2} className={inputClass} />
            </Field>
          </div>

          {apiError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm mt-3">
              {apiError}
            </div>
          )}

          <div className="flex justify-end gap-2 mt-5">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50">
              Annuler
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="bg-airmess-yellow text-airmess-dark font-bold px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {mutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
