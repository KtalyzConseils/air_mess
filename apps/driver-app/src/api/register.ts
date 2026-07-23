import api from './client'

/**
 * Fichier local sélectionné via expo-image-picker, prêt à être poussé dans un
 * FormData multipart (React Native attend { uri, name, type }).
 */
export interface LocalFile {
  uri: string
  name: string
  type: string
}

export type Gender = 'M' | 'F'
export type VehicleType = 'moto' | 'scooter' | 'voiture' | 'velo'
export type CniType = 'cnib' | 'cip' | 'passeport'

/**
 * Données d'inscription livreur collectées par l'écran natif. Miroir du payload
 * web, avec des LocalFile à la place des File et un phone_verification_token
 * (OTP maison) à la place du firebase_id_token.
 */
export interface DriverRegisterForm {
  // Identité
  first_name: string
  last_name: string
  gender: Gender
  birth_date: string // YYYY-MM-DD
  // Auth
  email: string
  phone: string
  password: string
  password_confirmation: string
  phone_verification_token: string
  // Véhicule
  vehicle_type: VehicleType
  vehicle_plate: string
  /** Marque du véhicule (Bajaj, TVS…) — saisie libre, suggestions côté UI. */
  vehicle_brand?: string
  // Documents
  photo: LocalFile | null
  cni_type: CniType
  cni: LocalFile
  cni_back: LocalFile | null
  driving_license: LocalFile | null
  // Contacts d'urgence (2 obligatoires)
  emergency_contact_name: string
  emergency_contact_phone: string
  emergency_contact2_name: string
  emergency_contact2_phone: string
  // Équipement (optionnels)
  equipment_isothermal_bag?: boolean
  equipment_top_case?: boolean
  equipment_refrigerated_bag?: boolean
  // Consentement CGU
  accepted_terms: boolean
}

/**
 * Normalise un numéro vers E.164, à l'identique de App\Support\Phone::normalize
 * côté API (sinon l'OTP vérifié ne matchera pas le numéro soumis au register).
 */
export function normalizePhone(raw: string): string {
  let phone = raw.replace(/[\s\-.()]+/g, '').trim()
  if (phone.startsWith('00')) phone = '+' + phone.slice(2)
  if (phone !== '' && !phone.startsWith('+')) phone = '+229' + phone
  return phone
}

/** Indicatif Bénin, prérempli par défaut (modifiable pour un autre pays). */
export const BENIN_DIAL_CODE = '+229'

/**
 * Valide un numéro béninois. Depuis la migration de 2021, tous les numéros du Bénin
 * comptent 10 chiffres et commencent par « 01 » (ex. +229 01 90 12 34 56).
 * On ne valide que les numéros en +229 : un autre indicatif (numéro étranger) passe.
 *
 * @param normalized numéro déjà normalisé en E.164 (cf. normalizePhone)
 * @returns message d'erreur, ou null si valide
 */
export function validateBeninPhone(normalized: string): string | null {
  if (!normalized.startsWith(BENIN_DIAL_CODE)) return null
  const national = normalized.slice(BENIN_DIAL_CODE.length)
  if (!/^01\d{8}$/.test(national)) {
    return 'Numéro béninois invalide : 10 chiffres commençant par 01 (ex. +229 01 90 12 34 56).'
  }
  return null
}

export interface SendOtpResult {
  expires_in: number
  /** Présent uniquement en mode SMS simulé (dev) : le code, pour tester sans SMS. */
  debug_code?: string
}

/** Envoie un code SMS au numéro (normalisé E.164 côté serveur aussi). */
export async function sendPhoneOtp(phone: string): Promise<SendOtpResult> {
  const { data } = await api.post('/auth/phone/otp/send', { phone })
  return data
}

/** Échange le code SMS contre un jeton de vérification signé. */
export async function verifyPhoneOtp(phone: string, code: string): Promise<string> {
  const { data } = await api.post('/auth/phone/otp/verify', { phone, code })
  return data.phone_verification_token as string
}

/**
 * Inscription livreur : POST multipart. Retourne le token Sanctum du compte créé
 * (le driver reste "pending" jusqu'à validation admin, mais le token permet la
 * page succès / choix du canal de réponse).
 */
export async function registerDriver(form: DriverRegisterForm): Promise<{ token: string }> {
  const fd = new FormData()

  // Champs texte
  fd.append('first_name', form.first_name)
  fd.append('last_name', form.last_name)
  fd.append('gender', form.gender)
  fd.append('birth_date', form.birth_date)
  fd.append('email', form.email)
  fd.append('phone', form.phone)
  fd.append('password', form.password)
  fd.append('password_confirmation', form.password_confirmation)
  fd.append('phone_verification_token', form.phone_verification_token)
  fd.append('vehicle_type', form.vehicle_type)
  fd.append('vehicle_plate', form.vehicle_plate)
  if (form.vehicle_brand) fd.append('vehicle_brand', form.vehicle_brand)
  fd.append('emergency_contact_name', form.emergency_contact_name)
  fd.append('emergency_contact_phone', form.emergency_contact_phone)
  fd.append('emergency_contact2_name', form.emergency_contact2_name)
  fd.append('emergency_contact2_phone', form.emergency_contact2_phone)
  // Équipement (Laravel reconstruit l'objet depuis equipment[xxx])
  fd.append('equipment[isothermal_bag]', form.equipment_isothermal_bag ? '1' : '0')
  fd.append('equipment[top_case]', form.equipment_top_case ? '1' : '0')
  fd.append('equipment[refrigerated_bag]', form.equipment_refrigerated_bag ? '1' : '0')
  fd.append('cni_type', form.cni_type)
  fd.append('accepted_terms', form.accepted_terms ? '1' : '0')

  // Fichiers (RN : { uri, name, type })
  fd.append('cni', form.cni as unknown as Blob)
  if (form.photo) fd.append('photo', form.photo as unknown as Blob)
  if (form.cni_back) fd.append('cni_back', form.cni_back as unknown as Blob)
  if (form.driving_license) fd.append('driving_license', form.driving_license as unknown as Blob)

  const { data } = await api.post('/auth/register/driver', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60_000, // upload de plusieurs photos : marge large
  })
  return { token: data.token as string }
}
