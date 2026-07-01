import { View, Text } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { fetchDriverStats } from '../api/driver'

/**
 * Bandeau dark avec les stats du jour + rappel semaine.
 *
 * Design signature : le seul bloc sombre de la home = attire l'œil sur
 * l'argent gagné. Le jaune brand souligne le label "Aujourd'hui".
 */
function formatFCFA(n: number): string {
  return n.toLocaleString('fr-FR') + ' FCFA'
}

export default function TodayKpiBanner() {
  const { data, isLoading } = useQuery({
    queryKey: ['driver-stats'],
    queryFn: fetchDriverStats,
    refetchInterval: 60_000,
  })

  if (isLoading || !data) {
    return (
      <View className="bg-airmess-dark rounded-2xl p-4 opacity-70">
        <Text className="text-warm-400 text-xs">Chargement de vos stats…</Text>
      </View>
    )
  }

  const today = data.today
  const week = data.last_7

  return (
    <View className="bg-airmess-dark rounded-2xl p-4">
      <View className="flex-row items-center mb-3">
        <View className="w-1 h-4 bg-airmess-yellow rounded-full mr-2" />
        <Text className="text-airmess-yellow text-xs font-extrabold uppercase tracking-widest">
          Aujourd'hui
        </Text>
      </View>

      <View className="flex-row justify-between items-end">
        <View>
          <Text className="text-white text-3xl font-extrabold">
            {today.earnings.toLocaleString('fr-FR')}
            <Text className="text-warm-400 text-base font-normal"> FCFA</Text>
          </Text>
          <Text className="text-warm-400 text-xs mt-1">Gains</Text>
        </View>

        <View className="items-end">
          <Text className="text-white text-2xl font-bold">
            {today.courses}
            <Text className="text-warm-400 text-sm font-normal">
              {' '}course{today.courses > 1 ? 's' : ''}
            </Text>
          </Text>
          <Text className="text-warm-400 text-xs mt-1">Livrées</Text>
        </View>
      </View>

      <View className="border-t border-white/10 mt-3 pt-2 flex-row items-center justify-between">
        <Text className="text-warm-400 text-xs">Cette semaine</Text>
        <Text className="text-warm-300 text-xs font-semibold">
          {formatFCFA(week.earnings)} · {week.courses} course{week.courses > 1 ? 's' : ''}
        </Text>
      </View>
    </View>
  )
}
