import { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, Pressable, ActivityIndicator, Vibration, Alert, DeviceEventEmitter } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { createAudioPlayer, type AudioPlayer } from 'expo-audio'
import notifee from '../lib/notifeeSafe'
import {
  fetchOfferedCourses,
  fetchMyActiveCourses,
  type DriverCourseSummary,
} from '../api/driver'
import {
  INCOMING_NOTIF_ID,
  getRingQueue,
  dequeueRing,
  isReassignment,
  respondToIncomingCourse,
  COURSE_ALERT_STOP,
  setActiveIncomingCourse,
  releaseActiveIncomingCourse,
} from '../lib/registerBackgroundNotifications'

/**
 * Écran "Course entrante" façon appel entrant.
 * Ouvert par le full-screen intent Notifee (ou en foreground quand une course arrive).
 * Sonne EN CONTINU jusqu'à la réponse du livreur (Accepter / Refuser). Aucune
 * expiration automatique : seule la prise de la course par un autre livreur ferme
 * l'écran (et enchaîne sur la suivante en file).
 */
export default function IncomingCourseScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ course_id?: string }>()
  const courseId = params.course_id ? Number(params.course_id) : null

  const [acting, setActing] = useState<null | 'accept' | 'decline'>(null)
  // Nombre de courses encore en file DERRIÈRE celle affichée (badge "+N en attente").
  const [waiting, setWaiting] = useState(0)
  // Infos portées par le push (trajet + gains) : filet de sécurité quand la course
  // n'est pas (encore) dans le pool de propositions — évite un écran vide/"indisponible".
  const [pushInfo, setPushInfo] = useState<Record<string, any> | null>(null)
  const [pushLoadedFor, setPushLoadedFor] = useState<number | null>(null)
  const playerRef = useRef<AudioPlayer | null>(null)
  const vibrationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const dismissedRef = useRef(false)
  const actionLockRef = useRef(false)

  // Détail de la course (pool de propositions). Rafraîchi régulièrement pour détecter
  // si un autre livreur la prend pendant que ça sonne.
  // Réaffectation admin : la course est DÉJÀ attribuée à ce livreur. Tout le reste de
  // l'écran (source des données, actions, libellés) en découle.
  const reassigned = isReassignment(pushInfo)

  const { data: course, isLoading } = useQuery({
    queryKey: ['incoming-course', courseId, reassigned],
    queryFn: async (): Promise<DriverCourseSummary | null> => {
      // Une course réaffectée n'est PAS dans le pool des offres — elle porte déjà son
      // driver_id. La chercher là donnerait « course introuvable », donc un écran qui
      // se ferme tout seul en croyant qu'un autre livreur l'a prise.
      const list = reassigned ? await fetchMyActiveCourses() : await fetchOfferedCourses()
      return list.find((c) => c.id === courseId) ?? null
    },
    enabled: courseId != null && pushLoadedFor === courseId,
    refetchOnWindowFocus: false,
    refetchInterval: 3_000,
  })

  // ── Sonnerie en boucle + vibration ────────────────────────────────
  // Re-déclenchée à chaque course (courseId) : quand on enchaîne sur la suivante,
  // l'écran ne se démonte pas → il faut relancer son/vibration/état.
  useFocusEffect(useCallback(() => {
    dismissedRef.current = false
    actionLockRef.current = false
    setActiveIncomingCourse(courseId)
    setActing(null)
    // Combien de courses attendent derrière celle-ci ? + infos du push (secours).
    getRingQueue()
      .then((items) => {
        setWaiting(Math.max(0, items.length - 1))
        setPushInfo(items.find((i) => i.course_id === courseId)?.payload ?? null)
        setPushLoadedFor(courseId)
      })
      .catch(() => {
        setWaiting(0)
        setPushInfo(null)
        setPushLoadedFor(courseId)
      })
    // L'écran d'appel prend le relais : on coupe la notif (et sa sonnerie de canal)
    // pour éviter le double son avec la boucle in-app.
    notifee.cancelNotification(INCOMING_NOTIF_ID).catch(() => {})
    notifee.cancelNotification(`incoming-course-${courseId}`).catch(() => {})
    try {
      const player = createAudioPlayer(require('../../assets/sounds/new_course.wav'))
      player.loop = true
      player.play()
      playerRef.current = player
    } catch (e) {
      console.warn('[incoming] son KO:', e)
    }
    const vib = setInterval(() => Vibration.vibrate(600), 1500)
    vibrationTimerRef.current = vib
    return () => {
      if (courseId !== null) releaseActiveIncomingCourse(courseId)
      clearInterval(vib)
      Vibration.cancel()
      playerRef.current?.pause()
      playerRef.current?.release()
      playerRef.current = null
    }
  }, [courseId]))

  // ── Course prise par un autre livreur ─────────────────────────────
  // PLUS de compte à rebours : l'appel sonne TANT QUE le livreur n'a pas répondu
  // (Accepter / Refuser). La seule sortie automatique est la disparition de la course
  // du pool = un autre livreur l'a acceptée.
  useEffect(() => {
    if (isLoading || dismissedRef.current || actionLockRef.current) return
    if (course === null) {
      dismissedRef.current = true
      stopAlert()
      void (async () => {
        const next = courseId ? await dequeueRing(courseId) : null
        goNext(next?.course_id ?? null)
      })()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course, isLoading])

  function stopAlert() {
    if (vibrationTimerRef.current) clearInterval(vibrationTimerRef.current)
    vibrationTimerRef.current = null
    playerRef.current?.pause()
    Vibration.cancel()
    notifee.cancelNotification(INCOMING_NOTIF_ID).catch(() => {})
  }

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('airmess-course-unavailable', ({ courseId: id }) => {
      if (id !== courseId || dismissedRef.current) return
      dismissedRef.current = true
      stopAlert()
      void getRingQueue().then((items) => goNext(items[0]?.course_id ?? null))
    })
    return () => sub.remove()
  }, [courseId])

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(COURSE_ALERT_STOP, ({ courseId: id }) => {
      if (id === courseId) stopAlert()
    })
    return () => sub.remove()
  }, [courseId])

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('airmess-course-action-completed', ({ courseId: id, action }) => {
      if (id !== courseId || action !== 'decline' || actionLockRef.current) return
      dismissedRef.current = true
      void getRingQueue().then((items) => goNext(items[0]?.course_id ?? null))
    })
    return () => sub.remove()
  }, [courseId, acting])

  /** Enchaîne sur la course suivante de la file, ou revient au dashboard si file vide. */
  function goNext(nextCourseId: number | null) {
    if (nextCourseId != null) {
      // Même route, nouveau course_id → les effets [courseId] relancent la sonnerie.
      router.replace({
        pathname: '/incoming-course',
        params: { course_id: String(nextCourseId) },
      })
    } else {
      router.dismissTo('/(tabs)')
    }
  }

  async function onAccept() {
    if (!courseId || !course || actionLockRef.current || dismissedRef.current) return
    actionLockRef.current = true
    setActing('accept')
    stopAlert()
    try {
      // Le coordinateur distingue l'offre normale de la confirmation d'une réaffectation.
      await respondToIncomingCourse(courseId, 'accept', reassigned)
      if (dismissedRef.current) return
      dismissedRef.current = true
      // La navigation est gérée une seule fois par le gestionnaire global.
    } catch (e: any) {
      // On NE rebondit plus en silence : on montre la raison exacte du refus serveur
      // (409 course déjà prise, 403 pas disponible…) pour pouvoir diagnostiquer.
      const status = e?.response?.status
      const msg = e?.response?.data?.message ?? e?.message ?? 'Erreur inconnue'
      console.warn('[accept] échec', status, msg)
      Alert.alert("Impossible d'accepter", `${msg}${status ? ` (code ${status})` : ''}`)
      setActing(null)
      actionLockRef.current = false
    }
  }

  async function onDecline() {
    if (!courseId || !course || actionLockRef.current || dismissedRef.current) return
    actionLockRef.current = true
    setActing('decline')
    stopAlert()
    try {
      // Refuser une réaffectation la DÉTACHE et la remet en attente côté serveur ; le
      // refus classique ne fait qu'enregistrer une trace sur une course encore offerte.
      await respondToIncomingCourse(courseId, 'decline', reassigned)
      if (dismissedRef.current) return
    } catch (error: any) {
      Alert.alert('Impossible de refuser', error?.response?.data?.message ?? 'Vérifie ta connexion et réessaie.')
      setActing(null)
      actionLockRef.current = false
      return
    }
    dismissedRef.current = true
    const next = await dequeueRing(courseId)
    goNext(next?.course_id ?? null)
  }

  // Vue fusionnée : détails complets si la course est dans le pool de propositions,
  // sinon les infos portées par le push (trajet + gains). On n'affiche jamais un écran
  // vide / "indisponible" pendant que ça sonne.
  const earnings =
    course?.driver_earnings ??
    (pushInfo?.earnings != null && pushInfo.earnings !== ''
      ? Number(pushInfo.earnings)
      : null)
  const pickup = course
    ? { main: course.origin_quartier, sub: course.origin_name }
    : pushInfo?.origin
      ? { main: String(pushInfo.origin), sub: '' }
      : null
  const dropoff = course
    ? { main: course.destination_quartier, sub: course.destination_city }
    : pushInfo?.destination
      ? { main: String(pushInfo.destination), sub: '' }
      : null
  const isExpress = (course?.urgency ?? pushInfo?.urgency) === 'express'
  const hasInfo = earnings != null || pickup != null || dropoff != null

  return (
    <SafeAreaView className="flex-1 bg-airmess-dark" edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar style="light" />
      <View className="flex-1 px-6 pt-8 pb-6">
        {/* En-tête pulsé */}
        <View className="items-center mb-6">
          <View className="w-16 h-16 rounded-full bg-airmess-yellow items-center justify-center mb-3">
            <Ionicons name={reassigned ? 'swap-horizontal' : 'cube'} size={30} color="#1A1614" />
          </View>
          <Text className="text-warm-400 text-xs uppercase tracking-widest font-extrabold">
            {reassigned ? 'Course réaffectée' : 'Nouvelle course'}
          </Text>
          <Text className="text-white text-2xl font-extrabold mt-1">
            {reassigned ? 'Reprise de course' : isExpress ? '⚡ Express' : 'Course entrante'}
          </Text>
          {reassigned && (
            // Le livreur doit comprendre d'où sort cette course : elle ne vient pas du
            // pool, c'est l'ops qui la lui confie.
            <Text className="text-warm-400 text-xs mt-1 text-center">
              Attribuée par Air Mess
            </Text>
          )}
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
          {hasInfo ? (
            <View className="flex-1">
              {/* Gains */}
              {earnings != null && (
                <View className="items-center mb-4">
                  <Text className="text-4xl font-extrabold text-ink">
                    {earnings.toLocaleString('fr-FR')} FCFA
                  </Text>
                  <Text className="text-warm-500 text-xs mt-0.5">tes gains sur cette course</Text>
                </View>
              )}

              {/* Trajet */}
              <View className="bg-off-white rounded-2xl p-4 mb-3">
                {pickup && (
                  <View className="flex-row items-start mb-3">
                    <Ionicons name="ellipse" size={12} color="#16A34A" style={{ marginTop: 3 }} />
                    <View className="ml-3 flex-1">
                      <Text className="text-[10px] uppercase text-warm-500 font-extrabold tracking-widest">Retrait</Text>
                      <Text className="text-ink font-bold" numberOfLines={1}>{pickup.main}</Text>
                      {!!pickup.sub && (
                        <Text className="text-warm-500 text-xs" numberOfLines={1}>{pickup.sub}</Text>
                      )}
                    </View>
                  </View>
                )}
                {dropoff && (
                  <View className="flex-row items-start">
                    <Ionicons name="location" size={13} color="#D40511" style={{ marginTop: 2 }} />
                    <View className="ml-3 flex-1">
                      <Text className="text-[10px] uppercase text-warm-500 font-extrabold tracking-widest">Livraison</Text>
                      <Text className="text-ink font-bold" numberOfLines={1}>{dropoff.main}</Text>
                      {!!dropoff.sub && (
                        <Text className="text-warm-500 text-xs" numberOfLines={1}>{dropoff.sub}</Text>
                      )}
                    </View>
                  </View>
                )}
              </View>

              {/* Info neutre "client paie livraison" — sans montant, pour ne pas
                  perturber le driver au moment de la décision. */}
              {course?.delivery_fee_paid_by === 'recipient' && (
                <View className="flex-row items-center bg-info-bg border border-info/30 rounded-xl px-3 py-2 mb-3">
                  <Ionicons name="wallet-outline" size={14} color="#0284C7" />
                  <Text className="text-info text-xs font-extrabold ml-1.5 flex-1">
                    Client paie la livraison
                  </Text>
                </View>
              )}

              {/* Meta — seulement quand on a les détails complets */}
              {course && (
                <View className="flex-row justify-between">
                  {course.distance_km != null && (
                    <Meta icon="navigate" label={`${course.distance_km.toFixed(1)} km`} />
                  )}
                  <Meta icon="cube-outline" label={course.package_category?.name ?? 'Colis'} />
                  {course.has_collection && (
                    <Meta icon="cash-outline" label={`${course.collection_amount ?? 0} F`} />
                  )}
                </View>
              )}
            </View>
          ) : isLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color="#1A1614" />
              <Text className="text-warm-500 mt-3">Chargement de la course…</Text>
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

        {/* Pas de compte à rebours : l'appel reste actif jusqu'à la réponse du livreur */}
        <View className="items-center my-4">
          <Text className="text-warm-400 text-xs font-semibold text-center">
            L'appel reste actif tant que tu n'as pas répondu.
          </Text>
        </View>

        {/* Actions */}
        <View className="flex-row gap-3">
          <Pressable
            onPress={onDecline}
            accessibilityRole="button"
            accessibilityLabel="Refuser la course"
            hitSlop={4}
            disabled={!!acting || !course}
            className="flex-1 h-16 rounded-2xl bg-white/10 border border-white/15 items-center justify-center flex-row"
            style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
          >
            <View pointerEvents="none" className="flex-row items-center">
              {acting === 'decline' ? <ActivityIndicator color="#E7E0D4" /> : <Ionicons name="close" size={22} color="#E7E0D4" />}
              <Text className="text-warm-200 font-extrabold ml-2 text-base">{acting === 'decline' ? 'Refus…' : 'Refuser'}</Text>
            </View>
          </Pressable>
          <Pressable
            onPress={onAccept}
            accessibilityRole="button"
            accessibilityLabel="Accepter la course"
            hitSlop={4}
            disabled={!!acting || !course}
            className="flex-[1.4] h-16 rounded-2xl bg-airmess-yellow items-center justify-center flex-row"
            style={({ pressed }) => (pressed ? { opacity: 0.9 } : undefined)}
          >
            {acting === 'accept' ? (
              <ActivityIndicator color="#1A1614" />
            ) : (
              <View pointerEvents="none" className="flex-row items-center">
                <Ionicons name="checkmark" size={24} color="#1A1614" />
                <Text className="text-ink font-extrabold ml-2 text-lg">Accepter</Text>
              </View>
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
