import { View, Text } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { fetchDriverStats } from '../api/driver'

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
      <View className="bg-airmess-dark rounded-2xl p-4 mb-4 opacity-60">
        <Text className="text-gray-400 text-xs">Chargement de vos stats...</Text>
      </View>
    )
  }

  const today = data.today
  const week = data.last_7

  return (
    <View className="bg-airmess-dark rounded-2xl p-4 mb-4">
      <Text className="text-airmess-yellow text-xs font-bold uppercase tracking-widest mb-2">
        Aujourd'hui
      </Text>

      <View className="flex-row justify-between items-end">
        <View>
          <Text className="text-white text-3xl font-bold">
            {today.earnings.toLocaleString('fr-FR')}
            <Text className="text-gray-400 text-base font-normal"> FCFA</Text>
          </Text>
          <Text className="text-gray-400 text-xs mt-0.5">Gains</Text>
        </View>

        <View className="items-end">
          <Text className="text-white text-2xl font-bold">
            {today.courses}
            <Text className="text-gray-400 text-sm font-normal">
              {' '}course{today.courses > 1 ? 's' : ''}
            </Text>
          </Text>
          <Text className="text-gray-400 text-xs mt-0.5">Livrées</Text>
        </View>
      </View>

      <View className="border-t border-white/10 mt-3 pt-2 flex-row items-center justify-between">
        <Text className="text-gray-400 text-xs">Cette semaine</Text>
        <Text className="text-gray-300 text-xs font-semibold">
          {formatFCFA(week.earnings)} · {week.courses} course{week.courses > 1 ? 's' : ''}
        </Text>
      </View>
    </View>
  )
}
