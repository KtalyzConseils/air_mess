import { View, Text, Modal, Pressable, ScrollView, Linking } from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { acceptCourse, type DriverCourseSummary } from '../api/driver'

interface Props {
  course: DriverCourseSummary & { origin_phone?: string }
  visible: boolean
  onClose: () => void
}

export default function CourseDetailModal({ course, visible, onClose }: Props) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => acceptCourse(course.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offered-courses'] })
      queryClient.invalidateQueries({ queryKey: ['my-active'] })
      queryClient.invalidateQueries({ queryKey: ['me'] })
      onClose()
    },
  })

  const isExpress = course.urgency === 'express'

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View className="flex-1 bg-gray-100">
        {/* Header */}
        <View className={`p-4 pt-12 ${isExpress ? 'bg-orange-500' : 'bg-airmess-dark'}`}>
          <View className="flex-row justify-between items-start">
            <View>
              <Text className="text-xs font-mono text-white/70">{course.reference}</Text>
              <Text className="text-xl font-bold text-white mt-1">
                {isExpress ? '⚡ Course Express' : 'Course Standard'}
              </Text>
            </View>
            <Pressable onPress={onClose} className="bg-white/20 rounded-full w-8 h-8 items-center justify-center">
              <Text className="text-white font-bold">✕</Text>
            </Pressable>
          </View>
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
          {/* Trajet + distance */}
          <View className="bg-white rounded-xl p-4 mb-3">
            <Text className="text-xs uppercase text-gray-500">Trajet</Text>
            <Text className="text-base font-bold text-airmess-dark mt-1">
              {course.origin_quartier} → {course.destination_quartier}
            </Text>
            {typeof course.distance_km === 'number' && (
              <Text className="text-sm text-green-700 font-semibold mt-1">
                📍 {course.distance_km.toFixed(1)} km de ta position
              </Text>
            )}
          </View>

          {/* Gain */}
          <View className="bg-airmess-yellow rounded-xl p-4 mb-3">
            <Text className="text-xs uppercase text-airmess-dark/70">Ton gain</Text>
            <Text className="text-3xl font-bold text-airmess-dark mt-1">
              {course.driver_earnings.toLocaleString('fr-FR')} <Text className="text-base">FCFA</Text>
            </Text>
          </View>

          {/* Encaissement */}
          {course.has_collection && (
            <View className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-3">
              <Text className="text-xs uppercase text-blue-700 font-semibold">⚠️ À encaisser à la livraison</Text>
              <Text className="text-2xl font-bold text-blue-900 mt-1">
                {course.collection_amount?.toLocaleString('fr-FR')} FCFA
              </Text>
              <Text className="text-xs text-blue-700 mt-0.5">via {course.collection_method}</Text>
            </View>
          )}

          {/* Détails colis */}
          <View className="bg-white rounded-xl p-4 mb-3">
            <Text className="text-xs uppercase text-gray-500 mb-2">Colis</Text>
            <Text className="text-sm text-airmess-dark">{course.package_description}</Text>
            <View className="flex-row gap-3 mt-3">
              {course.package_category?.name && (
                <Text className="text-xs bg-gray-100 px-2 py-1 rounded">{course.package_category.name}</Text>
              )}
              {course.package_weight_kg && (
                <Text className="text-xs bg-gray-100 px-2 py-1 rounded">⚖️ {course.package_weight_kg} kg</Text>
              )}
              {course.package_size && (
                <Text className="text-xs bg-gray-100 px-2 py-1 rounded">📏 Taille {course.package_size}</Text>
              )}
            </View>
          </View>

          {/* Origine détaillée */}
          <View className="bg-white rounded-xl p-4 mb-3">
            <Text className="text-xs uppercase text-gray-500">Origine</Text>
            <Text className="font-bold text-airmess-dark mt-1">{course.origin_name}</Text>
            <Text className="text-sm text-gray-600">{course.origin_street}</Text>
            <Text className="text-sm text-gray-600">{course.origin_quartier}</Text>
            {course.origin_landmark && (
              <Text className="text-xs text-gray-500 italic mt-1">🚩 {course.origin_landmark}</Text>
            )}
            {course.origin_instructions && (
              <View className="mt-2 bg-yellow-50 p-2 rounded">
                <Text className="text-xs text-yellow-800">📝 {course.origin_instructions}</Text>
              </View>
            )}
          </View>

          {/* Destination détaillée */}
          <View className="bg-white rounded-xl p-4 mb-3">
            <Text className="text-xs uppercase text-gray-500">Destination</Text>
            <Text className="font-bold text-airmess-dark mt-1">{course.destination_name}</Text>
            <Text className="text-sm text-gray-600">{course.destination_street}</Text>
            <Text className="text-sm text-gray-600">
              {course.destination_quartier}, {course.destination_city}
            </Text>
            {course.destination_landmark && (
              <Text className="text-xs text-gray-500 italic mt-1">🚩 {course.destination_landmark}</Text>
            )}
            {course.destination_instructions && (
              <View className="mt-2 bg-yellow-50 p-2 rounded">
                <Text className="text-xs text-yellow-800">📝 {course.destination_instructions}</Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Barre d'action fixe en bas */}
        <View className="bg-white border-t border-gray-200 p-4">
          <Pressable
            onPress={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="bg-airmess-yellow rounded-xl py-4 items-center"
            style={{ opacity: mutation.isPending ? 0.5 : 1 }}
          >
            <Text className="text-airmess-dark font-bold text-base">
              {mutation.isPending ? 'Acceptation...' : '✅ Accepter cette course'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}
