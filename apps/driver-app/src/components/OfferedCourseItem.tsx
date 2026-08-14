import { useEffect, useRef, useState } from 'react'
import { Alert, View, Text, Pressable, Vibration } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { acceptCourse, declineCourse, type DriverCourseSummary } from '../api/driver'
import CourseDetailModal from './CourseDetailModal'
import DeclineCourseModal from './DeclineCourseModal'

const SWIPE_ACTION_THRESHOLD = 112
const SWIPE_LIMIT = 148
const UNDO_DECLINE_MS = 3000

/**
 * Carte compacte d'une course proposée.
 *   [Express] [Catégorie]                 1 850 FCFA
 *   [Encaissement]
 *   ● RETRAIT     Restaurant Le Pilier — Akpakpa   4.2 km
 *   ● LIVRAISON   Quartier Zongo — Cotonou         18 min
 *
 * Tap → modale détail (où se font Accepter / Refuser). Pas d'action destructrice
 * au tap direct.
 */

/** Durée estimée (min) depuis la distance — ~14 km/h en ville (moto/vélo). */
function etaMin(km?: number): number | null {
  if (typeof km !== 'number' || km <= 0) return null
  return Math.max(1, Math.round((km / 14) * 60))
}

export default function OfferedCourseItem({
  course,
  acceptBlocked = false,
}: {
  course: DriverCourseSummary
  /** true si une course est déjà en cours — détail visible, accept désactivé. */
  acceptBlocked?: boolean
}) {
  const queryClient = useQueryClient()
  const [detailOpen, setDetailOpen] = useState(false)
  const [declineOpen, setDeclineOpen] = useState(false)
  const [pendingDecline, setPendingDecline] = useState(false)
  const [swiping, setSwiping] = useState(false)
  const declineTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const translateX = useSharedValue(0)
  const isExpress = course.urgency === 'express'
  const isAirmessMission = course.source === 'admin_airmess'
  const eta = etaMin(course.distance_km)
  const category = course.package_category?.name
  const busy = pendingDecline

  const acceptMutation = useMutation({
    mutationFn: () => acceptCourse(course.id),
    onSuccess: () => {
      Vibration.vibrate(40)
      queryClient.invalidateQueries({ queryKey: ['offered-courses'] })
      queryClient.invalidateQueries({ queryKey: ['my-active'] })
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
    onError: (err: unknown) => {
      translateX.value = withSpring(0)
      const msg = err instanceof Error ? err.message : "Impossible d'accepter cette course."
      Alert.alert("Impossible d'accepter", msg)
    },
  })

  const declineMutation = useMutation({
    mutationFn: () => declineCourse(course.id, 'personal'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offered-courses'] })
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
    onError: (err: unknown) => {
      setPendingDecline(false)
      translateX.value = withSpring(0)
      const msg = err instanceof Error ? err.message : 'Erreur lors du refus.'
      Alert.alert('Refus impossible', msg)
    },
  })

  useEffect(() => {
    return () => {
      if (declineTimer.current) clearTimeout(declineTimer.current)
    }
  }, [])

  function confirmSwipeAccept() {
    if (acceptBlocked || acceptMutation.isPending || busy) {
      translateX.value = withSpring(0)
      if (acceptBlocked) {
        Alert.alert('Course en cours', 'Termine ta course en cours pour en accepter une autre.')
      }
      return
    }
    Vibration.vibrate(25)
    translateX.value = withSpring(SWIPE_LIMIT)
    acceptMutation.mutate()
  }

  function scheduleSwipeDecline() {
    if (declineMutation.isPending || acceptMutation.isPending || pendingDecline) {
      translateX.value = withSpring(0)
      return
    }
    Vibration.vibrate(25)
    setPendingDecline(true)
    translateX.value = withSpring(-SWIPE_LIMIT)
    declineTimer.current = setTimeout(() => {
      declineTimer.current = null
      declineMutation.mutate()
    }, UNDO_DECLINE_MS)
  }

  function undoDecline() {
    if (declineTimer.current) {
      clearTimeout(declineTimer.current)
      declineTimer.current = null
    }
    setPendingDecline(false)
    translateX.value = withSpring(0)
    queryClient.invalidateQueries({ queryKey: ['offered-courses'] })
  }

  const pan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-12, 12])
    .enabled(!acceptMutation.isPending && !declineMutation.isPending && !pendingDecline)
    .onBegin(() => runOnJS(setSwiping)(true))
    .onUpdate((event) => {
      translateX.value = Math.max(-SWIPE_LIMIT, Math.min(SWIPE_LIMIT, event.translationX))
    })
    .onEnd((event) => {
      const projected = event.translationX + event.velocityX * 0.12
      if (projected > SWIPE_ACTION_THRESHOLD) {
        runOnJS(confirmSwipeAccept)()
        return
      }
      if (projected < -SWIPE_ACTION_THRESHOLD) {
        runOnJS(scheduleSwipeDecline)()
        return
      }
      translateX.value = withSpring(0)
    })
    .onFinalize(() => runOnJS(setSwiping)(false))

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { rotate: `${interpolate(translateX.value, [-SWIPE_LIMIT, 0, SWIPE_LIMIT], [-2, 0, 2])}deg` },
    ],
  }))

  const leftActionStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_ACTION_THRESHOLD, 0], [1, 0]),
  }))

  const rightActionStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_ACTION_THRESHOLD], [0, 1]),
  }))

  return (
    <>
      <View className="mb-3">
        <View className="absolute inset-0 rounded-2xl overflow-hidden flex-row">
          <Animated.View
            style={rightActionStyle}
            className="flex-1 bg-success items-start justify-center px-5"
          >
            <Ionicons name="checkmark-circle" size={24} color="#ffffff" />
            <Text className="text-white text-xs font-jk-extrabold mt-1">Accepter</Text>
          </Animated.View>
          <Animated.View
            style={leftActionStyle}
            className="flex-1 bg-airmess-red items-end justify-center px-5"
          >
            <Ionicons name="close-circle" size={24} color="#ffffff" />
            <Text className="text-white text-xs font-jk-extrabold mt-1">Refuser</Text>
          </Animated.View>
        </View>

        {pendingDecline ? (
          <View className="rounded-2xl bg-airmess-red border border-airmess-red p-4 min-h-[132px] justify-center">
            <View className="flex-row items-center">
              <View className="w-11 h-11 rounded-full bg-white/15 items-center justify-center mr-3">
                <Ionicons name="time-outline" size={22} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-white text-base font-jk-extrabold">Refus dans 3 s</Text>
                <Text className="text-white/80 text-xs font-jk-medium mt-0.5">
                  {course.reference} ne réapparaîtra plus.
                </Text>
              </View>
              <Pressable
                onPress={undoDecline}
                className="h-10 px-4 rounded-xl bg-white items-center justify-center"
                accessibilityRole="button"
                accessibilityLabel="Annuler le refus"
              >
                <Text className="text-airmess-red text-sm font-jk-extrabold">Annuler</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <GestureDetector gesture={pan}>
            <Animated.View style={cardStyle}>
              <Pressable
                onPress={() => {
                  if (!swiping) setDetailOpen(true)
                }}
                className="rounded-2xl bg-off-white border border-warm-200 p-4"
                style={({ pressed }) => (pressed ? { opacity: 0.9 } : undefined)}
              >
        {/* Ligne du haut : tags | prix */}
        <View className="flex-row items-start justify-between">
          <View className="flex-1 flex-row flex-wrap items-center pr-2" style={{ gap: 6 }}>
            {isAirmessMission && (
              <View className="flex-row items-center bg-ink px-2 py-1 rounded-md">
                <Ionicons name="shield-checkmark" size={10} color="#FFCC00" />
                <Text className="text-airmess-yellow text-[10px] font-jk-extrabold ml-1">
                  Mission AirMess
                </Text>
              </View>
            )}
            {isExpress && (
              <View className="flex-row items-center bg-airmess-red px-2 py-1 rounded-md">
                <Ionicons name="flash" size={10} color="#ffffff" />
                <Text className="text-white text-[10px] font-jk-extrabold ml-1">Express</Text>
              </View>
            )}
            {category && (
              <View className="bg-warm-100 px-2 py-1 rounded-md">
                <Text className="text-warm-600 text-[10px] font-jk-bold">{category}</Text>
              </View>
            )}
          </View>
          <View className="items-end">
            {isAirmessMission ? (
              <>
                <Text className="text-ink text-base font-jk-extrabold leading-6">
                  Prioritaire
                </Text>
                <Text className="text-warm-500 text-[10px] font-jk-bold">Interne</Text>
              </>
            ) : (
              <>
                <Text className="text-ink text-xl font-jk-extrabold leading-6">
                  {course.driver_earnings.toLocaleString('fr-FR')}
                </Text>
                <Text className="text-warm-500 text-[10px] font-jk-bold">FCFA</Text>
              </>
            )}
          </View>
        </View>

        {/* Encaissement */}
        {course.has_collection && (
          <View className="self-start flex-row items-center bg-airmess-yellow/20 px-2 py-1 rounded-md mt-2">
            <Ionicons name="cash-outline" size={11} color="#1A1614" />
            <Text className="text-ink text-[10px] font-jk-extrabold ml-1">
              Encaissement{course.collection_amount ? ` · ${course.collection_amount.toLocaleString('fr-FR')} F` : ''}
            </Text>
          </View>
        )}

        {/* Trajet + km/min */}
        <View className="flex-row items-start justify-between mt-3">
          <View className="flex-1 pr-2">
            <TripLine
              dotColor="#FFCC00"
              label="Retrait"
              text={`${course.origin_name} — ${course.origin_quartier}`}
            />
            <View className="mt-2">
              <TripLine
                dotColor="#D40511"
                label="Livraison"
                text={`${course.destination_quartier} — ${course.destination_city}`}
              />
            </View>
          </View>
          {(course.distance_km != null || eta != null) && (
            <View className="items-end" style={{ minWidth: 64 }}>
              {course.distance_km != null && (
                <View className="flex-row items-center">
                  <Ionicons name="navigate-outline" size={12} color="#8A7E68" />
                  <Text className="text-warm-600 text-xs font-jk-bold ml-1">
                    {course.distance_km.toFixed(1)} km
                  </Text>
                </View>
              )}
              {eta != null && (
                <View className="flex-row items-center mt-1.5">
                  <Ionicons name="time-outline" size={12} color="#8A7E68" />
                  <Text className="text-warm-600 text-xs font-jk-bold ml-1">{eta} min</Text>
                </View>
              )}
            </View>
          )}
        </View>
              </Pressable>
            </Animated.View>
          </GestureDetector>
        )}
      </View>

      <CourseDetailModal
        course={course}
        visible={detailOpen}
        onClose={() => setDetailOpen(false)}
        onDecline={() => setDeclineOpen(true)}
        acceptBlocked={acceptBlocked}
      />

      <DeclineCourseModal
        visible={declineOpen}
        courseId={course.id}
        courseReference={course.reference}
        onClose={() => setDeclineOpen(false)}
      />
    </>
  )
}

function TripLine({
  dotColor,
  label,
  text,
}: {
  dotColor: string
  label: string
  text: string
}) {
  return (
    <View>
      <View className="flex-row items-center">
        <View className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: dotColor }} />
        <Text className="text-warm-500 text-[10px] font-jk-bold uppercase tracking-wide">
          {label}
        </Text>
      </View>
      <Text className="text-ink text-[13px] font-jk-bold ml-4 mt-0.5" numberOfLines={1}>
        {text}
      </Text>
    </View>
  )
}
