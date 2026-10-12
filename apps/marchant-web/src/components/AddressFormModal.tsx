import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { useTranslation } from 'react-i18next'
import Field from './Field'
import { createAddress, updateAddress, type Address, type AddressPayload } from '../api/addresses'

interface Props {
  open: boolean
  onClose: () => void
  editing: Address | null
}

export default function AddressFormModal({ open, onClose, editing }: Props) {
  const { t } = useTranslation()
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
      ? mutation.error.response?.data?.message ?? t('addressFormModal.genericError')
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
            {editing ? t('addressFormModal.editTitle') : t('addressFormModal.newTitle')}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label={t('addressFormModal.label')} className="md:col-span-2">
              <input {...register('label')} className={inputClass} placeholder={t('addressFormModal.labelPlaceholder')} />
            </Field>
            <Field label={t('addressFormModal.recipientName')} required error={errors.recipient_name?.message}>
              <input {...register('recipient_name', { required: t('addressFormModal.required') })} className={inputClass} />
            </Field>
            <Field label={t('addressFormModal.phone')} required>
              <input {...register('recipient_phone', { required: t('addressFormModal.required') })} className={inputClass} />
            </Field>
            <Field label={t('addressFormModal.street')} className="md:col-span-2">
              <input {...register('street')} className={inputClass} />
            </Field>
            <Field label={t('addressFormModal.landmark')} className="md:col-span-2">
              <input {...register('landmark')} className={inputClass} placeholder={t('addressFormModal.landmarkPlaceholder')} />
            </Field>
            <Field label={t('addressFormModal.quartier')} required>
              <input {...register('quartier', { required: t('addressFormModal.required') })} className={inputClass} />
            </Field>
            <Field label={t('addressFormModal.city')} required>
              <input {...register('city', { required: t('addressFormModal.required') })} className={inputClass} />
            </Field>
            <Field label={t('addressFormModal.mapsLink')} className="md:col-span-2">
              <input
                {...register('maps_link')}
                className={inputClass}
                placeholder={t('addressFormModal.mapsLinkPlaceholder')}
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('addressFormModal.mapsLinkHint')}
              </p>
            </Field>

            <Field label={t('addressFormModal.driverInstructions')} className="md:col-span-2">
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
              {t('addressFormModal.cancel')}
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="bg-airmess-yellow text-airmess-dark font-bold px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {mutation.isPending ? t('addressFormModal.saving') : t('addressFormModal.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
