import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  TextInput,
  Share,
  Linking,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { AxiosError } from 'axios'
import {
  cancelCourse,
  fetchCourse,
  fetchCourseHistory,
} from '../../api/courses'
import { trackingUrl } from '../../lib/webUrls'
import CourseRouteMap from '../../components/CourseRouteMap'
import StatusPill from '../../components/ui/StatusPill'
import Button from '../../components/ui/Button'

const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  delivered: 'success',
  cancelled: 'danger',
  failed: 'danger',
  disputed: 'danger',
  pending_preparation: 'warning',
  awaiting_assignment: 'warning',
  assigned: 'info',
  driver_to_pickup: 'info',
  at_pickup: 'info',
  picked_up: 'info',
  at_dropoff: 'info',
  returning_to_sender: 'warning',
}

const STATUS_FR: Record<string, string> = {
  pending_preparation: 'En préparation',
  awaiting_assignment: 'En attente livreur',
  assigned: 'Assignée',
  driver_to_pickup: 'Vers le retrait',
  at_pickup: 'Au point de retrait',
  picked_up: 'Colis récupéré',
  at_dropoff: 'En livraison',
  returning_to_sender: 'Retour expéditeur',
  delivered: 'Livrée',
  cancelled: 'Annulée',
  failed: 'Échouée',
  disputed: 'Litige',
}

