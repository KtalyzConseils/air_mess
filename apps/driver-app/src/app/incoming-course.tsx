import { useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, Pressable, ActivityIndicator, Vibration } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { createAudioPlayer, type AudioPlayer } from 'expo-audio'
import notifee from '../lib/notifeeSafe'
import {
  fetchOfferedCourses,
  acceptCourse,
  declineCourse,
  type DriverCourseSummary,
} from '../api/driver'
import {
  INCOMING_NOTIF_ID,
  getRingQueue,
  dequeueRing,
  clearRingQueue,
} from '../lib/registerBackgroundNotifications'

const COUNTDOWN_SECONDS = 30

/**
 * Écran "Course entrante" façon appel entrant.
 * Ouvert par le full-screen intent Notifee (ou en foreground quand une course arrive).
 * Sonne en boucle + compte à rebours 30s → Accepter / Refuser / expiration.
 */
export default function IncomingCourseScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ course_id?: string }>()
  const courseId = params.course_id ? Number(params.course_id) : null

  const [remaining, setRemaining] = useState(COUNTDOWN_SECONDS)
  const [acting, setActing] = useState<null | 'accept' | 'decline'>(null)
  // Nombre de courses encore en file DERRIÈRE celle affichée (badge "+N en attente").
  const [waiting, setWaiting] = useState(0)
  const playerRef = useRef<AudioPlayer | null>(null)
  const dismissedRef = useRef(false)

  // Détail de la course (depuis le pool de propositions).
  const { data: course, isLoading } = useQuery({
    queryKey: ['incoming-course', courseId],
    queryFn: async (): Promise<DriverCourseSummary | null> => {
      const list = await fetchOfferedCourses()
      return list.find((c) => c.id === courseId) ?? null
    },
    enabled: courseId != null,
    refetchOnWindowFocus: false,
  })

  // ── Sonnerie en boucle + vibration ────────────────────────────────
  // Re-déclenchée à chaque course (courseId) : quand on enchaîne sur la suivante,
  // l'écran ne se démonte pas → il faut relancer son/vibration/état.
  useEffect(() => {
    dismissedRef.current = false
    setActing(null)
    // Combien de courses attendent derrière celle-ci ?
    getRingQueue()
      .then((items) => setWaiting(Math.max(0, items.length - 1)))
      .catch(() => setWaiting(0))
    // L'écran d'appel prend le relais : on coupe la notif (et sa sonnerie de canal)
    // pour éviter le double son avec la boucle in-app.
    notifee.cancelNotification(INCOMING_NOTIF_ID).catch(() => {})
    try {
      const player = createAudioPlayer(require('../../assets/sounds/new_course.wav'))
      player.loop = true
      player.play()
      playerRef.current = player
    } catch (e) {
      console.warn('[incoming] son KO:', e)
    }
    const vib = setInterval(() => Vibration.vibrate(600), 1500)
    return () => {
      clearInterval(vib)
      Vibration.cancel()
      playerRef.current?.pause()
      playerRef.current?.release()
      playerRef.current = null
    }
  }, [courseId])

  // ── Compte à rebours ──────────────────────────────────────────────
  useEffect(() => {
    setRemaining(COUNTDOWN_SECONDS)
    const t = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(t)
          onTimeout()
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId])

  function stopAlert() {
    playerRef.current?.pause()
    Vibration.cancel()
    notifee.cancelNotification(INCOMING_NOTIF_ID).catch(() => {})
  }

  /** Enchaîne sur la course suivante de la file, ou revient au dashboard si file vide. */
  function goNext(nextCourseId: number | null) {
    if (nextCourseId != null) {
      // Même route, nouveau course_id → les effets [courseId] relancent la sonnerie.
      router.replace({
        pathname: '/incoming-course',
        params: { course_id: String(nextCourseId) },
      })
    } else {
      router.replace('/(tabs)')
    }
  }

  async function onTimeout() {
    if (dismissedRef.current) return
    dismissedRef.current = true
    stopAlert()
    // Expiration : la course reste dans le pool (pas de refus enregistré) mais sort de
    // la file de sonnerie ; on enchaîne sur la suivante s'il y en a une.
    const next = courseId ? await dequeueRing(courseId) : null
    goNext(next?.course_id ?? null)
  }

  async function onAccept() {
    if (!courseId || acting) return
    setActing('accept')
    stopAlert()
    try {
      await acceptCourse(courseId)
      dismissedRef.current = true
      await clearRingQueue() // livreur occupé → plus aucune course ne doit sonner
      router.replace('/(tabs)')
    } catch {
      // Déjà prise par un autre / plus dispo → on passe à la suivante de la file.
      dismissedRef.current = true
      const next = await dequeueRing(courseId)
      goNext(next?.course_id ?? null)
    }
  }

  async function onDecline() {
    if (!courseId || acting) return
    setActing('decline')
    stopAlert()
    try {
      await declineCourse(courseId, 'personal')
    } catch {
      /* ignore */
    }
    dismissedRef.current = true
    const next = await dequeueRing(courseId)
    goNext(next?.course_id ?? null)
  }

  const earnings = course?.driver_earnings ?? null
  const progress = useMemo(() => remaining / COUNTDOWN_SECONDS, [remaining])

  return (
    <SafeAreaView className="flex-1 bg-airmess-dark" edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar style="light" />
      <View className="flex-1 px-6 pt-8 pb-6">
        {/* En-tête pulsé */}
        <View className="items-center mb-6">
          <View className="w-16 h-16 rounded-full bg-airmess-yellow items-center justify-center mb-3">
            <Ionicons name="cube" size={30} color="#1A1614" />
          </View>
          <Text className="text-warm-400 text-xs uppercase tracking-widest font-extrabold">
            Nouvelle course
          </Text>
          <Text className="text-white text-2xl font-extrabold mt-1">
            {course?.urgency === 'express' ? '⚡ Express' : 'Course entrante'}
          </Text>
          {waiting > 0 && (
            <View className="mt-2 flex-row items-center bg-airmess-yellow/15 px-3 py-1 rounded-full">
              <Ionicons name="layers" size={12} color="#FFCC00" />
              <Text className="text-airmess-yellow text-xs font-extrabold ml-1.5">
                +{waiting} course{waiting > 1 ? 's' : ''} en attente
              </Text>
            </View>
          )}
        </View>

        {/* Carte détails */}
        <View className="bg-cream rounded-3xl p-5 flex-1">
          {isLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color="#1A1614" />
              <Text className="text-warm-500 mt-3">Chargement de la course…</Text>
            </View>
          ) : course ? (
            <View className="flex-1">
              {/* Gains */}
              {earnings != null && (
                <View className="items-center mb-4">
                  <Text className="text-4xl font-extrabold text-ink">{earnings} FCFA</Text>
                  <Text className="text-warm-500 text-xs mt-0.5">tes gains sur cette course</Text>
                </View>
              )}

              {/* Trajet */}
              <View className="bg-off-white rounded-2xl p-4 mb-3">
                <View className="flex-row items-start mb-3">
                  <Ionicons name="ellipse" size={12} color="#16A34A" style={{ marginTop: 3 }} />
                  <View className="ml-3 flex-1">
                    <Text className="text-[10px] uppercase text-warm-500 font-extrabold tracking-widest">Retrait</Text>
                    <Text className="text-ink font-bold" numberOfLines={1}>{course.origin_quartier}</Text>
                    <Text className="text-warm-500 text-xs" numberOfLines={1}>{course.origin_name}</Text>
                  </View>
                </View>
                <View className="flex-row items-start">
                  <Ionicons name="location" size={13} color="#D40511" style={{ marginTop: 2 }} />
                  <View className="ml-3 flex-1">
                    <Text className="text-[10px] uppercase text-warm-500 font-extrabold tracking-widest">Livraison</Text>
                    <Text className="text-ink font-bold" numberOfLines={1}>{course.destination_quartier}</Text>
                    <Text className="text-warm-500 text-xs" numberOfLines={1}>{course.destination_city}</Text>
                  </View>
                </View>
              </View>

              {/* Meta */}
              <View className="flex-row justify-between">
                {course.distance_km != null && (
                  <Meta icon="navigate" label={`${course.distance_km.toFixed(1)} km`} />
                )}
                <Meta icon="cube-outline" label={course.package_category?.name ?? 'Colis'} />
                {course.has_collection && (
                  <Meta icon="cash-outline" label={`${course.collection_amount ?? 0} F`} />
                )}
              </View>
            </View>
          ) : (
            <View className="flex-1 items-center justify-center">
              <Ionicons name="alert-circle-outline" size={40} color="#8A7E68" />
              <Text className="text-ink font-bold mt-3 text-center">Course indisponible</Text>
              <Text className="text-warm-500 text-sm text-center mt-1">
                Elle a peut-être déjà été prise.
              </Text>
            </View>
          )}
        </View>

        {/* Compte à rebours */}
        <View className="items-center my-4">
          <View className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
            <View
              className="h-2 bg-airmess-yellow rounded-full"
              style={{ width: `${progress * 100}%` }}
            />
          </View>
          <Text className="text-warm-400 text-xs mt-2 font-semibold">
            Expire dans {remaining}s
          </Text>
        </View>

        {/* Actions */}
        <View className="flex-row gap-3">
          <Pressable
            onPress={onDecline}
            disabled={!!acting}
            className="flex-1 h-16 rounded-2xl bg-white/10 border border-white/15 items-center justify-center flex-row"
            style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
          >
            <Ionicons name="close" size={22} color="#E7E0D4" />
            <Text className="text-warm-200 font-extrabold ml-2 text-base">Refuser</Text>
          </Pressable>
          <Pressable
            onPress={onAccept}
            disabled={!!acting || !course}
            className="flex-[1.4] h-16 rounded-2xl bg-airmess-yellow items-center justify-center flex-row"
            style={({ pressed }) => (pressed ? { opacity: 0.9 } : undefined)}
          >
            {acting === 'accept' ? (
              <ActivityIndicator color="#1A1614" />
            ) : (
              <>
                <Ionicons name="checkmark" size={24} color="#1A1614" />
                <Text className="text-ink font-extrabold ml-2 text-lg">Accepter</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  )
}

function Meta({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View className="flex-row items-center bg-off-white rounded-full px-3 py-1.5">
      <Ionicons name={icon} size={13} color="#6E6558" />
      <Text className="text-warm-600 text-xs font-bold ml-1.5">{label}</Text>
    </View>
  )
}
