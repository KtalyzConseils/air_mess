import { useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { acceptCourse, type DriverCourseSummary } from '../api/driver'
import CourseDetailModal from './CourseDetailModal'
import DeclineCourseModal from './DeclineCourseModal'

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
        className={`rounded-2xl mb-3 overflow-hidden ${
          isExpress
            ? 'bg-orange-50 border-2 border-orange-500'
            : 'bg-white border border-gray-100'
        }`}
      >
        {/* Bandeau express en haut */}
        {isExpress && (
          <View className="bg-orange-500 px-3 py-1.5 items-center">
            <Text className="text-white text-xs font-bold tracking-widest">
              ⚡ EXPRESS
            </Text>
          </View>
        )}

        <View className="p-4">
          {/* Ligne du haut : référence + distance */}
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-xs font-mono text-gray-400">{course.reference}</Text>
            {typeof course.distance_km === 'number' && (
              <View className="bg-green-50 px-2 py-1 rounded-full">
                <Text className="text-xs text-green-700 font-bold">
                  🛣️ {course.distance_km.toFixed(1)} km au total
                </Text>
              </View>
            )}
          </View>

          {/* Trajet — empilement vertical */}
          <View>
            <View className="flex-row items-center gap-2">
              <Text className="text-base">🟢</Text>
              <Text className="text-lg font-bold text-airmess-dark flex-1" numberOfLines={1}>
                {course.origin_quartier}
              </Text>
            </View>
            <View className="ml-2 my-1">
              <Text className="text-gray-300 text-sm leading-none">│</Text>
              <Text className="text-gray-300 text-sm leading-none">│</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Text className="text-base">🔴</Text>
              <Text className="text-lg font-bold text-airmess-dark flex-1" numberOfLines={1}>
                {course.destination_quartier}
              </Text>
            </View>
          </View>

          {/* Description du colis */}
          <Text className="text-sm text-gray-500 mt-3" numberOfLines={1}>
            📦 {course.package_description}
          </Text>

          {/* Footer : gains */}
          <View className="flex-row justify-between items-end mt-3 pt-3 border-t border-gray-100">
            <View>
              <Text className="text-xs text-gray-500">Gain</Text>
              <Text className="text-xl font-bold text-airmess-dark">
                {course.driver_earnings.toLocaleString('fr-FR')}
                <Text className="text-xs font-normal text-gray-500"> FCFA</Text>
              </Text>
            </View>
            {course.has_collection && (
              <View className="items-end">
                <Text className="text-xs text-gray-500">À encaisser</Text>
                <Text className="text-sm font-bold text-airmess-dark">
                  {course.collection_amount?.toLocaleString('fr-FR')} FCFA
                </Text>
              </View>
            )}
          </View>

          {/* Boutons d'action : Refuser + Accepter */}
          <View className="flex-row gap-2 mt-3">
            <Pressable
              onPress={() => setDeclineOpen(true)}
              disabled={mutation.isPending}
              className="flex-1 rounded-lg py-3 items-center border border-gray-300 bg-white"
              style={{ opacity: mutation.isPending ? 0.5 : 1 }}
            >
              <Text className="text-gray-700 font-semibold">✕ Refuser</Text>
            </Pressable>
            <Pressable
              onPress={() => mutation.mutate()}
              disabled={mutation.isPending}
              className={`flex-[2] rounded-lg py-3 items-center ${
                isExpress ? 'bg-orange-500' : 'bg-airmess-yellow'
              }`}
              style={{ opacity: mutation.isPending ? 0.5 : 1 }}
            >
              <Text
                className={`font-bold ${
                  isExpress ? 'text-white' : 'text-airmess-dark'
                }`}
              >
                {mutation.isPending
                  ? 'Acceptation...'
                  : isExpress
                  ? '⚡ Accepter'
                  : '✓ Accepter'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Pressable>

      <CourseDetailModal
        course={course}
        visible={detailOpen}
        onClose={() => setDetailOpen(false)}
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
