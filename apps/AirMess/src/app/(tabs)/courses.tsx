import { useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Link } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import Card from '../../components/ui/Card'
import Screen from '../../components/ui/Screen'
import { fetchCourses, type Course } from '../../api/courses'
import { useLanguageStore, type AppLanguage } from '../../stores/languageStore'

type StatusGroup = 'all' | 'pending' | 'in_progress' | 'delivered' | 'cancelled'

const GROUP_STATUSES: Record<StatusGroup, string[]> = {
  all: [],
  pending: ['pending_preparation', 'awaiting_assignment'],
  in_progress: ['assigned', 'driver_to_pickup', 'at_pickup', 'picked_up', 'at_dropoff'],
  delivered: ['delivered'],
  cancelled: ['cancelled', 'failed', 'disputed'],
}

const GROUPS: StatusGroup[] = ['all', 'pending', 'in_progress', 'delivered', 'cancelled']
const EMPTY_COURSES: Course[] = []
const EMPTY_COURSES_PAGE = {
  data: EMPTY_COURSES,
  current_page: 1,
  last_page: 1,
  total: 0,
  per_page: 100,
}

const COURSES_COPY = {
  fr: {
    locale: 'fr-FR',
    groupLabels: {
      all: 'Toutes',
      pending: 'Attente',
      in_progress: 'En cours',
      delivered: 'Livrees',
      cancelled: 'Annulees',
    } as Record<StatusGroup, string>,
    historyLabel: 'Historique',
    title: 'Mes courses',
    subtitle: 'Suivi de tes livraisons et anciens trajets.',
    newCourse: 'Nouvelle course',
    searchPlaceholder: 'Reference, destinataire, quartier...',
    total: 'Total',
    inProgress: 'En cours',
    delivered: 'Livrees',
    toDestination: 'vers',
    noDriver: 'Livreur non assigne',
    noCourseFound: 'Aucune course trouvee',
    noCourse: 'Aucune course',
    tryOtherFilter: 'Essaie un autre filtre ou une autre recherche.',
    coursesAppearHere: 'Tes livraisons apparaitront ici apres creation.',
    statusLabels: {
      pending_preparation: 'Preparation',
      awaiting_assignment: 'En attribution',
      assigned: 'Assignee',
      driver_to_pickup: 'Livreur en route',
      at_pickup: 'Au retrait',
      picked_up: 'Recuperee',
      at_dropoff: 'En livraison',
      delivered: 'Livree',
      cancelled: 'Annulee',
      failed: 'Echec',
      disputed: 'Litige',
    } as Record<string, string>,
  },
  en: {
    locale: 'en-US',
    groupLabels: {
      all: 'All',
      pending: 'Pending',
      in_progress: 'In progress',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
    } as Record<StatusGroup, string>,
    historyLabel: 'History',
    title: 'My deliveries',
    subtitle: 'Track your deliveries and past trips.',
    newCourse: 'New delivery',
    searchPlaceholder: 'Reference, recipient, area...',
    total: 'Total',
    inProgress: 'In progress',
    delivered: 'Delivered',
    toDestination: 'to',
    noDriver: 'No driver assigned',
    noCourseFound: 'No delivery found',
    noCourse: 'No deliveries',
    tryOtherFilter: 'Try another filter or search term.',
    coursesAppearHere: 'Your deliveries will appear here once created.',
    statusLabels: {
      pending_preparation: 'Preparation',
      awaiting_assignment: 'Awaiting assignment',
      assigned: 'Assigned',
      driver_to_pickup: 'Driver on the way',
      at_pickup: 'At pickup',
      picked_up: 'Picked up',
      at_dropoff: 'Out for delivery',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
      failed: 'Failed',
      disputed: 'Disputed',
    } as Record<string, string>,
  },
} as const

type CoursesCopy = (typeof COURSES_COPY)[AppLanguage]

