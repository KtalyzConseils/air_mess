import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { fetchDriverCourse } from '../api/driver'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'

export default function CourseDetailsScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ id?: string }>()
  const courseId = params.id ? Number(params.id) : null

  const { data: course, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['driver-course-details', courseId],
    queryFn: () => fetchDriverCourse(courseId!),
    enabled: Number.isFinite(courseId),
  })

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top', 'left', 'right']}>
      <View className="flex-row items-center px-5 py-3">
        <Pressable
          onPress={() => router.back()}
          className="w-11 h-11 rounded-full bg-off-white border border-warm-200 items-center justify-center mr-3"
        >
          <Ionicons name="arrow-back" size={21} color="#1A1614" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-xl font-jk-extrabold text-ink">Détails de course</Text>
          <Text className="text-xs text-warm-500 font-jk-medium">
            {course?.reference ?? (courseId ? `Course #${courseId}` : 'Course')}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#1A1614" size="large" />
        </View>
      ) : isError || !course ? (
        <View className="flex-1 px-5 justify-center">
          <Card variant="warning" padding="lg">
            <Text className="text-ink text-lg font-jk-extrabold">Détail indisponible</Text>
            <Text className="text-warm-600 text-sm font-jk-medium mt-2 leading-5">
              Cette course n'est peut-être plus accessible depuis ce compte.
            </Text>
            <View className="mt-4">
              <Button
                variant="dark"
                size="md"
                loading={isRefetching}
                onPress={() => { void refetch() }}
              >
                Réessayer
              </Button>
            </View>
          </Card>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 20, paddingBottom: 36 }}
        >
          <Card variant={course.source === 'admin_airmess' ? 'dark' : 'default'} padding="lg">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <Text
                  className={course.source === 'admin_airmess' ? 'text-airmess-yellow' : 'text-warm-500'}
                  style={{ fontSize: 10, fontFamily: 'PlusJakartaSans_800ExtraBold' }}
                >
                  {course.source === 'admin_airmess' ? 'MISSION AIRMESS' : course.urgency === 'express' ? 'EXPRESS' : 'STANDARD'}
                </Text>
                <Text
                  className={course.source === 'admin_airmess' ? 'text-white' : 'text-ink'}
                  style={{ fontSize: 26, fontFamily: 'PlusJakartaSans_800ExtraBold', marginTop: 6 }}
                >
                  {course.driver_earnings.toLocaleString('fr-FR')} FCFA
                </Text>
              </View>
              <View className="w-12 h-12 rounded-2xl bg-airmess-yellow items-center justify-center">
                <Ionicons name="cube" size={23} color="#1A1614" />
              </View>
            </View>
          </Card>

          <Card variant="default" padding="lg" className="mt-4">
            <RoutePoint
              icon="storefront"
              label="Prise en charge"
              title={course.origin_name}
              subtitle={course.origin_quartier}
            />
            <View className="h-px bg-warm-200 my-4" />
            <RoutePoint
              icon="flag"
              label="Destination"
              title={course.destination_name}
              subtitle={[course.destination_quartier, course.destination_city].filter(Boolean).join(', ')}
            />
          </Card>

          <Card variant="default" padding="lg" className="mt-4">
            <InfoRow label="Statut" value={labelStatus(course.status)} />
            <InfoRow label="Colis" value={course.package_description || 'Non renseigné'} />
            <InfoRow label="Catégorie" value={course.package_category?.name ?? 'Non renseignée'} />
            <InfoRow
              label="Encaissement"
              value={course.has_collection ? `${Number(course.collection_amount ?? 0).toLocaleString('fr-FR')} FCFA` : 'Aucun'}
              last
            />
          </Card>
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

function RoutePoint({
  icon,
  label,
  title,
  subtitle,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  title: string
  subtitle: string
}) {
  return (
    <View className="flex-row items-start">
      <View className="w-10 h-10 rounded-full bg-airmess-yellow/25 items-center justify-center mr-3">
        <Ionicons name={icon} size={19} color="#1A1614" />
      </View>
      <View className="flex-1">
        <Text className="text-[10px] uppercase text-warm-500 font-jk-extrabold">{label}</Text>
        <Text className="text-ink text-base font-jk-extrabold mt-1">{title}</Text>
        <Text className="text-warm-600 text-sm font-jk-medium mt-0.5">{subtitle}</Text>
      </View>
    </View>
  )
}

function InfoRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View className={`py-3 ${last ? '' : 'border-b border-warm-200'}`}>
      <Text className="text-[10px] uppercase text-warm-500 font-jk-extrabold">{label}</Text>
      <Text className="text-ink text-sm font-jk-bold mt-1">{value}</Text>
    </View>
  )
}

function labelStatus(status: string) {
  const map: Record<string, string> = {
    awaiting: 'En attente',
    assigned: 'Assignée',
    driver_to_pickup: 'Vers la prise en charge',
    at_pickup: 'Au point de retrait',
    picked_up: 'Colis récupéré',
    at_dropoff: 'À destination',
    delivered: 'Livrée',
    cancelled: 'Annulée',
    failed: 'Échouée',
  }
  return map[status] ?? status
}
