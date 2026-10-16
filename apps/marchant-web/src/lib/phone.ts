/**
 * Normalise un numéro vers E.164 : "+229 01 90 12 34 56" → "+2290190123456".
 * Doit rester alignée avec App\Support\Phone::normalize côté API, sinon le
 * claim phone_number du jeton Firebase ne matchera pas le numéro soumis.
 */
export function normalizePhone(raw: string): string {
  let phone = raw.trim().replace(/[\s\-.()]+/g, '')
  if (phone.startsWith('00')) phone = `+${phone.slice(2)}`
  if (phone && !phone.startsWith('+')) phone = `+229${phone}`
  return phone
}

/**
 * Numéro au format attendu par wa.me : indicatif inclus, chiffres seuls, sans « + ».
 * Un numéro local (8 chiffres ou 10 chiffres « 01… ») reçoit l'indicatif 229.
 * Un numéro déjà saisi avec 229 mais sans « + » n'est pas préfixé une seconde fois.
 */
export function whatsappNumber(raw: string): string {
  const compact = raw.trim().replace(/[\s\-.()]+/g, '')
  const digits = compact.replace(/\D/g, '')
  if (!compact.startsWith('+') && !compact.startsWith('00') && /^229(\d{8}|\d{10})$/.test(digits)) {
    return digits
  }
  return normalizePhone(compact).replace(/\D/g, '')
}
