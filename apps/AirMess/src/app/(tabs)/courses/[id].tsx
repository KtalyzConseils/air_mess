import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import Card from '../../../components/ui/Card'
import Screen from '../../../components/ui/Screen'
import { cancelCourse, fetchCourse, type Course } from '../../../api/courses'
import { useLanguageStore, type AppLanguage } from '../../../stores/languageStore'

const COURSE_DETAIL_COPY = {
  fr: {
    locale: 'fr-FR',
    back: 'Retour',
    title: 'Detail course',
    loadError: 'Impossible de charger cette course.',
    createdOn: 'Creee le',
    trip: 'Trajet',
    departure: 'Depart',
    arrival: 'Arrivee',
    departureAddress: 'Adresse de depart',
    toDestination: 'vers',
    price: 'Prix',
    urgency: 'Urgence',
    express: 'Express',
    standard: 'Standard',
    package: 'Colis',
    noDescription: 'Description non renseignee',
    size: 'Taille',
    recipient: 'Destinataire',
    name: 'Nom',
    phone: 'Telephone',
    driver: 'Livreur',
    noDriver: 'Aucun livreur assigne pour le moment.',
    pickup: 'Retrait',
    delivery: 'Livraison',
    cancelCourse: 'Annuler la course',
    cancelling: 'Annulation...',
    cancelConfirmTitle: 'Annuler cette course ?',
    cancelConfirmBody: "La course sera annulee et le livreur sera libere si elle n'a pas encore ete recuperee.",
    cancelConfirmAction: 'Annuler la course',
    cancelPostPickupTitle: 'Colis deja recupere',
    cancelPostPickupBody: 'Le livreur a deja le colis. Confirmer annulera la course et declenchera le retour vers vous.',
    keepCourse: 'Garder',
    cancelFailedTitle: 'Annulation impossible',
    cancelSuccessTitle: 'Course annulee',
    cancelSuccessBody: 'La course a bien ete annulee.',
  },
  en: {
    locale: 'en-US',
    back: 'Back',
    title: 'Delivery detail',
    loadError: 'Unable to load this delivery.',
    createdOn: 'Created on',
    trip: 'Trip',
    departure: 'Pickup',
    arrival: 'Drop-off',
    departureAddress: 'Pickup address',
    toDestination: 'to',
    price: 'Price',
    urgency: 'Urgency',
    express: 'Express',
    standard: 'Standard',
    package: 'Package',
    noDescription: 'No description provided',
    size: 'Size',
    recipient: 'Recipient',
    name: 'Name',
    phone: 'Phone',
    driver: 'Driver',
    noDriver: 'No driver assigned yet.',
    pickup: 'Pickup',
    delivery: 'Delivery',
    cancelCourse: 'Cancel delivery',
    cancelling: 'Cancelling...',
    cancelConfirmTitle: 'Cancel this delivery?',
    cancelConfirmBody: 'The delivery will be cancelled and the driver will be released if it has not been picked up yet.',
    cancelConfirmAction: 'Cancel delivery',
    cancelPostPickupTitle: 'Package already picked up',
    cancelPostPickupBody: 'The driver already has the package. Confirming will cancel the delivery and start the return to you.',
    keepCourse: 'Keep',
    cancelFailedTitle: 'Cancellation failed',
    cancelSuccessTitle: 'Delivery cancelled',
    cancelSuccessBody: 'The delivery was cancelled.',
  },
} as const

type CourseDetailCopy = (typeof COURSE_DETAIL_COPY)[AppLanguage]