function waDigits(phone: string): string {
  return phone.replace(/\D/g, '')
}

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const courseId = Number(id)

  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  const courseQuery = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => fetchCourse(courseId),
    enabled: Number.isFinite(courseId) && courseId > 0,
    refetchInterval: 20_000,
  })

  const historyQuery = useQuery({
    queryKey: ['course', courseId, 'history'],
    queryFn: () => fetchCourseHistory(courseId),
    enabled: Number.isFinite(courseId) && courseId > 0,
  })

  const cancelMutation = useMutation({
    mutationFn: () => cancelCourse(courseId, cancelReason.trim() || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course', courseId] })
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      setCancelOpen(false)
      Alert.alert('Course annulée')
    },
    onError: (err) => {
      const msg =
        err instanceof AxiosError
          ? ((err.response?.data as { message?: string })?.message ?? 'Annulation impossible')
          : 'Annulation impossible'
      Alert.alert('Erreur', msg)
    },
  })

  const course = courseQuery.data

  const canCancel = useMemo(() => {
    if (!course) return false
    return !['delivered', 'cancelled', 'failed', 'returning_to_sender'].includes(course.status)
  }, [course])

  const shareUrl = course ? trackingUrl(course.tracking_token) : ''

  async function shareTracking() {
    if (!course) return
    const msg =
      `Bonjour, votre colis Air Mess (réf. ${course.reference}) arrive.\n` +
      `Suivez la livraison : ${shareUrl}` +
      (course.delivery_code ? `\n🔑 Code de livraison : ${course.delivery_code}` : '')
    await Share.share({ message: msg })
  }

  async function openWhatsApp() {
    if (!course) return
    const msg =
      `Bonjour, votre colis Air Mess (réf. ${course.reference}) arrive.\n` +
      `Suivez la livraison : ${shareUrl}` +
      (course.delivery_code ? `\n🔑 Code de livraison : ${course.delivery_code}` : '')
    const url = `https://wa.me/${waDigits(course.destination_phone)}?text=${encodeURIComponent(msg)}`
    await Linking.openURL(url)
  }

  if (courseQuery.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-cream items-center justify-center">
        <ActivityIndicator color="#1A1614" size="large" />
      </SafeAreaView>
    )
  }

  if (courseQuery.error || !course) {
    return (
      <SafeAreaView className="flex-1 bg-cream px-5 justify-center">
        <Text className="text-airmess-red font-bold text-lg mb-4">Course introuvable</Text>
        <Button variant="dark" onPress={() => router.back()}>
          Retour
        </Button>
      </SafeAreaView>
    )
  }

  const tone = STATUS_TONE[course.status] ?? 'neutral'
  const label = course.status_label ?? STATUS_FR[course.status] ?? course.status
  const hasMap =
    typeof course.origin_lat === 'number' &&
    typeof course.origin_lng === 'number' &&
    typeof course.destination_lat === 'number' &&
    typeof course.destination_lng === 'number'

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <View className="px-5 pt-2 pb-3 flex-row items-center">
        <Pressable onPress={() => router.back()} hitSlop={8} className="mr-3">
          <Ionicons name="arrow-back" size={22} color="#1A1614" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-warm-500 text-[10px] font-extrabold uppercase tracking-widest">
            Détail course
          </Text>
          <Text className="text-xl font-extrabold text-ink font-mono" numberOfLines={1}>
            {course.reference}
          </Text>
        </View>
        <StatusPill tone={tone} size="sm">
          {label}
        </StatusPill>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: 48 }}>
        <Text className="text-warm-500 text-sm mb-4">
          {course.origin_quartier} → {course.destination_quartier}, {course.destination_city}
        </Text>

        {hasMap && (
          <CourseRouteMap
            origin={{ lat: course.origin_lat!, lng: course.origin_lng! }}
            destination={{ lat: course.destination_lat!, lng: course.destination_lng! }}
            height={240}
          />
        )}

        <View className="bg-airmess-dark rounded-3xl p-4 mb-4 flex-row justify-between items-end">
          <View>
            <Text className="text-airmess-yellow text-[10px] font-extrabold uppercase tracking-widest">
              Tarif
            </Text>
            <Text className="text-white text-2xl font-extrabold mt-1">
              {Number(course.delivery_fee).toLocaleString('fr-FR')} FCFA
            </Text>
          </View>
          <Text className="text-warm-400 text-xs">
            {course.urgency === 'express' ? 'Express' : 'Standard'}
            {course.distance_km != null ? ` · ${Number(course.distance_km).toFixed(1)} km` : ''}
          </Text>
        </View>

        <Section title="Trajet">
          <KV label="Départ" value={`${course.origin_name} — ${course.origin_quartier}`} />
          <KV label="Arrivée" value={`${course.destination_name} — ${course.destination_quartier}`} />
          <KV label="Tél. destinataire" value={course.destination_phone} />
        </Section>

        <Section title="Colis">
          <KV label="Description" value={course.package_description} />
          <KV label="Taille" value={course.package_size} />
          {course.package_category?.name && (
            <KV label="Catégorie" value={course.package_category.name} />
          )}
          {course.has_collection && (
            <KV
              label="Encaissement"
              value={`${Number(course.collection_amount ?? 0).toLocaleString('fr-FR')} FCFA`}
            />
          )}
        </Section>

        {(course.pickup_code || course.delivery_code) && (
          <Section title="Codes">
            {course.pickup_code && <KV label="Retrait" value={course.pickup_code} mono />}
            {course.delivery_code && <KV label="Livraison" value={course.delivery_code} mono />}
          </Section>
        )}

        {course.driver?.user && (
          <Section title="Livreur">
            <KV label="Nom" value={course.driver.user.name} />
            <KV label="Téléphone" value={course.driver.user.phone} />
          </Section>
        )}

        <View className="flex-row gap-2 mb-4">
          <View className="flex-1">
            <Button variant="outline" size="md" onPress={shareTracking}>
              Partager suivi
            </Button>
          </View>
          <View className="flex-1">
            <Button variant="dark" size="md" onPress={openWhatsApp}>
              WhatsApp
            </Button>
          </View>
        </View>

        {historyQuery.data && historyQuery.data.length > 0 && (
          <Section title="Historique">
            {historyQuery.data.map((h) => (
              <View key={h.id} className="mb-3 border-l-2 border-warm-300 pl-3">
                <Text className="text-ink font-bold text-sm">
                  {STATUS_FR[h.to_status] ?? h.to_status}
                </Text>
                <Text className="text-warm-500 text-xs">
                  {new Date(h.created_at).toLocaleString('fr-FR')}
                </Text>
                {!!h.reason && <Text className="text-warm-500 text-xs mt-0.5">{h.reason}</Text>}
              </View>
            ))}
          </Section>
        )}

        {canCancel && !cancelOpen && (
          <Button variant="danger" size="lg" onPress={() => setCancelOpen(true)}>
            Annuler la course
          </Button>
        )}

        {cancelOpen && (
          <View className="bg-off-white border border-warm-200 rounded-2xl p-4 mt-2">
            <Text className="text-ink font-bold mb-2">Motif (optionnel)</Text>
            <TextInput
              value={cancelReason}
              onChangeText={setCancelReason}
              placeholder="Ex. client indisponible…"
              placeholderTextColor="#B8AF9F"
              className="border-2 border-warm-200 rounded-2xl px-4 py-3 text-ink bg-cream mb-3"
              multiline
            />
            <Button
              variant="danger"
              size="lg"
              loading={cancelMutation.isPending}
              onPress={() => cancelMutation.mutate()}
            >
              Confirmer l’annulation
            </Button>
            <View className="mt-2">
              <Button variant="ghost" size="md" onPress={() => setCancelOpen(false)}>
                Fermer
              </Button>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="mb-5">
      <Text className="text-[10px] uppercase text-warm-500 tracking-widest font-extrabold mb-2">
        {title}
      </Text>
      <View className="bg-off-white border border-warm-200 rounded-2xl p-4">{children}</View>
    </View>
  )
}

function KV({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View className="mb-3 last:mb-0">
      <Text className="text-warm-500 text-xs">{label}</Text>
      <Text className={`text-ink font-semibold mt-0.5 ${mono ? 'font-mono text-lg' : ''}`}>
        {value}
      </Text>
    </View>
  )
}
