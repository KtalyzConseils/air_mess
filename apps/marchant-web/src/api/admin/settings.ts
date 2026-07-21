import api from '../client'

export interface SettingChoice {
  value: string
  label: string
  description?: string | null
}

export interface AppSetting {
  key: string
  value: number | string | boolean | unknown[] | Record<string, unknown>
  type: 'number' | 'string' | 'boolean' | 'json'
  label: string | null
  description: string | null
  /**
   * Si défini, le setting est une énumération : l'UI rend un segmented control
   * au lieu d'un champ libre. Le backend valide que la valeur est bien dans la liste.
   */
  choices: SettingChoice[] | null
  group: string
  updated_at: string | null
  updated_by: { id: number; name: string } | null
}

/** Réponse groupée par catégorie (pricing, quotas...) */
export type SettingsByGroup = Record<string, AppSetting[]>

export async function fetchSettings(): Promise<SettingsByGroup> {
  const { data } = await api.get<{ settings: SettingsByGroup }>('/admin/settings')
  return data.settings
}

export async function updateSetting(
  key: string,
  value: AppSetting['value'],
): Promise<AppSetting['value']> {
  const { data } = await api.patch(`/admin/settings/${key}`, { value })
  return data.value
}