export default function CourseDetailScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { id } = useLocalSearchParams<{ id: string }>()
  const language = useLanguageStore((state) => state.language)
  const copy = COURSE_DETAIL_COPY[language]

  const courseQuery = useQuery({
    queryKey: ['course', id],
    queryFn: () => fetchCourse(id),
    enabled: !!id,
  })

  const cancelMutation = useMutation({
    mutationFn: (payload: { confirm_post_pickup?: boolean } = {}) => cancelCourse(id, payload),
    onSuccess: async (course) => {
      queryClient.setQueryData(['course', id], course)
      await queryClient.invalidateQueries({ queryKey: ['courses'] })
      Alert.alert(copy.cancelSuccessTitle, copy.cancelSuccessBody)
    },
    onError: (error) => {
      if (isAxiosError(error) && error.response?.data?.requires_post_pickup_confirm) {
        Alert.alert(copy.cancelPostPickupTitle, copy.cancelPostPickupBody, [
          { text: copy.keepCourse, style: 'cancel' },
          {
            text: copy.cancelConfirmAction,
            style: 'destructive',
            onPress: () => cancelMutation.mutate({ confirm_post_pickup: true }),
          },
        ])
        return
      }

      Alert.alert(copy.cancelFailedTitle, getApiErrorMessage(error))
    },
  })

  const confirmCancelCourse = () => {
    if (cancelMutation.isPending || !courseQuery.data || !canCancelCourse(courseQuery.data.status)) return

    Alert.alert(copy.cancelConfirmTitle, copy.cancelConfirmBody, [
      { text: copy.keepCourse, style: 'cancel' },
      {
        text: copy.cancelConfirmAction,
        style: 'destructive',
        onPress: () => cancelMutation.mutate({}),
      },
    ])
  }

  return (
    <Screen scroll py={14} className="px-5">
      <View className="mb-4 flex-row items-center justify-between">
        <Pressable
          onPress={() => router.replace('/(tabs)/dashboard')}
          className="h-11 w-11 items-center justify-center rounded-full bg-off-white dark:bg-[#181B24]"
          accessibilityRole="button"
          accessibilityLabel={copy.back}
        >
          <Ionicons name="arrow-back" size={24} color="#1A1614" />
        </Pressable>
        <Text className="text-base font-extrabold text-ink dark:text-white">{copy.title}</Text>
        <View className="h-11 w-11" />
      </View>

      {courseQuery.isLoading ? (
        <Card className="items-center py-10">
          <ActivityIndicator color="#1A1614" />
        </Card>
      ) : courseQuery.isError || !courseQuery.data ? (
        <Card variant="danger">
          <Text className="font-bold text-airmess-red">{copy.loadError}</Text>
        </Card>
      ) : (
        <CourseDetail
          course={courseQuery.data}
          copy={copy}
          cancelling={cancelMutation.isPending}
          onCancel={confirmCancelCourse}
        />
      )}
    </Screen>
  )
}

function CourseDetail({
  course,
  copy,
  cancelling,
  onCancel,
}: {
  course: Course
  copy: CourseDetailCopy
  cancelling: boolean
  onCancel: () => void
}) {
  const cancellable = canCancelCourse(course.status)

  return (
    <>
      <Card variant="dark" padding="lg" className="mb-4">
        <View className="mb-4 flex-row items-start justify-between gap-4">
          <View className="flex-1">
            <Text className="font-mono text-sm font-extrabold text-airmess-yellow">
              {course.reference}
            </Text>
            <Text className="mt-2 text-2xl font-extrabold text-white" numberOfLines={2}>
              {course.origin_quartier} {copy.toDestination} {course.destination_quartier}
            </Text>
          </View>
          <StatusPill status={course.status} label={course.status_label} />
        </View>
        <Text className="text-sm font-semibold text-warm-300">
          {copy.createdOn} {formatDate(course.created_at, copy.locale)}
        </Text>
      </Card>

      <Card className="mb-4">
        <SectionTitle icon="navigate-outline" title={copy.trip} />
        <RoutePoint label={copy.departure} title={course.origin_name ?? copy.departureAddress} subtitle={`${course.origin_quartier}, ${course.origin_city}`} />
        <View className="ml-5 h-6 w-px bg-warm-300" />
        <RoutePoint label={copy.arrival} title={course.destination_name} subtitle={`${course.destination_quartier}, ${course.destination_city}`} />
      </Card>

      <View className="mb-4 flex-row gap-3">
        <InfoTile icon="cash-outline" label={copy.price} value={`${course.delivery_fee.toLocaleString(copy.locale)} FCFA`} />
        <InfoTile icon="flash-outline" label={copy.urgency} value={course.urgency === 'express' ? copy.express : copy.standard} />
      </View>

      <Card className="mb-4">
        <SectionTitle icon="cube-outline" title={copy.package} />
        <Text className="text-base font-extrabold text-ink dark:text-white">
          {course.package_description ?? copy.noDescription}
        </Text>
        <Text className="mt-1 text-sm font-semibold text-warm-500 dark:text-[#AEB6C5]">
          {copy.size} {course.package_size ?? '--'}
        </Text>
      </Card>

      <Card className="mb-4">
        <SectionTitle icon="person-outline" title={copy.recipient} />
        <InfoRow label={copy.name} value={course.destination_name} />
        <InfoRow label={copy.phone} value={course.destination_phone ?? '--'} />
      </Card>

      <Card className="mb-4">
        <SectionTitle icon="bicycle-outline" title={copy.driver} />
        {course.driver ? (
          <>
            <InfoRow label={copy.name} value={course.driver.user.name} />
            <InfoRow label={copy.phone} value={course.driver.user.phone} />
          </>
        ) : (
          <Text className="text-sm font-semibold text-warm-500 dark:text-[#AEB6C5]">{copy.noDriver}</Text>
        )}
      </Card>

      <View className="mb-4 flex-row gap-3">
        <CodeTile label={copy.pickup} value={course.pickup_code ?? '--'} />
        <CodeTile label={copy.delivery} value={course.delivery_code ?? '--'} />
      </View>

      {cancellable && (
        <Pressable
          onPress={onCancel}
          disabled={cancelling}
          className={[
            'mb-4 min-h-14 flex-row items-center justify-center rounded-2xl border border-airmess-red/30 bg-danger-bg px-5 py-3 dark:bg-[#2A1518]',
            cancelling ? 'opacity-60' : '',
          ].join(' ')}
          accessibilityRole="button"
        >
          {cancelling ? (
            <ActivityIndicator color="#D40511" />
          ) : (
            <Ionicons name="close-circle-outline" size={21} color="#D40511" />
          )}
          <Text className="ml-2 text-base font-extrabold text-airmess-red">
            {cancelling ? copy.cancelling : copy.cancelCourse}
          </Text>
        </Pressable>
      )}
    </>
  )
}

