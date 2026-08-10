/** Normalise vers E.164 — aligné avec App\Support\Phone::normalize. */
export function normalizePhone(raw: string): string {
  let phone = raw.trim().replace(/[\s\-.()]+/g, '')
  if (phone.startsWith('00')) phone = `+${phone.slice(2)}`
  if (phone && !phone.startsWith('+')) phone = `+229${phone}`
  return phone
}
