import { View, Text, ScrollView, Pressable, ActivityIndicator, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { fetchDriverStats, type DriverStats, type StatPeriod } from '../api/driver'
import { useAuthStore } from '../stores/authStore'
import Card from '../components/ui/Card'

const PERIODS: { key: StatPeriod; label: string; short: string }[] = [
  { key: 'today', label: "Aujourd'hui", short: 'J' },
  { key: 'last_7', label: '7 jours', short: '7j' },
  { key: 'last_30', label: '30 jours', short: '30j' },
  { key: 'all_time', label: 'Total', short: 'All' },
]

function formatMoney(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1000) return `${Math.round(value / 1000)}k`
  return value ? value.toLocaleString('fr-FR') : '0'
}

export default function DriverStatsScreen() {
  const router = useRouter()
  const { width } = useWindowDimensions()
  const driver = useAuthStore((s) => s.user?.driver)
  const acceptanceRate =
    driver?.acceptance_rate != null ? Math.round(Number(driver.acceptance_rate)) : null

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['driver-stats'],
    queryFn: fetchDriverStats,
  })

  const stats = data ?? emptyStats()
  const total = stats.all_time
  const qualityRating = stats.quality_rating
  const maxCourses = Math.max(...PERIODS.map((p) => stats[p.key]?.courses ?? 0), 1)
  const maxEarnings = Math.max(...PERIODS.map((p) => stats[p.key]?.earnings ?? 0), 1)
  const chartWidth = Math.min(width - 80, 320)
  const accepted = Math.max(0, Math.min(100, acceptanceRate ?? 0))
  const declined = Math.max(0, 100 - accepted)

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 36 }}
      >
        <View className="flex-row items-center mb-5">
          <Pressable
            onPress={() => router.back()}
            className="w-11 h-11 rounded-full bg-off-white border border-warm-200 items-center justify-center mr-3"
            accessibilityRole="button"
            accessibilityLabel="Retour"
          >
            <Ionicons name="arrow-back" size={20} color="#1A1614" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-2xl font-jk-extrabold text-ink">Statistiques</Text>
            <Text className="text-warm-500 text-sm font-jk-medium">
              Graphes de performance
            </Text>
          </View>
          <Pressable
            onPress={() => refetch()}
            className="w-11 h-11 rounded-full bg-airmess-dark items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel="Actualiser"
          >
            {isRefetching ? (
              <ActivityIndicator size="small" color="#FFCC00" />
            ) : (
              <Ionicons name="refresh" size={18} color="#FFCC00" />
            )}
          </Pressable>
        </View>

        <Card variant="dark" padding="lg" className="mb-4">
          <View className="flex-row items-start justify-between">
            <View>
              <Text className="text-warm-300 text-xs font-jk-bold uppercase tracking-wide">
                Gains total
              </Text>
              <Text className="text-airmess-yellow text-4xl font-jk-extrabold mt-1">
                {formatMoney(total.earnings)}
                <Text className="text-base text-warm-300 font-jk-bold"> FCFA</Text>
              </Text>
            </View>
            <View className="w-12 h-12 rounded-2xl bg-white/10 items-center justify-center">
              <Ionicons name="trending-up" size={24} color="#FFCC00" />
            </View>
          </View>
          <View className="flex-row mt-5 pt-4 border-t border-white/10">
            <MiniKpi label="Courses" value={String(total.courses)} />
            <View className="w-px bg-white/10 mx-3" />
            <MiniKpi label="Acceptation" value={acceptanceRate != null ? `${acceptanceRate}%` : '—'} />
          </View>
        </Card>

        {isLoading ? (
          <Card variant="default" padding="lg" className="items-center">
            <ActivityIndicator color="#1A1614" />
            <Text className="text-warm-500 text-sm font-jk-medium mt-3">Chargement...</Text>
          </Card>
        ) : (
          <>
            <HistogramChart
              title="Histogramme des courses"
              icon="bar-chart-outline"
              data={PERIODS.map((p) => ({
                label: p.label,
                short: p.short,
                value: stats[p.key].courses,
                max: maxCourses,
              }))}
            />

            <CurveChart
              title="Courbe des gains"
              icon="analytics-outline"
              width={chartWidth}
              data={PERIODS.map((p) => ({
                label: p.label,
                short: p.short,
                value: stats[p.key].earnings,
                max: maxEarnings,
              }))}
            />

            <DonutChart accepted={accepted} declined={declined} />

            {qualityRating && <QualityCard rating={qualityRating} />}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function emptyStats(): DriverStats {
  return {
    today: { courses: 0, earnings: 0 },
    last_7: { courses: 0, earnings: 0 },
    last_30: { courses: 0, earnings: 0 },
    all_time: { courses: 0, earnings: 0 },
  }
}

function MiniKpi({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1">
      <Text className="text-white text-xl font-jk-extrabold">{value}</Text>
      <Text className="text-warm-400 text-[10px] font-jk-bold uppercase tracking-wide mt-0.5">
        {label}
      </Text>
    </View>
  )
}

function ChartHeader({
  title,
  icon,
}: {
  title: string
  icon: keyof typeof Ionicons.glyphMap
}) {
  return (
    <View className="flex-row items-center mb-4">
      <View className="w-10 h-10 rounded-xl bg-airmess-yellow/25 items-center justify-center mr-3">
        <Ionicons name={icon} size={20} color="#1A1614" />
      </View>
      <Text className="text-ink text-base font-jk-extrabold">{title}</Text>
    </View>
  )
}

function HistogramChart({
  title,
  icon,
  data,
}: {
  title: string
  icon: keyof typeof Ionicons.glyphMap
  data: Array<{ label: string; short: string; value: number; max: number }>
}) {
  return (
    <Card variant="default" padding="lg" className="mt-4">
      <ChartHeader title={title} icon={icon} />
      <View className="h-44 rounded-2xl bg-airmess-dark px-3 pt-4 pb-3 flex-row items-end justify-between">
        {data.map((item, index) => {
          const height = Math.max(18, Math.min(128, (item.value / item.max) * 128))
          return (
            <View key={item.short} className="flex-1 items-center justify-end">
              <Text className="text-white text-xs font-jk-extrabold mb-2">{item.value}</Text>
              <View className="w-10 rounded-full bg-white/10 justify-end overflow-hidden" style={{ height: 132 }}>
                <View
                  className={index === data.length - 1 ? 'bg-success rounded-full' : 'bg-airmess-yellow rounded-full'}
                  style={{ height }}
                />
              </View>
              <Text className="text-warm-300 text-[10px] font-jk-bold mt-2">{item.short}</Text>
            </View>
          )
        })}
      </View>
      <View className="flex-row justify-between mt-3">
        {data.map((item) => (
          <Text key={item.short} className="text-warm-500 text-[10px] font-jk-bold flex-1 text-center">
            {item.label}
          </Text>
        ))}
      </View>
    </Card>
  )
}

function CurveChart({
  title,
  icon,
  width,
  data,
}: {
  title: string
  icon: keyof typeof Ionicons.glyphMap
  width: number
  data: Array<{ label: string; short: string; value: number; max: number }>
}) {
  const height = 170
  const points = data.map((item, index) => {
    const x = 18 + (index * (width - 36)) / Math.max(1, data.length - 1)
    const y = 22 + (1 - item.value / item.max) * 104
    return { ...item, x, y }
  })

  return (
    <Card variant="default" padding="lg" className="mt-4">
      <ChartHeader title={title} icon={icon} />
      <View className="items-center">
        <View className="rounded-2xl bg-off-white border border-warm-200 overflow-hidden" style={{ width, height }}>
          <View className="absolute left-0 right-0 top-[42px] h-px bg-warm-100" />
          <View className="absolute left-0 right-0 top-[86px] h-px bg-warm-100" />
          <View className="absolute left-0 right-0 top-[130px] h-px bg-warm-100" />

          {points.slice(0, -1).map((point, index) => {
            const next = points[index + 1]
            const dx = next.x - point.x
            const dy = next.y - point.y
            const length = Math.sqrt(dx * dx + dy * dy)
            const angle = Math.atan2(dy, dx) * (180 / Math.PI)
            return (
              <View
                key={`${point.short}-${next.short}`}
                className="absolute h-1 rounded-full bg-airmess-yellow"
                style={{
                  width: length,
                  left: point.x,
                  top: point.y,
                  transform: [
                    { translateX: length / 2 },
                    { rotate: `${angle}deg` },
                    { translateX: -length / 2 },
                  ],
                }}
              />
            )
          })}

          {points.map((point) => (
            <View key={point.short}>
              <View
                className="absolute w-4 h-4 rounded-full bg-airmess-yellow border-2 border-airmess-dark"
                style={{ left: point.x - 8, top: point.y - 8 }}
              />
              <Text
                className="absolute text-[10px] text-ink font-jk-extrabold"
                style={{ left: Math.max(4, point.x - 18), top: Math.max(0, point.y - 28) }}
              >
                {formatMoney(point.value)}
              </Text>
              <Text
                className="absolute text-[10px] text-warm-500 font-jk-bold"
                style={{ left: Math.max(4, point.x - 10), top: 142 }}
              >
                {point.short}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </Card>
  )
}

function DonutChart({ accepted, declined }: { accepted: number; declined: number }) {
  const ticks = Array.from({ length: 40 }, (_, i) => i)
  const activeTicks = Math.round((accepted / 100) * ticks.length)

  return (
    <Card variant="default" padding="lg" className="mt-4">
      <ChartHeader title="Diagramme acceptées / refusées" icon="pie-chart-outline" />
      <View className="flex-row items-center">
        <View className="w-40 h-40 items-center justify-center">
          {ticks.map((tick) => {
            const angle = (tick / ticks.length) * 360
            return (
              <View
                key={tick}
                className={tick < activeTicks ? 'absolute bg-airmess-yellow' : 'absolute bg-airmess-red'}
                style={{
                  width: 5,
                  height: 17,
                  borderRadius: 999,
                  transform: [{ rotate: `${angle}deg` }, { translateY: -62 }],
                }}
              />
            )
          })}
          <View className="w-24 h-24 rounded-full bg-off-white border border-warm-200 items-center justify-center">
            <Text className="text-ink text-3xl font-jk-extrabold">{accepted}%</Text>
            <Text className="text-warm-500 text-[10px] font-jk-bold uppercase">Accept.</Text>
          </View>
        </View>

        <View className="flex-1 ml-4 gap-3">
          <LegendRow color="#FFCC00" label="Acceptées" value={`${accepted}%`} />
          <LegendRow color="#D40511" label="Refusées" value={`${declined}%`} />
          <View className="rounded-2xl bg-warm-100 p-3">
            <Text className="text-ink text-xs font-jk-bold leading-4">
              Un bon taux garde ton profil prioritaire sur les propositions proches.
            </Text>
          </View>
        </View>
      </View>
    </Card>
  )
}

function QualityCard({
  rating,
}: {
  rating: NonNullable<DriverStats['quality_rating']>
}) {
  return (
    <Card variant="default" padding="lg" className="mt-4">
      <ChartHeader title="Qualité de service" icon="star-outline" />
      <View className="rounded-2xl bg-airmess-dark p-4">
        <View className="flex-row items-center justify-between">
          <View>
            <View className="flex-row items-center">
              {[1, 2, 3, 4, 5].map((n) => (
                <Ionicons
                  key={n}
                  name={n <= rating.stars ? 'star' : 'star-outline'}
                  size={22}
                  color="#FFCC00"
                  style={{ marginRight: 2 }}
                />
              ))}
            </View>
            <Text className="text-warm-300 text-xs font-jk-medium mt-2">
              {rating.summary}
            </Text>
          </View>
          <Text className="text-airmess-yellow text-4xl font-jk-extrabold">
            {rating.label}
          </Text>
        </View>
      </View>

      <View className="mt-4 gap-2">
        <QualityRow label="Courses livrées" value={rating.criteria.delivered_courses} />
        <QualityRow label="Acceptation" value={`${Math.round(rating.criteria.acceptance_rate)}%`} />
        <QualityRow label="Incidents" value={rating.criteria.incidents_count} />
        <QualityRow label="Courses échouées" value={rating.criteria.failed_courses} />
      </View>
    </Card>
  )
}

function QualityRow({ label, value }: { label: string; value: string | number }) {
  return (
    <View className="flex-row items-center justify-between bg-warm-100 rounded-xl px-3 py-2">
      <Text className="text-warm-600 text-xs font-jk-bold">{label}</Text>
      <Text className="text-ink text-xs font-jk-extrabold">{value}</Text>
    </View>
  )
}

function LegendRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between">
      <View className="flex-row items-center">
        <View className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: color }} />
        <Text className="text-warm-600 text-sm font-jk-bold">{label}</Text>
      </View>
      <Text className="text-ink text-sm font-jk-extrabold">{value}</Text>
    </View>
  )
}
