import { useState } from 'react'
import { Modal, View, Text, Pressable, ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { type DriverCourseSummary } from '../api/driver'
import ActiveCourseCard from './ActiveCourseCard'

interface Props {
  course: DriverCourseSummary & { destination_phone?: string; origin_phone?: string }
  visible: boolean
  onClose: () => void
}

/**
 * Modal plein écran pour la course active — l'accueil reste intact derrière
 * (propositions toujours visibles). Fermeture possible ; une barre sticky
 * sur l'accueil permet de rouvrir.
 */
export default function ActiveCourseModal({ course, visible, onClose }: Props) {
  const insets = useSafeAreaInsets()
  const [mapInteracting, setMapInteracting] = useState(false)

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className="flex-1 bg-cream" style={{ paddingTop: insets.top }}>
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-warm-200">
          <View className="flex-1 pr-3">
            <Text className="text-base font-jk-extrabold text-ink">Course active</Text>
            <Text className="text-xs text-warm-500 font-jk-medium mt-0.5" numberOfLines={1}>
              {course.reference}
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            className="h-10 px-3 rounded-2xl bg-warm-100 items-center justify-center flex-row"
            style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
            accessibilityRole="button"
            accessibilityLabel="Fermer et revenir à l'accueil"
          >
            <Ionicons name="home-outline" size={16} color="#1A1614" />
            <Text className="text-ink font-jk-bold ml-1.5 text-sm">Accueil</Text>
          </Pressable>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: Math.max(28, insets.bottom + 16) }}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!mapInteracting}
          keyboardShouldPersistTaps="handled"
        >
          <ActiveCourseCard course={course} onMapInteractionChange={setMapInteracting} />
        </ScrollView>
      </View>
    </Modal>
  )
}
