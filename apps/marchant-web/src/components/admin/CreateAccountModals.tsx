import { useState, type FormEvent, type ReactNode } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { useTranslation } from 'react-i18next'
import AdminModal from './AdminModal'
import { AdminButton, AdminSelect } from './AdminToolbar'
import {
  createDriver,
  createIndividual,
  createMarchant,
  type CreateDriverPayload,
  type CreateIndividualPayload,
  type CreateMarchantPayload,
} from '../../api/admin'

const inputClass =
  'w-full h-9 px-3 bg-off-white border border-warm-300 rounded-md text-body-s text-ink ' +
  'placeholder:text-warm-400 focus:outline-none focus:border-airmess-yellow focus:shadow-glow-yellow'

function useErrorMessage() {
  const { t } = useTranslation()
  return (error: unknown): string | null => {
    if (!error) return null
    if (error instanceof AxiosError) {
      const data = error.response?.data as { message?: string; errors?: Record<string, string[]> } | undefined
      const first = data?.errors ? Object.values(data.errors)[0]?.[0] : null
      return first ?? data?.message ?? t('admin.createAccount.createError')
    }
    return t('admin.createAccount.createError')
  }
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-caption font-semibold uppercase text-warm-600 mb-1">{label}</span>
      {children}
    </label>
  )
}

export function CreateMarchantModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const errorMessage = useErrorMessage()
  const queryClient = useQueryClient()
  const [form, setForm] = useState<CreateMarchantPayload>({
    name: '',
    email: '',
    phone: '',
    password: '',
    raison_sociale: '',
    ifu_rccm: '',
    secteur_activite: 'restaurant',
    validate_now: true,
  })

  const mutation = useMutation({
    mutationFn: createMarchant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'marchants'] })
      onClose()
      setForm({ name: '', email: '', phone: '', password: '', raison_sociale: '', ifu_rccm: '', secteur_activite: 'restaurant', validate_now: true })
    },
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    mutation.mutate({ ...form, ifu_rccm: form.ifu_rccm?.trim() || undefined })
  }

  return (
    <AdminModal
      open={open}
      onClose={onClose}
      title={t('admin.createAccount.marchant.title')}
      subtitle={t('admin.createAccount.marchant.subtitle')}
      width="lg"
      footer={
        <>
          <AdminButton variant="ghost" onClick={onClose}>{t('admin.createAccount.cancel')}</AdminButton>
          <AdminButton variant="primary" type="submit" form="create-marchant-form" disabled={mutation.isPending}>{t('admin.createAccount.create')}</AdminButton>
        </>
      }
    >
      <form id="create-marchant-form" onSubmit={submit} className="grid gap-3 md:grid-cols-2">
        <Field label={t('admin.createAccount.fields.manager')}>
          <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </Field>
        <Field label={t('admin.createAccount.fields.businessName')}>
          <input className={inputClass} value={form.raison_sociale} onChange={(e) => setForm({ ...form, raison_sociale: e.target.value })} required />
        </Field>
        <Field label={t('admin.createAccount.fields.email')}>
          <input className={inputClass} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </Field>
        <Field label={t('admin.createAccount.fields.phone')}>
          <input className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+229..." required />
        </Field>
        <Field label={t('admin.createAccount.fields.password')}>
          <input className={inputClass} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={8} required />
        </Field>
        <Field label={t('admin.createAccount.fields.sector')}>
          <AdminSelect value={form.secteur_activite} onChange={(e) => setForm({ ...form, secteur_activite: e.target.value as CreateMarchantPayload['secteur_activite'] })} className="w-full">
            <option value="restaurant">{t('admin.createAccount.sectors.restaurant')}</option>
            <option value="supermarche">{t('admin.createAccount.sectors.supermarche')}</option>
            <option value="boutique">{t('admin.createAccount.sectors.boutique')}</option>
            <option value="pharmacie">{t('admin.createAccount.sectors.pharmacie')}</option>
            <option value="ecommerce">{t('admin.createAccount.sectors.ecommerce')}</option>
            <option value="autre">{t('admin.createAccount.sectors.autre')}</option>
          </AdminSelect>
        </Field>
        <Field label={t('admin.createAccount.fields.taxId')}>
          <input className={inputClass} value={form.ifu_rccm ?? ''} onChange={(e) => setForm({ ...form, ifu_rccm: e.target.value })} />
        </Field>
        <label className="flex items-center gap-2 pt-6 text-body-s text-ink">
          <input type="checkbox" checked={!!form.validate_now} onChange={(e) => setForm({ ...form, validate_now: e.target.checked })} />
          {t('admin.createAccount.marchant.validateNow')}
        </label>
        {errorMessage(mutation.error) && <p className="md:col-span-2 text-body-s text-airmess-red">{errorMessage(mutation.error)}</p>}
      </form>
    </AdminModal>
  )
}

