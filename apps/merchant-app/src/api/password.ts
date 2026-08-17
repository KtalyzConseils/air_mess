import api from './client'

/**
 * Étape 1 du reset : l'API envoie un email contenant un lien vers marchant-web
 * (`/reset-password?token=…`). La réponse est volontairement neutre côté back —
 * elle ne dit jamais si l'email existe (anti-énumération de comptes).
 */
export async function requestPasswordReset(email: string): Promise<string> {
  const { data } = await api.post<{ message: string }>('/auth/password/forgot', { email })
  return data.message
}

/**
 * Changer le mot de passe quand connecté.
 * Requires l'ancien mot de passe pour confirmer l'identité.
 */
export async function updatePassword(currentPassword: string, newPassword: string): Promise<string> {
  const { data } = await api.post<{ message: string }>('/auth/password/update', {
    current_password: currentPassword,
    password: newPassword,
    password_confirmation: newPassword,
  })
  return data.message
}
