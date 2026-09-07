import { useCallback, useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Location from 'expo-location'
import { Image } from 'expo-image'
import { Link } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import Card from '../../components/ui/Card'
import Screen from '../../components/ui/Screen'
import { fetchCourses, type Course } from '../../api/courses'
import { fetchUnreadCount } from '../../api/notifications'
import { useLanguageStore } from '../../stores/languageStore'

const DASHBOARD_COPY = {
  fr: {
    loadError: 'Impossible de charger tes donnees.',
    newCourse: 'Creer une nouvelle course',
    whatAreWeDelivering: 'Nous livrons quoi ?',
    yourPosition: 'Votre position',
    locationDenied: 'Localisation refusee',
    positionDetected: 'Position detectee',
    positionUnavailable: 'Position indisponible',
    openNotifications: 'Ouvrir les notifications',
    detectPosition: 'Detecter votre position',
    detecting: 'Detection...',
    todayCourses: 'Courses du jour',
    activeCourse: (count: number) => `${count} course${count > 1 ? 's' : ''} encore active${count > 1 ? 's' : ''}`,
    latestCourses: 'Dernieres courses',
    seeAll: 'Voir tout',
    noCourses: 'Aucune course pour le moment',
    noCoursesSubtitle: 'Cree ta premiere livraison avec le bouton jaune.',
    toDestination: 'vers',
    someStats: 'Quelques stats',
    active: 'En cours',
    deliveredMonth: 'Livrees ce mois',
    awaiting: 'En attribution',
    revenueMonth: 'CA livre',
  },
  en: {
    loadError: 'Unable to load your data.',
    newCourse: 'Create a new delivery',
    whatAreWeDelivering: "What are we delivering?",
    yourPosition: 'Your location',
    locationDenied: 'Location denied',
    positionDetected: 'Location detected',
    positionUnavailable: 'Location unavailable',
    openNotifications: 'Open notifications',
    detectPosition: 'Detect your location',
    detecting: 'Detecting...',
    todayCourses: "Today's deliveries",
    activeCourse: (count: number) => `${count} ${count > 1 ? 'deliveries' : 'delivery'} still active`,
    latestCourses: 'Latest deliveries',
    seeAll: 'See all',
    noCourses: 'No deliveries yet',
    noCoursesSubtitle: 'Create your first delivery with the yellow button.',
    toDestination: 'to',
    someStats: 'Some stats',
    active: 'Active',
    deliveredMonth: 'Delivered this month',
    awaiting: 'Awaiting assignment',
    revenueMonth: 'Revenue delivered',
  },
} as const

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
  const language = useLanguageStore((state) => state.language)
  const copy = DASHBOARD_COPY[language]
  const coursesQuery = useQuery({
    queryKey: ['courses', { per_page: 50 }],
    queryFn: () => fetchCourses({ per_page: 50 }),
  })

  const courses = coursesQuery.data?.data ?? EMPTY_COURSES
  const stats = useMemo(() => getCourseStats(courses), [courses])
  const latestCourses = courses.slice(0, 5)

  return (
    <View className="flex-1 bg-cream dark:bg-[#0F1115]">
      <Screen scroll py={18} className="px-5">
        <Header />

        {coursesQuery.isLoading ? (
          <Card className="mb-4 items-center py-10">
            <ActivityIndicator color="#1A1614" />
          </Card>
        ) : coursesQuery.isError ? (
          <Card variant="danger" className="mb-4">
            <Text className="font-bold text-airmess-red">{copy.loadError}</Text>
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
          accessibilityLabel={copy.newCourse}
        >
          <View className="flex-row items-center">
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-ink">
              <Ionicons name="cube-outline" size={20} color="#FFCC00" />
            </View>
          <Text className="text-lg font-extrabold text-ink">{copy.whatAreWeDelivering}</Text>
          </View>
          <Ionicons name="arrow-forward" size={22} color="#1A1614" />
        </Pressable>
      </Link>
    </View>
  )
}

function Header() {
  const language = useLanguageStore((state) => state.language)
  const copy = DASHBOARD_COPY[language]
  const [positionLabel, setPositionLabel] = useState<string>(copy.yourPosition)
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState(false)
  const { data: unread = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: fetchUnreadCount,
    refetchInterval: 30_000,
  })

  const detectPosition = useCallback(async () => {
    setLocating(true)
    setLocationError(false)

    try {
      const permission = await Location.requestForegroundPermissionsAsync()
      if (permission.status !== 'granted') {
        setLocationError(true)
        setPositionLabel(copy.locationDenied)
        return
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })
      const reverse = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }).catch(() => [])
      const first = reverse[0]
      const nextLabel =
        [first?.district || first?.subregion || first?.street, first?.city || first?.region]
          .filter(Boolean)
          .join(', ') || copy.positionDetected

      setPositionLabel(nextLabel)
    } catch {
      setLocationError(true)
      setPositionLabel(copy.positionUnavailable)
    } finally {
      setLocating(false)
    }
  }, [copy])

  return (
    <View className="mb-5">
      <View className="mb-4 flex-row items-start justify-between">
        <View className="h-14 w-36 items-start justify-center">
          <Image
            source={require('../../../assets/logo/airmess-wordmark.svg')}
            style={{ width: 132, height: 38 }}
            contentFit="contain"
          />
        </View>
        <View className="flex-row items-center gap-2">
          <Link href="/(tabs)/notifications" asChild>
            <Pressable
              className="relative h-12 w-12 items-center justify-center rounded-full border-2 bg-airmess-dark shadow-card"
              accessibilityRole="button"
              accessibilityLabel={copy.openNotifications}
            >
              <Ionicons name="notifications" size={24} color="#FFCC00" />
              {unread > 0 && (
                <View className="absolute -right-1.5 -top-1.5 min-h-6 min-w-6 items-center justify-center rounded-full border-2 border-cream bg-airmess-red px-1">
                  <Text className="text-[10px] font-extrabold text-white" numberOfLines={1}>
                    {unread > 9 ? '9+' : unread}
                  </Text>
                </View>
              )}
            </Pressable>
          </Link>
          {/* <Link href="/(tabs)/profile" asChild>
            <Pressable
              className="h-12 w-12 items-center justify-center rounded-2xl border border-warm-200 bg-off-white"
              accessibilityRole="button"
              accessibilityLabel="Ouvrir le profil"
            >
              <Ionicons name="person" size={23} color="#1A1614" />
            </Pressable>
          </Link> */}
        </View>
      </View>

      <Pressable
        onPress={() => void detectPosition()}
        className={[
          'max-w-[82%] self-start flex-row items-center rounded-full border px-3 py-2.5 shadow-card',
          locationError
            ? 'border-airmess-red/30 bg-danger-bg dark:bg-[#2A1518]'
            : 'border-airmess-yellow/40 bg-white dark:bg-[#181B24]',
        ].join(' ')}
        accessibilityRole="button"
        accessibilityLabel={copy.detectPosition}
      >
        <View
          className={[
            'mr-2 h-8 w-8 items-center justify-center rounded-full',
            locationError ? 'bg-white dark:bg-[#11141B]' : 'bg-airmess-yellow',
          ].join(' ')}
        >
          {locating ? (
            <ActivityIndicator size="small" color="#1A1614" />
          ) : (
            <Ionicons
              name={locationError ? 'alert-circle-outline' : 'navigate-outline'}
              size={16}
              color={locationError ? '#D40511' : '#1A1614'}
            />
          )}
        </View>
        <Text className="flex-shrink text-sm font-extrabold text-ink dark:text-white" numberOfLines={1}>
          {locating ? copy.detecting : positionLabel}
        </Text>
        <Ionicons name="chevron-forward" size={15} color="#8A7E68" style={{ marginLeft: 4 }} />
      </Pressable>
    </View>
  )
}

