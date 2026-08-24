import { useMemo } from 'react'
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Link } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import Card from '../../components/ui/Card'
import Screen from '../../components/ui/Screen'
import { fetchCourses, type Course } from '../../api/courses'

const ACTIVE_STATUSES = [
  'awaiting_assignment',
  'assigned',
  'driver_to_pickup',
  'at_pickup',
  'picked_up',
  'at_dropoff',
]

const EMPTY_COURSES: Course[] = []

export default function DashboardScreen() {
  const coursesQuery = useQuery({
    queryKey: ['courses', { per_page: 50 }],
    queryFn: () => fetchCourses({ per_page: 50 }),
  })

  const courses = coursesQuery.data?.data ?? EMPTY_COURSES
  const stats = useMemo(() => getCourseStats(courses), [courses])
  const latestCourses = courses.slice(0, 5)

  return (
    <View className="flex-1 bg-cream">
      <Screen scroll py={18} className="px-5">
        <Header />

        {coursesQuery.isLoading ? (
          <Card className="mb-4 items-center py-10">
            <ActivityIndicator color="#1A1614" />
          </Card>
        ) : coursesQuery.isError ? (
          <Card variant="danger" className="mb-4">
            <Text className="font-bold text-airmess-red">Impossible de charger tes donnees.</Text>
          </Card>
        ) : (
          <>
            <TodayCard count={stats.today} active={stats.active} />
            <LatestCourses courses={latestCourses} />
            <StatsGrid stats={stats} />
          </>
        )}

        <View className="h-24" />
      </Screen>

      <Link href="/(tabs)/new-course" asChild>
        <Pressable
          className="absolute bottom-[76px] left-8 right-8 h-16 flex-row items-center justify-between rounded-2xl bg-airmess-yellow px-5 shadow-cta"
          accessibilityRole="button"
          accessibilityLabel="Creer une nouvelle course"
        >
          <View className="flex-row items-center">
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-ink">
              <Ionicons name="cube-outline" size={20} color="#FFCC00" />
            </View>
            <Text className="text-lg font-extrabold text-ink">Nous livrons quoi ?</Text>
          </View>
          <Ionicons name="arrow-forward" size={22} color="#1A1614" />
        </Pressable>
      </Link>
    </View>
  )
}

function Header() {
  return (
    <View className="mb-5">
      <View className="mb-4 flex-row items-start justify-between">
        <View className="h-14 w-28 items-center justify-center rounded-2xl bg-airmess-dark">
          <Image
            source={require('../../../assets/images/splash-icon.png')}
            style={{ width: 82, height: 46 }}
            resizeMode="contain"
          />
        </View>
        <Link href="/(tabs)/profile" asChild>
          <Pressable
            className="h-11 w-11 items-center justify-center rounded-full bg-off-white border border-warm-200"
            accessibilityRole="button"
            accessibilityLabel="Ouvrir le profil"
          >
            <Ionicons name="person-outline" size={22} color="#1A1614" />
          </Pressable>
        </Link>
      </View>

      <Pressable
        className="self-start flex-row items-center rounded-2xl border border-warm-200 bg-off-white px-3.5 py-3 shadow-card"
        accessibilityRole="button"
      >
        <View className="mr-2 h-7 w-7 items-center justify-center rounded-full bg-danger-bg">
          <Ionicons name="location-outline" size={15} color="#D40511" />
        </View>
        <Text className="text-sm font-extrabold text-ink">Votre position</Text>
        <Ionicons name="chevron-down" size={15} color="#8A7E68" />
      </Pressable>
    </View>
  )
}

function TodayCard({ count, active }: { count: number; active: number }) {
  return (
    <Card variant="dark" padding="lg" className="mb-5 overflow-hidden">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-5">
          <Text className="mb-3 text-xs font-extrabold uppercase tracking-widest text-airmess-yellow">
            Courses du jour
          </Text>
          <Text className="text-6xl font-extrabold leading-[68px] text-white">{count}</Text>
          <Text className="mt-2 text-base font-semibold text-warm-300">
            {active} course{active > 1 ? 's' : ''} encore active{active > 1 ? 's' : ''}
          </Text>
        </View>
        <View className="h-16 w-16 items-center justify-center rounded-2xl bg-airmess-yellow">
          <Ionicons name="cube-outline" size={31} color="#1A1614" />
        </View>
      </View>
    </Card>
  )
}

