import { View, Text, Pressable, ActivityIndicator, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { fetchDriverCourse } from '../api/driver'

export default function CourseDetailsScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ course_id?: string }>()
  const courseId = params.course_id ? Number(params.course_id) : null

  const { data: course, isLoading, isError, refetch } = useQuery({
    queryKey: ['driver-course-details', courseId],
    queryFn: () => fetchDriverCourse(courseId!),
    enabled: courseId != null && Number.isFinite(courseId),
  })

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top', 'left', 'right']}>
      <View className="px-4 pt-2 pb-3 flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-off-white border border-warm-200 items-center justify-center"
        >
          <Ionicons name="arrow-back" size={20} color="#1A1614" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-jk-extrabold text-ink">Détails course</Text>
          <Text className="text-xs text-warm-500 font-jk-semibold">
            {course?.reference ?? 'Chargement...'}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#1A1614" size="large" />
        </View>
      ) : isError || !course ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-16 h-16 rounded-full bg-danger-bg items-center justify-center mb-3">
            <Ionicons name="alert-circle" size={30} color="#D40511" />
          </View>
          <Text className="text-ink font-jk-bold text-center">Course introuvable</Text>
          <Text className="text-warm-500 text-sm mt-1 text-center font-jk">
            La course n'est plus disponible ou l'accès a été refusé.
          </Text>
          <Pressable
            onPress={() => refetch()}
            className="mt-5 h-11 px-5 rounded-full bg-airmess-yellow items-center justify-center"
          >
            <Text className="font-jk-extrabold text-ink">Réessayer</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 28 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="bg-airmess-dark rounded-3xl p-5 mb-4">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-warm-300 text-xs uppercase font-jk-extrabold tracking-widest">
                  Gain livreur
                </Text>
                <Text className="text-white text-4xl font-jk-extrabold mt-1">
                  {formatMoney(course.driver_earnings)}
                </Text>
              </View>
              <View className="w-14 h-14 rounded-2xl bg-airmess-yellow items-center justify-center">
                <Ionicons
                  name={course.urgency === 'express' ? 'flash' : 'cube'}
                  size={26}
                  color="#1A1614"
                />
              </View>
            </View>
            <Text className="text-warm-300 text-sm font-jk-semibold mt-4">
              {course.urgency === 'express' ? 'Course express' : 'Course standard'} · {statusLabel(course.status)}
            </Text>
          </View>

          <InfoCard title="Trajet" icon="navigate-circle">
            <RoutePoint
              label="Prise en charge"
              title={course.origin_quartier || course.origin_name}
              subtitle={compact([course.origin_name, course.origin_street, course.origin_landmark])}
            />
            <View className="h-px bg-warm-200 my-3" />
            <RoutePoint
              label="Destination"
              title={course.destination_quartier || course.destination_name}
              subtitle={compact([course.destination_name, course.destination_city, course.destination_landmark])}
            />
          </InfoCard>

          <InfoCard title="Colis" icon="cube">
            <DetailRow label="Description" value={course.package_description || 'Non renseigné'} />
            <DetailRow label="Catégorie" value={course.package_category?.name ?? 'Standard'} />
            <DetailRow label="Taille" value={course.package_size ?? 'Non renseignée'} />
            <DetailRow
              label="Poids estimé"
              value={course.package_weight_kg ? `${course.package_weight_kg} kg` : 'Non renseigné'}
            />
          </InfoCard>

          {course.has_collection && (
            <InfoCard title="Encaissement" icon="cash">
              <DetailRow label="Montant à encaisser" value={formatMoney(course.collection_amount ?? 0)} />
              <DetailRow label="Méthode" value={course.collection_method ?? 'Espèces'} />
            </InfoCard>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

function InfoCard({
  title,
  icon,
  children,
}: {
  title: string
  icon: keyof typeof Ionicons.glyphMap
  children: React.ReactNode
}) {
  return (
    <View className="bg-off-white border border-warm-200 rounded-2xl p-4 mb-4">
      <View className="flex-row items-center gap-2 mb-3">
        <View className="w-8 h-8 rounded-full bg-airmess-yellow/20 items-center justify-center">
          <Ionicons name={icon} size={16} color="#1A1614" />
        </View>
        <Text className="text-ink font-jk-extrabold text-base">{title}</Text>
      </View>
      {children}
    </View>
  )
}

function RoutePoint({ label, title, subtitle }: { label: string; title: string; subtitle: string }) {
  return (
    <View>
      <Text className="text-[11px] text-warm-500 uppercase tracking-widest font-jk-extrabold">
        {label}
      </Text>
      <Text className="text-ink text-lg font-jk-extrabold mt-1">{title || 'Adresse non renseignée'}</Text>
      {!!subtitle && <Text className="text-warm-600 text-sm font-jk mt-1">{subtitle}</Text>}
    </View>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-start justify-between gap-3 py-2 border-b border-warm-100 last:border-b-0">
      <Text className="text-warm-500 text-sm font-jk-semibold flex-1">{label}</Text>
      <Text className="text-ink text-sm font-jk-bold text-right flex-1">{value}</Text>
    </View>
  )
}

function compact(values: Array<string | null | undefined>) {
  return values.filter((v) => v && String(v).trim().length > 0).join(' · ')
}

function formatMoney(value: number) {
  return `${Number(value || 0).toLocaleString('fr-FR')} FCFA`
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    awaiting_assignment: 'En attente',
    assigned: 'Attribuée',
    driver_to_pickup: 'Vers retrait',
    at_pickup: 'Au retrait',
    picked_up: 'Colis récupéré',
    at_dropoff: 'À destination',
    delivered: 'Livrée',
    failed: 'Échouée',
    cancelled: 'Annulée',
  }
  return labels[status] ?? status
}