export default function CoursesScreen() {
  const language = useLanguageStore((state) => state.language)
  const copy = COURSES_COPY[language]
  const [group, setGroup] = useState<StatusGroup>('all')
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['courses', { per_page: 100 }],
    queryFn: () => fetchCourses({ per_page: 100 }).catch(() => EMPTY_COURSES_PAGE),
  })

  const allCourses = data?.data ?? EMPTY_COURSES

  const counts = useMemo(() => getCounts(allCourses), [allCourses])
  const filtered = useMemo(() => {
    let result = allCourses

    if (group !== 'all') {
      result = result.filter((course) => GROUP_STATUSES[group].includes(course.status))
    }

    const query = search.trim().toLowerCase()
    if (query.length > 0) {
      result = result.filter((course) =>
        [
          course.reference,
          course.destination_name,
          course.destination_quartier,
          course.destination_city,
          course.origin_quartier,
        ]
          .join(' ')
          .toLowerCase()
          .includes(query),
      )
    }

    return result
  }, [allCourses, group, search])

  return (
    <Screen scroll py={18} className="px-5">
      <View className="mb-5 flex-row items-start justify-between">
        <View className="flex-1 pr-4">
          <Text className="text-xs font-extrabold uppercase tracking-widest text-airmess-red">
            {copy.historyLabel}
          </Text>
          <Text className="mt-1 text-3xl font-extrabold text-ink">{copy.title}</Text>
          <Text className="mt-1 text-sm font-semibold text-warm-500">
            {copy.subtitle}
          </Text>
        </View>
        <Link href="/(tabs)/new-course" asChild>
          <Pressable
            className="h-12 w-12 items-center justify-center rounded-full bg-airmess-yellow"
            accessibilityRole="button"
            accessibilityLabel={copy.newCourse}
          >
            <Ionicons name="add" size={24} color="#1A1614" />
          </Pressable>
        </Link>
      </View>

      <View className="mb-4 flex-row items-center rounded-2xl border border-warm-200 bg-off-white px-4">
        <Ionicons name="search" size={18} color="#8A7E68" />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={copy.searchPlaceholder}
          placeholderTextColor="#B8AF9F"
          className="ml-3 h-13 flex-1 text-base font-semibold text-ink"
          autoCapitalize="none"
        />
        {search.length > 0 ? (
          <Pressable onPress={() => setSearch('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color="#8A7E68" />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-5 -mx-5"
        contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
      >
        {GROUPS.map((item) => (
          <FilterChip
            key={item}
            label={copy.groupLabels[item]}
            count={counts[item]}
            active={group === item}
            onPress={() => setGroup(item)}
          />
        ))}
      </ScrollView>

      <View className="mb-4 flex-row gap-3">
        <SummaryTile label={copy.total} value={counts.all} />
        <SummaryTile label={copy.inProgress} value={counts.in_progress} accent />
        <SummaryTile label={copy.delivered} value={counts.delivered} />
      </View>

      {isLoading ? (
        <Card className="items-center py-10">
          <ActivityIndicator color="#1A1614" />
        </Card>
      ) : filtered.length === 0 ? (
        <EmptyState hasSearch={search.trim().length > 0 || group !== 'all'} copy={copy} />
      ) : (
        <View className="gap-3">
          {filtered.map((course) => (
            <CourseHistoryCard key={course.id} course={course} copy={copy} />
          ))}
        </View>
      )}
    </Screen>
  )
}

function FilterChip({
  label,
  count,
  active,
  onPress,
}: {
  label: string
  count: number
  active: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      className={[
        'h-11 flex-row items-center rounded-full px-4',
        active ? 'bg-airmess-dark' : 'bg-off-white border border-warm-200',
      ].join(' ')}
      accessibilityRole="button"
    >
      <Text className={['text-sm font-extrabold', active ? 'text-white' : 'text-warm-600'].join(' ')}>
        {label}
      </Text>
      <View className={['ml-2 min-w-6 items-center rounded-full px-1.5 py-0.5', active ? 'bg-airmess-yellow' : 'bg-warm-100'].join(' ')}>
        <Text className="text-[10px] font-extrabold text-ink">{count}</Text>
      </View>
    </Pressable>
  )
}

function SummaryTile({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <Card variant={accent ? 'accent' : 'default'} className="flex-1">
      <Text className="text-[10px] font-extrabold uppercase tracking-widest text-warm-600">
        {label}
      </Text>
      <Text className="mt-2 text-2xl font-extrabold text-ink">{value}</Text>
    </Card>
  )
}

function CourseHistoryCard({ course, copy }: { course: Course; copy: CoursesCopy }) {
  return (
    <Link href={{ pathname: '/courses/[id]', params: { id: String(course.id) } }} asChild>
    <Pressable accessibilityRole="button">
    <Card padding="md">
      <View className="mb-3 flex-row items-center justify-between gap-3">
        <View className="flex-row items-center">
          <View className={['h-11 w-11 items-center justify-center rounded-2xl', statusIconBg(course.status)].join(' ')}>
            <Ionicons name={statusIcon(course.status)} size={20} color={statusIconColor(course.status)} />
          </View>
          <View className="ml-3">
            <Text className="font-mono text-xs font-bold text-warm-500">{course.reference}</Text>
            <Text className="mt-0.5 text-xs font-semibold text-warm-500">{formatDate(course.created_at, copy.locale)}</Text>
          </View>
        </View>
        <StatusPill status={course.status} label={course.status_label} copy={copy} />
      </View>

      <Text className="text-lg font-extrabold text-ink" numberOfLines={1}>
        {course.origin_quartier} {copy.toDestination} {course.destination_quartier}
      </Text>
      <Text className="mt-1 text-sm font-semibold text-warm-600" numberOfLines={1}>
        {course.destination_name}, {course.destination_city}
      </Text>

      <View className="mt-4 flex-row items-center justify-between border-t border-warm-200 pt-3">
        <View className="flex-row items-center">
          <Ionicons name="cash-outline" size={16} color="#8A7E68" />
          <Text className="ml-1.5 text-sm font-extrabold text-ink">
            {course.delivery_fee.toLocaleString(copy.locale)} FCFA
          </Text>
        </View>
        <View className="flex-row items-center">
          <Ionicons name="person-outline" size={15} color="#8A7E68" />
          <Text className="ml-1 text-xs font-semibold text-warm-500" numberOfLines={1}>
            {course.driver?.user.name ?? copy.noDriver}
          </Text>
        </View>
      </View>
    </Card>
    </Pressable>
    </Link>
  )
}

function StatusPill({ status, label, copy }: { status: string; label?: string; copy: CoursesCopy }) {
  return (
    <View className={['rounded-full px-2.5 py-1', statusPillTone(status)].join(' ')}>
      <Text className="text-[10px] font-extrabold uppercase" numberOfLines={1}>
        {label ?? fallbackStatusLabel(status, copy)}
      </Text>
    </View>
  )
}

function EmptyState({ hasSearch, copy }: { hasSearch: boolean; copy: CoursesCopy }) {
  return (
    <Card className="items-center py-10">
      <View className="mb-3 h-14 w-14 items-center justify-center rounded-full bg-warm-100">
        <Ionicons name={hasSearch ? 'filter-outline' : 'cube-outline'} size={24} color="#6B6250" />
      </View>
      <Text className="text-center text-lg font-extrabold text-ink">
        {hasSearch ? copy.noCourseFound : copy.noCourse}
      </Text>
      <Text className="mt-1 text-center text-sm leading-5 text-warm-600">
        {hasSearch ? copy.tryOtherFilter : copy.coursesAppearHere}
      </Text>
    </Card>
  )
}

function getCounts(courses: Course[]): Record<StatusGroup, number> {
  return {
    all: courses.length,
    pending: courses.filter((course) => GROUP_STATUSES.pending.includes(course.status)).length,
    in_progress: courses.filter((course) => GROUP_STATUSES.in_progress.includes(course.status)).length,
    delivered: courses.filter((course) => GROUP_STATUSES.delivered.includes(course.status)).length,
    cancelled: courses.filter((course) => GROUP_STATUSES.cancelled.includes(course.status)).length,
  }
}

function statusPillTone(status: string) {
  if (GROUP_STATUSES.pending.includes(status)) return 'bg-warning-bg text-warning'
  if (GROUP_STATUSES.delivered.includes(status)) return 'bg-success-bg text-success'
  if (GROUP_STATUSES.cancelled.includes(status)) return 'bg-danger-bg text-danger'
  return 'bg-info-bg text-info'
}

function statusIconBg(status: string) {
  if (GROUP_STATUSES.pending.includes(status)) return 'bg-warning-bg'
  if (GROUP_STATUSES.delivered.includes(status)) return 'bg-success-bg'
  if (GROUP_STATUSES.cancelled.includes(status)) return 'bg-danger-bg'
  return 'bg-info-bg'
}

function statusIconColor(status: string) {
  if (GROUP_STATUSES.pending.includes(status)) return '#F59E0B'
  if (GROUP_STATUSES.delivered.includes(status)) return '#16A34A'
  if (GROUP_STATUSES.cancelled.includes(status)) return '#D40511'
  return '#0284C7'
}

function statusIcon(status: string): keyof typeof Ionicons.glyphMap {
  if (GROUP_STATUSES.pending.includes(status)) return 'time-outline'
  if (GROUP_STATUSES.delivered.includes(status)) return 'checkmark-done-outline'
  if (GROUP_STATUSES.cancelled.includes(status)) return 'close-circle-outline'
  return 'bicycle-outline'
}

function fallbackStatusLabel(status: string, copy: CoursesCopy) {
  return copy.statusLabels[status] ?? status.replaceAll('_', ' ')
}

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}
