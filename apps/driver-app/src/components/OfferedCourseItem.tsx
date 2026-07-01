import { useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { acceptCourse, type DriverCourseSummary } from '../api/driver'
import CourseDetailModal from './CourseDetailModal'
import DeclineCourseModal from './DeclineCourseModal'
import Button from './ui/Button'

/**
 * Item d'une course proposée dans la liste "propositions".
 *
 * Design :
 *   - Tap sur la carte → modal détail (pas d'action destructrice au tap)
 *   - Boutons Refuser (1/3) + Accepter (2/3) en bas, 48px
 *   - Express : bordure rouge brand + bandeau discret. Pas d'orange (hors palette).
 *   - Trajet : dots verts/rouges + connecteur, pas d'emojis
 */
export default function OfferedCourseItem({ course }: { course: DriverCourseSummary }) {
  const queryClient = useQueryClient()
  const [detailOpen, setDetailOpen] = useState(false)
  const [declineOpen, setDeclineOpen] = useState(false)
  const isExpress = course.urgency === 'express'

  const mutation = useMutation({
    mutationFn: () => acceptCourse(course.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offered-courses'] })
      queryClient.invalidateQueries({ queryKey: ['my-active'] })
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })

  return (
    <>
      <Pressable
        onPress={() => setDetailOpen(true)}
        className={[
          'rounded-2xl mb-3 overflow-hidden bg-off-white',
          isExpress ? 'border-2 border-airmess-red' : 'border border-warm-200',
        ].join(' ')}
        style={({ pressed }) => (pressed ? { opacity: 0.9 } : undefined)}
      >
        {/* Bandeau express — brand-aligné (rouge) */}
        {isExpress && (
          <View className="bg-airmess-red px-3 py-1.5 flex-row items-center justify-center">
            <Ionicons name="flash" size={12} color="#ffffff" />
            <Text className="text-white text-[10px] font-extrabold tracking-widest ml-1">
              EXPRESS · PRIORITAIRE
            </Text>
          </View>
        )}

        <View className="p-4">
          {/* Ligne du haut : référence + distance */}
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-[10px] font-mono text-warm-400">{course.reference}</Text>
            {typeof course.distance_km === 'number' && (
              <View className="bg-cream border border-warm-300 px-2 py-0.5 rounded-md flex-row items-center">
                <Ionicons name="bicycle" size={11} color="#6B6250" />
                <Text className="text-[11px] text-warm-600 font-bold ml-1">
                  {course.distance_km.toFixed(1)} km
                </Text>
              </View>
            )}
          </View>

          {/* Trajet — pins + connecteur */}
          <View className="mb-3">
            <View className="flex-row items-center">
              <View className="w-2.5 h-2.5 rounded-full bg-success mr-2.5" />
              <Text className="text-base font-extrabold text-ink flex-1" numberOfLines={1}>
                {course.origin_quartier}
              </Text>
            </View>
            <View className="ml-[5px] my-0.5">
              <View className="w-0.5 h-3 bg-warm-300" />
            </View>
            <View className="flex-row items-center">
              <View className="w-2.5 h-2.5 rounded-full bg-airmess-red mr-2.5" />
              <Text className="text-base font-extrabold text-ink flex-1" numberOfLines={1}>
                {course.destination_quartier}
              </Text>
            </View>
          </View>

          {/* Description du colis */}
          <View className="flex-row items-center">
            <Ionicons name="cube-outline" size={12} color="#8A7E68" />
            <Text className="text-xs text-warm-500 ml-1.5 flex-1" numberOfLines={1}>
              {course.package_description}
            </Text>
          </View>

          {/* Gains + à encaisser */}
          <View className="flex-row justify-between items-end mt-3 pt-3 border-t border-warm-200">
            <View>
              <Text className="text-[10px] text-warm-500 uppercase tracking-widest font-bold">Gain</Text>
              <Text className="text-xl font-extrabold text-ink mt-0.5">
                {course.driver_earnings.toLocaleString('fr-FR')}
                <Text className="text-xs font-medium text-warm-500"> FCFA</Text>
              </Text>
            </View>
            {course.has_collection && (
              <View className="items-end bg-airmess-yellow/20 px-3 py-1.5 rounded-lg">
                <Text className="text-[10px] text-ink uppercase font-extrabold tracking-widest">
                  À encaisser
                </Text>
                <Text className="text-sm font-extrabold text-ink mt-0.5">
                  {course.collection_amount?.toLocaleString('fr-FR')} FCFA
                </Text>
              </View>
            )}
          </View>

          {/* Actions Refuser (1/3) + Accepter (2/3) */}
          <View className="flex-row gap-2 mt-4">
            <View className="flex-1">
              <Button
                variant="outline"
                size="md"
                onPress={() => setDeclineOpen(true)}
                disabled={mutation.isPending}
                fullWidth
              >
                Refuser
              </Button>
            </View>
            <View className="flex-[2]">
              <Button
                variant={isExpress ? 'danger' : 'primary'}
                size="md"
                onPress={() => mutation.mutate()}
                loading={mutation.isPending}
                fullWidth
                leftIcon={
                  isExpress ? (
                    <Ionicons name="flash" size={16} color="#ffffff" />
                  ) : (
                    <Ionicons name="checkmark" size={16} color="#1A1614" />
                  )
                }
              >
                Accepter
              </Button>
            </View>
          </View>
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