function SectionTitle({ icon, title }: { icon: keyof typeof Ionicons.glyphMap; title: string }) {
  return (
    <View className="mb-3 flex-row items-center">
      <View className="mr-2 h-8 w-8 items-center justify-center rounded-full bg-warm-100 dark:bg-[#11141B]">
        <Ionicons name={icon} size={17} color="#D40511" />
      </View>
      <Text className="text-lg font-extrabold text-ink dark:text-white">{title}</Text>
    </View>
  )
}

function RoutePoint({ label, title, subtitle }: { label: string; title: string; subtitle: string }) {
  return (
    <View className="flex-row items-start">
      <View className="mr-3 mt-1 h-10 w-10 items-center justify-center rounded-full bg-airmess-yellow">
        <Ionicons name="location" size={18} color="#1A1614" />
      </View>
      <View className="flex-1">
        <Text className="text-xs font-extrabold uppercase tracking-widest text-warm-500 dark:text-[#AEB6C5]">{label}</Text>
        <Text className="mt-0.5 text-base font-extrabold text-ink dark:text-white">{title}</Text>
        <Text className="mt-0.5 text-sm font-semibold text-warm-600 dark:text-[#AEB6C5]">{subtitle}</Text>
      </View>
    </View>
  )
}

function InfoTile({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <Card className="flex-1">
      <Ionicons name={icon} size={20} color="#D40511" />
      <Text className="mt-3 text-xs font-extrabold uppercase tracking-widest text-warm-500 dark:text-[#AEB6C5]">{label}</Text>
      <Text className="mt-1 text-base font-extrabold text-ink dark:text-white" numberOfLines={1}>{value}</Text>
    </Card>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between border-t border-warm-200 py-3 first:border-t-0 dark:border-[#2A2F3A]">
      <Text className="text-sm font-semibold text-warm-500 dark:text-[#AEB6C5]">{label}</Text>
      <Text className="ml-4 flex-1 text-right text-sm font-extrabold text-ink dark:text-white" numberOfLines={1}>{value}</Text>
    </View>
  )
}

function CodeTile({ label, value }: { label: string; value: string }) {
  return (
    <Card className="flex-1 items-center">
      <Text className="text-xs font-extrabold uppercase tracking-widest text-warm-500 dark:text-[#AEB6C5]">{label}</Text>
      <Text className="mt-2 font-mono text-2xl font-extrabold text-ink dark:text-white">{value}</Text>
    </Card>
  )
}

function StatusPill({ status, label }: { status: string; label?: string }) {
  const tone =
    status === 'delivered'
      ? 'bg-success-bg text-success'
      : status === 'cancelled' || status === 'failed'
        ? 'bg-danger-bg text-danger'
        : status === 'awaiting_assignment'
          ? 'bg-warning-bg text-warning'
          : 'bg-info-bg text-info'

  return (
    <View className={['rounded-full px-2.5 py-1', tone].join(' ')}>
      <Text className="text-[10px] font-extrabold uppercase" numberOfLines={1}>
        {label ?? status.replaceAll('_', ' ')}
      </Text>
    </View>
  )
}

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function canCancelCourse(status: string) {
  return !['cancelled', 'failed', 'delivered', 'disputed', 'returning_to_sender', 'returned_to_sender'].includes(status)
}

function getApiErrorMessage(error: unknown) {
  if (isAxiosError(error)) {
    const data = error.response?.data as { message?: string; errors?: Record<string, string[]> } | undefined
    return data?.message ?? Object.values(data?.errors ?? {})[0]?.[0] ?? COURSE_DETAIL_COPY.fr.cancelFailedTitle
  }

  return COURSE_DETAIL_COPY.fr.cancelFailedTitle
}