export function CreateIndividualModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const errorMessage = useErrorMessage()
  const queryClient = useQueryClient()
  const [form, setForm] = useState<CreateIndividualPayload>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    gender: 'autre',
  })

  const mutation = useMutation({
    mutationFn: createIndividual,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'individuals'] })
      onClose()
      setForm({ first_name: '', last_name: '', email: '', phone: '', password: '', gender: 'autre' })
    },
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    mutation.mutate(form)
  }

  return (
    <AdminModal
      open={open}
      onClose={onClose}
      title={t('admin.createAccount.individual.title')}
      subtitle={t('admin.createAccount.individual.subtitle')}
      footer={
        <>
          <AdminButton variant="ghost" onClick={onClose}>{t('admin.createAccount.cancel')}</AdminButton>
          <AdminButton variant="primary" type="submit" form="create-individual-form" disabled={mutation.isPending}>{t('admin.createAccount.create')}</AdminButton>
        </>
      }
    >
      <form id="create-individual-form" onSubmit={submit} className="grid gap-3 md:grid-cols-2">
        <Field label={t('admin.createAccount.fields.firstName')}><input className={inputClass} value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required /></Field>
        <Field label={t('admin.createAccount.fields.lastName')}><input className={inputClass} value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required /></Field>
        <Field label={t('admin.createAccount.fields.email')}><input className={inputClass} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></Field>
        <Field label={t('admin.createAccount.fields.phone')}><input className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+229..." required /></Field>
        <Field label={t('admin.createAccount.fields.password')}><input className={inputClass} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={8} required /></Field>
        <Field label={t('admin.createAccount.fields.gender')}>
          <AdminSelect value={form.gender ?? 'autre'} onChange={(e) => setForm({ ...form, gender: e.target.value as CreateIndividualPayload['gender'] })} className="w-full">
            <option value="autre">{t('admin.createAccount.genders.autre')}</option>
            <option value="M">{t('admin.createAccount.genders.M')}</option>
            <option value="F">{t('admin.createAccount.genders.F')}</option>
          </AdminSelect>
        </Field>
        {errorMessage(mutation.error) && <p className="md:col-span-2 text-body-s text-airmess-red">{errorMessage(mutation.error)}</p>}
      </form>
    </AdminModal>
  )
}

export function CreateDriverModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const errorMessage = useErrorMessage()
  const queryClient = useQueryClient()
  const [form, setForm] = useState<CreateDriverPayload>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    gender: 'autre',
    vehicle_type: 'moto',
    vehicle_plate: '',
    vehicle_brand: '',
    kind: 'independent',
    activate_now: false,
  })

  const mutation = useMutation({
    mutationFn: createDriver,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'drivers'] })
      onClose()
      setForm({ first_name: '', last_name: '', email: '', phone: '', password: '', gender: 'autre', vehicle_type: 'moto', vehicle_plate: '', vehicle_brand: '', kind: 'independent', activate_now: false })
    },
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    mutation.mutate({
      ...form,
      vehicle_plate: form.vehicle_plate?.trim() || undefined,
      vehicle_brand: form.vehicle_brand?.trim() || undefined,
    })
  }

  return (
    <AdminModal
      open={open}
      onClose={onClose}
      title={t('admin.createAccount.driver.title')}
      subtitle={t('admin.createAccount.driver.subtitle')}
      width="lg"
      footer={
        <>
          <AdminButton variant="ghost" onClick={onClose}>{t('admin.createAccount.cancel')}</AdminButton>
          <AdminButton variant="primary" type="submit" form="create-driver-form" disabled={mutation.isPending}>{t('admin.createAccount.create')}</AdminButton>
        </>
      }
    >
      <form id="create-driver-form" onSubmit={submit} className="grid gap-3 md:grid-cols-2">
        <Field label={t('admin.createAccount.fields.firstName')}><input className={inputClass} value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required /></Field>
        <Field label={t('admin.createAccount.fields.lastName')}><input className={inputClass} value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required /></Field>
        <Field label={t('admin.createAccount.fields.email')}><input className={inputClass} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></Field>
        <Field label={t('admin.createAccount.fields.phone')}><input className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+229..." required /></Field>
        <Field label={t('admin.createAccount.fields.password')}><input className={inputClass} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={8} required /></Field>
        <Field label={t('admin.createAccount.fields.vehicle')}>
          <AdminSelect value={form.vehicle_type} onChange={(e) => setForm({ ...form, vehicle_type: e.target.value as CreateDriverPayload['vehicle_type'] })} className="w-full">
            <option value="moto">{t('admin.createAccount.vehicles.moto')}</option>
            <option value="scooter">{t('admin.createAccount.vehicles.scooter')}</option>
            <option value="voiture">{t('admin.createAccount.vehicles.voiture')}</option>
            <option value="velo">{t('admin.createAccount.vehicles.velo')}</option>
          </AdminSelect>
        </Field>
        <Field label={t('admin.createAccount.fields.plate')}><input className={inputClass} value={form.vehicle_plate ?? ''} onChange={(e) => setForm({ ...form, vehicle_plate: e.target.value })} /></Field>
        <Field label={t('admin.createAccount.fields.brand')}><input className={inputClass} value={form.vehicle_brand ?? ''} onChange={(e) => setForm({ ...form, vehicle_brand: e.target.value })} /></Field>
        <Field label={t('admin.createAccount.fields.driverKind')}>
          <AdminSelect value={form.kind ?? 'independent'} onChange={(e) => setForm({ ...form, kind: e.target.value as CreateDriverPayload['kind'] })} className="w-full">
            <option value="independent">{t('admin.createAccount.driverKinds.independent')}</option>
            <option value="airmess">{t('admin.createAccount.driverKinds.airmess')}</option>
          </AdminSelect>
        </Field>
        <label className="flex items-center gap-2 pt-6 text-body-s text-ink">
          <input type="checkbox" checked={!!form.activate_now} onChange={(e) => setForm({ ...form, activate_now: e.target.checked })} />
          {t('admin.createAccount.driver.activateNow')}
        </label>
        {errorMessage(mutation.error) && <p className="md:col-span-2 text-body-s text-airmess-red">{errorMessage(mutation.error)}</p>}
      </form>
    </AdminModal>
  )
}
