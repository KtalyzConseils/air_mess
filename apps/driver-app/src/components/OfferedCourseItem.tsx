import { useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { type DriverCourseSummary } from '../api/driver'
import CourseDetailModal from './CourseDetailModal'
import DeclineCourseModal from './DeclineCourseModal'

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

export default function OfferedCourseItem({ course }: { course: DriverCourseSummary }) {
  const [detailOpen, setDetailOpen] = useState(false)
  const [declineOpen, setDeclineOpen] = useState(false)
  const isExpress = course.urgency === 'express'
  const eta = etaMin(course.distance_km)
  const category = course.package_category?.name

  return (
    <>
      <Pressable
        onPress={() => setDetailOpen(true)}
        className="rounded-2xl mb-3 bg-off-white border border-warm-200 p-4"
        style={({ pressed }) => (pressed ? { opacity: 0.9 } : undefined)}
      >
        {/* Ligne du haut : tags | prix */}
        <View className="flex-row items-start justify-between">
          <View className="flex-1 flex-row flex-wrap items-center pr-2" style={{ gap: 6 }}>
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
            <Text className="text-ink text-xl font-jk-extrabold leading-6">
              {course.driver_earnings.toLocaleString('fr-FR')}
            </Text>
            <Text className="text-warm-500 text-[10px] font-jk-bold">FCFA</Text>
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

      <CourseDetailModal
        course={course}
        visible={detailOpen}
        onClose={() => setDetailOpen(false)}
        onDecline={() => setDeclineOpen(true)}
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
