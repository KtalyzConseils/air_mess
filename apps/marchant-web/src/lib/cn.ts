/**
 * Concatène des classes CSS conditionnellement.
 * Garde uniquement les chaînes — tout le reste (false, null, 0, undefined) est ignoré.
 * Permet `cn('base', isActive && 'active', leftIcon && 'pl-2')` sans souci de typage.
 */
export function cn(...classes: Array<unknown>): string {
  return classes.filter((c): c is string => typeof c === 'string' && c.length > 0).join(' ')
}
