import { Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Card from '../../components/ui/Card'
import Screen from '../../components/ui/Screen'

export default function NewCourseScreen() {
  return (
    <Screen py={18} className="px-5">
      <Text className="mb-4 text-3xl font-extrabold text-ink">Nouvelle course</Text>
      <Card>
        <View className="mb-3 h-12 w-12 items-center justify-center rounded-full bg-airmess-yellow">
          <Ionicons name="add" size={24} color="#1A1614" />
        </View>
        <Text className="text-lg font-extrabold text-ink">Formulaire a venir</Text>
        <Text className="mt-2 text-sm leading-5 text-warm-600">
          Cette entree est prete pour brancher le workflow web de creation de course en version mobile.
        </Text>
      </Card>
    </Screen>
  )
}