function TodayCard({ count, active }: { count: number; active: number }) {
  const language = useLanguageStore((state) => state.language)
  const copy = DASHBOARD_COPY[language]
  return (
    <Card variant="dark" padding="lg" className="mb-5 overflow-hidden">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-5">
          <Text className="mb-3 text-xs font-extrabold uppercase tracking-widest text-airmess-yellow">
            {copy.todayCourses}
          </Text>
          <Text className="text-6xl font-extrabold leading-[68px] text-white">{count}</Text>
          <Text className="mt-2 text-base font-semibold text-warm-300">
            {copy.activeCourse(active)}
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
  const language = useLanguageStore((state) => state.language)
  const copy = DASHBOARD_COPY[language]
  return (
    <View className="mb-5">
      <View className="mb-3 flex-row items-end justify-between">
        <Text className="text-xl font-extrabold text-ink dark:text-white">{copy.latestCourses}</Text>
        <Link href="/(tabs)/courses" asChild>
          <Pressable hitSlop={8}>
            <Text className="text-sm font-bold text-warm-600 dark:text-[#AEB6C5]">{copy.seeAll}</Text>
          </Pressable>
        </Link>
      </View>

      {courses.length === 0 ? (
        <Card className="items-center py-8">
          <View className="mb-3 h-12 w-12 items-center justify-center rounded-full bg-warm-100 dark:bg-[#11141B]">
            <Ionicons name="receipt-outline" size={22} color="#6B6250" />
          </View>
          <Text className="text-center text-base font-extrabold text-ink dark:text-white">{copy.noCourses}</Text>
          <Text className="mt-1 text-center text-sm leading-5 text-warm-600 dark:text-[#AEB6C5]">
            {copy.noCoursesSubtitle}
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
  const language = useLanguageStore((state) => state.language)
  const copy = DASHBOARD_COPY[language]
  return (
    <Link href={{ pathname: '/courses/[id]', params: { id: String(course.id) } }} asChild>
    <Pressable accessibilityRole="button">
    <Card padding="md">
      <View className="flex-row items-center justify-between gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-2xl bg-warm-100 dark:bg-[#11141B]">
          <Ionicons name={getCourseIcon(course.status)} size={20} color="#1A1614" />
        </View>

        <View className="flex-1">
          <View className="mb-1 flex-row items-center justify-between gap-2">
            <Text className="font-mono text-xs font-bold text-warm-500">{course.reference}</Text>
            <StatusPill status={course.status} label={course.status_label} />
          </View>
          <Text className="text-base font-extrabold text-ink dark:text-white" numberOfLines={1}>
            {course.origin_quartier} {copy.toDestination} {course.destination_quartier}
          </Text>
          <Text className="mt-0.5 text-sm text-warm-600 dark:text-[#AEB6C5]" numberOfLines={1}>
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
  const language = useLanguageStore((state) => state.language)
  const copy = DASHBOARD_COPY[language]
  return (
    <View>
      <Text className="mb-3 text-xl font-extrabold text-ink dark:text-white">{copy.someStats}</Text>
      <View className="flex-row gap-3">
        <StatTile label={copy.active} value={stats.active} icon="navigate-outline" />
        <StatTile label={copy.deliveredMonth} value={stats.deliveredMonth} icon="checkmark-done-outline" />
      </View>
      <View className="mt-3 flex-row gap-3">
        <StatTile label={copy.awaiting} value={stats.awaiting} icon="time-outline" />
        <StatTile label={copy.revenueMonth} value={formatShortMoney(stats.revenueMonth)} icon="cash-outline" />
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
      <Text className="mt-3 text-2xl font-extrabold text-ink dark:text-white" numberOfLines={1}>
        {value}
      </Text>
      <Text className="mt-1 text-xs font-bold uppercase tracking-widest text-warm-500 dark:text-[#AEB6C5]" numberOfLines={2}>
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
