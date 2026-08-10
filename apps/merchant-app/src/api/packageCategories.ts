import api from './client'

export interface PackageCategory {
  id: number
  code: string
  name: string
  requires_isothermal_bag: boolean
}

export async function fetchPackageCategories(): Promise<PackageCategory[]> {
  const { data } = await api.get('/package-categories')
  return data
}
