import { View, Text } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { fetchDriverStats } from '../api/driver'

/**
 * Carte "Aujourd'hui" (hero sombre) : 3 tuiles — gains du jour, courses livrées,
 * gains de la semaine. Le seul bloc où l'argent gagné est mis en avant.
 */

/** 14 800 → "14.8k" ; 900 → "900". */
function formatK(n: number): string {
  if (n >= 1000) {
    return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  }
  return String(n)
}

function todayLabel(): string {
  try {
    const s = new Date().toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
    return s.charAt(0).toLowerCase() + s.slice(1)
  } catch {
    return ''
  }
}

export default function TodayKpiBanner() {
  const { data, isLoading } = useQuery({
    queryKey: ['driver-stats'],
    queryFn: fetchDriverStats,
    refetchInterval: 60_000,
  })

  const today = data?.today
  const week = data?.last_7

  return (
    <View className="bg-airmess-dark rounded-3xl p-5">
      {/* En-tête : AUJOURD'HUI + date */}
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center">
          <View className="w-1 h-4 bg-airmess-yellow rounded-full mr-2" />
          <Text className="text-airmess-yellow text-[11px] font-jk-extrabold uppercase tracking-[2px]">
            Aujourd'hui
          </Text>
        </View>
        <Text className="text-warm-400 text-xs font-jk-medium">{todayLabel()}</Text>
      </View>

      {/* Tuiles */}
      <View className="flex-row gap-2">
        <Tile
          icon="cash-outline"
          label="Gains"
          value={isLoading || !today ? '—' : formatK(today.earnings)}
          unit="FCFA"
        />
        <Tile
          icon="cube-outline"
          label="Courses"
          value={isLoading || !today ? '—' : String(today.courses)}
          unit="livrées"
        />
        <Tile
          icon="trending-up-outline"
          label="Semaine"
          value={isLoading || !week ? '—' : formatK(week.earnings)}
          unit="FCFA"
        />
      </View>
    </View>
  )
}

function Tile({
  icon,
  label,
  value,
  unit,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  value: string
  unit: string
}) {
  return (
    <View className="flex-1 bg-white/5 rounded-2xl px-3 py-3">
      <View className="flex-row items-center mb-2">
        <Ionicons name={icon} size={13} color="#FFCC00" />
        <Text className="text-warm-400 text-[10px] font-jk-bold uppercase tracking-wide ml-1.5">
          {label}
        </Text>
      </View>
      <Text className="text-white text-xl font-jk-extrabold" numberOfLines={1}>
        {value}
      </Text>
      <Text className="text-warm-500 text-[11px] font-jk-medium mt-0.5">{unit}</Text>
    </View>
  )
}
