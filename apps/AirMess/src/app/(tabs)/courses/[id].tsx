import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import Card from '../../../components/ui/Card'
import Screen from '../../../components/ui/Screen'
import { fetchCourse, type Course } from '../../../api/courses'

export default function CourseDetailScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()

  const courseQuery = useQuery({
    queryKey: ['course', id],
    queryFn: () => fetchCourse(id),
    enabled: !!id,
  })

  return (
    <Screen scroll py={14} className="px-5">
      <View className="mb-4 flex-row items-center justify-between">
        <Pressable
          onPress={() => router.replace('/(tabs)/dashboard')}
          className="h-11 w-11 items-center justify-center rounded-full bg-off-white"
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <Ionicons name="arrow-back" size={24} color="#1A1614" />
        </Pressable>
        <Text className="text-base font-extrabold text-ink">Detail course</Text>
        <View className="h-11 w-11" />
      </View>

      {courseQuery.isLoading ? (
        <Card className="items-center py-10">
          <ActivityIndicator color="#1A1614" />
        </Card>
      ) : courseQuery.isError || !courseQuery.data ? (
        <Card variant="danger">
          <Text className="font-bold text-airmess-red">Impossible de charger cette course.</Text>
        </Card>
      ) : (
        <CourseDetail course={courseQuery.data} />
      )}
    </Screen>
  )
}

function CourseDetail({ course }: { course: Course }) {
  return (
    <>
      <Card variant="dark" padding="lg" className="mb-4">
        <View className="mb-4 flex-row items-start justify-between gap-4">
          <View className="flex-1">
            <Text className="font-mono text-sm font-extrabold text-airmess-yellow">
              {course.reference}
            </Text>
            <Text className="mt-2 text-2xl font-extrabold text-white" numberOfLines={2}>
              {course.origin_quartier} vers {course.destination_quartier}
            </Text>
          </View>
          <StatusPill status={course.status} label={course.status_label} />
        </View>
        <Text className="text-sm font-semibold text-warm-300">
          Creee le {formatDate(course.created_at)}
        </Text>
      </Card>

      <Card className="mb-4">
        <SectionTitle icon="navigate-outline" title="Trajet" />
        <RoutePoint label="Depart" title={course.origin_name ?? 'Adresse de depart'} subtitle={`${course.origin_quartier}, ${course.origin_city}`} />
        <View className="ml-5 h-6 w-px bg-warm-300" />
        <RoutePoint label="Arrivee" title={course.destination_name} subtitle={`${course.destination_quartier}, ${course.destination_city}`} />
      </Card>

      <View className="mb-4 flex-row gap-3">
        <InfoTile icon="cash-outline" label="Prix" value={`${course.delivery_fee.toLocaleString('fr-FR')} FCFA`} />
        <InfoTile icon="flash-outline" label="Urgence" value={course.urgency === 'express' ? 'Express' : 'Standard'} />
      </View>

      <Card className="mb-4">
        <SectionTitle icon="cube-outline" title="Colis" />
        <Text className="text-base font-extrabold text-ink">
          {course.package_description ?? 'Description non renseignee'}
        </Text>
        <Text className="mt-1 text-sm font-semibold text-warm-500">
          Taille {course.package_size ?? '--'}
        </Text>
      </Card>

      <Card className="mb-4">
        <SectionTitle icon="person-outline" title="Destinataire" />
        <InfoRow label="Nom" value={course.destination_name} />
        <InfoRow label="Telephone" value={course.destination_phone ?? '--'} />
      </Card>

      <Card className="mb-4">
        <SectionTitle icon="bicycle-outline" title="Livreur" />
        {course.driver ? (
          <>
            <InfoRow label="Nom" value={course.driver.user.name} />
            <InfoRow label="Telephone" value={course.driver.user.phone} />
          </>
        ) : (
          <Text className="text-sm font-semibold text-warm-500">Aucun livreur assigne pour le moment.</Text>
        )}
      </Card>

      <View className="mb-4 flex-row gap-3">
        <CodeTile label="Retrait" value={course.pickup_code ?? '--'} />
        <CodeTile label="Livraison" value={course.delivery_code ?? '--'} />
      </View>
    </>
  )
}

function SectionTitle({ icon, title }: { icon: keyof typeof Ionicons.glyphMap; title: string }) {
  return (
    <View className="mb-3 flex-row items-center">
      <View className="mr-2 h-8 w-8 items-center justify-center rounded-full bg-warm-100">
        <Ionicons name={icon} size={17} color="#D40511" />
      </View>
      <Text className="text-lg font-extrabold text-ink">{title}</Text>
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
        <Text className="text-xs font-extrabold uppercase tracking-widest text-warm-500">{label}</Text>
        <Text className="mt-0.5 text-base font-extrabold text-ink">{title}</Text>
        <Text className="mt-0.5 text-sm font-semibold text-warm-600">{subtitle}</Text>
      </View>
    </View>
  )
}

function InfoTile({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <Card className="flex-1">
      <Ionicons name={icon} size={20} color="#D40511" />
      <Text className="mt-3 text-xs font-extrabold uppercase tracking-widest text-warm-500">{label}</Text>
      <Text className="mt-1 text-base font-extrabold text-ink" numberOfLines={1}>{value}</Text>
    </Card>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between border-t border-warm-200 py-3 first:border-t-0">
      <Text className="text-sm font-semibold text-warm-500">{label}</Text>
      <Text className="ml-4 flex-1 text-right text-sm font-extrabold text-ink" numberOfLines={1}>{value}</Text>
    </View>
  )
}

function CodeTile({ label, value }: { label: string; value: string }) {
  return (
    <Card className="flex-1 items-center">
      <Text className="text-xs font-extrabold uppercase tracking-widest text-warm-500">{label}</Text>
      <Text className="mt-2 font-mono text-2xl font-extrabold text-ink">{value}</Text>
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}