function LatestCourses({ courses }: { courses: Course[] }) {
  return (
    <View className="mb-5">
      <View className="mb-3 flex-row items-end justify-between">
        <Text className="text-xl font-extrabold text-ink">Dernieres courses</Text>
        <Link href="/(tabs)/courses" asChild>
          <Pressable hitSlop={8}>
            <Text className="text-sm font-bold text-warm-600">Voir tout</Text>
          </Pressable>
        </Link>
      </View>

      {courses.length === 0 ? (
        <Card className="items-center py-8">
          <View className="mb-3 h-12 w-12 items-center justify-center rounded-full bg-warm-100">
            <Ionicons name="receipt-outline" size={22} color="#6B6250" />
          </View>
          <Text className="text-center text-base font-extrabold text-ink">Aucune course pour le moment</Text>
          <Text className="mt-1 text-center text-sm leading-5 text-warm-600">
            Cree ta premiere livraison avec le bouton jaune.
          </Text>
        </Card>
      ) : (
        <View className="gap-3">
          {courses.map((course) => (
            <CourseRow key={course.id} course={course} />
          ))}
        </View>
      )}
    </View>
  )
}

function CourseRow({ course }: { course: Course }) {
  return (
    <Link href={{ pathname: '/courses/[id]', params: { id: String(course.id) } }} asChild>
    <Pressable accessibilityRole="button">
    <Card padding="md">
      <View className="flex-row items-center justify-between gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-2xl bg-warm-100">
          <Ionicons name={getCourseIcon(course.status)} size={20} color="#1A1614" />
        </View>

        <View className="flex-1">
          <View className="mb-1 flex-row items-center justify-between gap-2">
            <Text className="font-mono text-xs font-bold text-warm-500">{course.reference}</Text>
            <StatusPill status={course.status} label={course.status_label} />
          </View>
          <Text className="text-base font-extrabold text-ink" numberOfLines={1}>
            {course.origin_quartier} vers {course.destination_quartier}
          </Text>
          <Text className="mt-0.5 text-sm text-warm-600" numberOfLines={1}>
            {course.destination_name}, {course.destination_city}
          </Text>
        </View>
      </View>
    </Card>
    </Pressable>
    </Link>
  )
}

function StatsGrid({ stats }: { stats: ReturnType<typeof getCourseStats> }) {
  return (
    <View>
      <Text className="mb-3 text-xl font-extrabold text-ink">Quelques stats</Text>
      <View className="flex-row gap-3">
        <StatTile label="En cours" value={stats.active} icon="navigate-outline" />
        <StatTile label="Livrees ce mois" value={stats.deliveredMonth} icon="checkmark-done-outline" />
      </View>
      <View className="mt-3 flex-row gap-3">
        <StatTile label="En attribution" value={stats.awaiting} icon="time-outline" />
        <StatTile label="CA livre" value={formatShortMoney(stats.revenueMonth)} icon="cash-outline" />
      </View>
    </View>
  )
}

function StatTile({
  label,
  value,
  icon,
}: {
  label: string
  value: number | string
  icon: keyof typeof Ionicons.glyphMap
}) {
  return (
    <Card className="flex-1">
      <Ionicons name={icon} size={20} color="#D40511" />
      <Text className="mt-3 text-2xl font-extrabold text-ink" numberOfLines={1}>
        {value}
      </Text>
      <Text className="mt-1 text-xs font-bold uppercase tracking-widest text-warm-500" numberOfLines={2}>
        {label}
      </Text>
    </Card>
  )
}

function StatusPill({ status, label }: { status: string; label?: string }) {
  const tone =
    status === 'awaiting_assignment'
      ? 'bg-warning-bg text-warning'
      : status === 'delivered'
        ? 'bg-success-bg text-success'
        : status === 'cancelled' || status === 'failed'
          ? 'bg-danger-bg text-danger'
          : 'bg-info-bg text-info'

  return (
    <View className={['rounded-full px-2.5 py-1', tone].join(' ')}>
      <Text className="text-[10px] font-extrabold uppercase" numberOfLines={1}>
        {label ?? status.replaceAll('_', ' ')}
      </Text>
    </View>
  )
}

function getCourseStats(courses: Course[]) {
  const today = new Date().toISOString().slice(0, 10)
  const month = today.slice(0, 7)

  const deliveredMonth = courses.filter(
    (course) => course.status === 'delivered' && course.delivered_at?.startsWith(month),
  )

  return {
    today: courses.filter((course) => course.created_at.startsWith(today)).length,
    active: courses.filter((course) => ACTIVE_STATUSES.includes(course.status)).length,
    awaiting: courses.filter((course) => course.status === 'awaiting_assignment').length,
    deliveredMonth: deliveredMonth.length,
    revenueMonth: deliveredMonth.reduce((sum, course) => sum + (course.delivery_fee ?? 0), 0),
  }
}

function getCourseIcon(status: string): keyof typeof Ionicons.glyphMap {
  if (status === 'delivered') return 'checkmark-done-outline'
  if (status === 'awaiting_assignment') return 'time-outline'
  if (status === 'cancelled' || status === 'failed') return 'close-circle-outline'
  return 'bicycle-outline'
}

function formatShortMoney(value: number) {
  if (value >= 1_000_000) return `${Math.round(value / 100_000) / 10}M`
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`
  return value.toLocaleString('fr-FR')
}
