const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  'https://api.airmess-logistics.com/api'

export const OTP_SEND_URL =
  (import.meta.env.VITE_OTP_SEND_URL as string | undefined) ??
  `${API_BASE_URL}/auth/phone/otp/send`
export const OTP_VERIFY_URL =
  (import.meta.env.VITE_OTP_VERIFY_URL as string | undefined) ??
  `${API_BASE_URL}/auth/phone/otp/verify`
export const DRIVER_SURVEY_URL =
  (import.meta.env.VITE_DRIVER_SURVEY_URL as string | undefined) ??
  `${API_BASE_URL}/waitlist/drivers`

// Demo data must be an explicit opt-in. Falling back to a fake success when an
// environment variable is missing makes real respondents disappear silently.
export const DRIVER_DEMO_MODE = import.meta.env.VITE_DRIVER_DEMO_MODE === 'true'

const DEMO_SMS_CODE = '123456'
const API_HEADERS = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
}

export interface SendDriverOtpResult {
  ok: boolean
  expires_in: number
  demo: boolean
}

export interface VerifyDriverOtpResult {
  verification_token: string
  expires_in: number
  demo: boolean
}

export interface DriverSurveyPayload {
  survey: string
  version: string
  mode: string
  response: {
    response_id: string
    started_at: string
    submitted_at: string
    duration_s: number
    suspect: boolean
    src: string
    completed: boolean
    stop_reason: string | null
    answers: Record<string, unknown>
  }
  account: DriverAccountPayload | null
}

export interface DriverAccountPayload {
  prenom: string
  nom: string
  telephone: string
  operateur: string
  zone: string
  majeur: boolean
  consentements: {
    cgu_version: string
    cgu_at: string
    confidentialite_at: string
  }
  verification_token: string
  profil_operationnel: Record<string, unknown>
  bonus_demande: true
  source: string
  src: string
}

export interface DriverSurveyResponse {
  compte: {
    id: string | null
    statut: 'en_liste_attente' | 'non_ouvert'
    deja_existant: boolean
  }
  liste_attente: {
    zone: string
    position_zone: number | null
  }
  bonus: {
    statut: 'credite_bloque' | 'en_verification' | 'non_attribue'
    montant: string
  }
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 8) return `+229${digits}`
  if (digits.length === 10 && digits.startsWith('01')) return `+229${digits}`
  if (digits.length === 11 && digits.startsWith('229')) return `+${digits}`
  if (digits.length === 13 && digits.startsWith('22901')) return `+${digits}`
  return phone
}

function wait(durationMs: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, durationMs))
}

function createDemoResponse(phone: string): DriverSurveyResponse {
  const suffix = normalizePhone(phone).slice(-4).padStart(4, '0')

  return {
    compte: {
      id: `LIV-DEMO-${suffix}`,
      statut: 'en_liste_attente',
      deja_existant: false,
    },
    liste_attente: {
      zone: '',
      position_zone: null,
    },
    bonus: {
      statut: 'credite_bloque',
      montant: '500 FCFA',
    },
  }
}

export async function sendDriverOtp(phone: string): Promise<SendDriverOtpResult> {
  if (DRIVER_DEMO_MODE) {
    await wait(500)
    return { ok: true, expires_in: 600, demo: true }
  }

  const response = await fetch(OTP_SEND_URL, {
    method: 'POST',
    headers: API_HEADERS,
    body: JSON.stringify({
      phone: normalizePhone(phone),
    }),
  })

  const data = (await response.json().catch(() => ({}))) as Partial<SendDriverOtpResult> & { message?: string }

  if (!response.ok) {
    throw Object.assign(new Error(data.message || 'Impossible d’envoyer le code SMS pour le moment.'), {
      status: response.status,
    })
  }

  return { ...data, ok: true, expires_in: data.expires_in ?? 600, demo: false }
}

export async function verifyDriverOtp(phone: string, code: string): Promise<VerifyDriverOtpResult> {
  if (DRIVER_DEMO_MODE) {
    await wait(450)
    if (code !== DEMO_SMS_CODE) {
      throw Object.assign(new Error('Code incorrect. En mode démonstration, utilisez 123456.'), { status: 400 })
    }
    return {
      verification_token: `demo-token-${Date.now()}`,
      expires_in: 604800,
      demo: true,
    }
  }

  const response = await fetch(OTP_VERIFY_URL, {
    method: 'POST',
    headers: API_HEADERS,
    body: JSON.stringify({
      phone: normalizePhone(phone),
      code,
    }),
  })

  const data = (await response.json().catch(() => ({}))) as Partial<VerifyDriverOtpResult> & { message?: string }

  if (!response.ok) {
    throw Object.assign(new Error(data.message || 'Ce code n’est pas valide. Réessayez.'), {
      status: response.status,
    })
  }

  const apiData = data as Partial<VerifyDriverOtpResult> & {
    phone_verification_token?: string
  }

  return {
    verification_token:
      apiData.verification_token ?? apiData.phone_verification_token ?? '',
    expires_in: apiData.expires_in ?? 900,
    demo: false,
  }
}

export async function submitDriverSurvey(payload: DriverSurveyPayload): Promise<DriverSurveyResponse> {
  if (DRIVER_DEMO_MODE) {
    await wait(900)
    const phone = payload.account?.telephone ?? ''
    const demoResponse = createDemoResponse(phone)
    return {
      ...demoResponse,
      liste_attente: {
        zone: payload.account?.zone ?? '',
        position_zone: null,
      },
    }
  }

  const response = await fetch(DRIVER_SURVEY_URL, {
    method: 'POST',
    headers: API_HEADERS,
    body: JSON.stringify(payload),
  })

  const data = (await response.json().catch(() => ({}))) as Partial<DriverSurveyResponse> & { message?: string }

  if (!response.ok) {
    throw Object.assign(new Error(data.message || 'Votre réponse n’a pas pu être envoyée.'), {
      status: response.status,
    })
  }

  return data as DriverSurveyResponse
}

export { DEMO_SMS_CODE }
