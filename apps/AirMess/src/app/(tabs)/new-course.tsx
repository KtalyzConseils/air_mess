import { Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { fetchAddresses } from '../../api/addresses'
import Card from '../../components/ui/Card'
import Screen from '../../components/ui/Screen'

export default function NewCourseScreen() {
  const { addressId } = useLocalSearchParams<{ addressId?: string }>()
  const { data: addresses = [] } = useQuery({
    queryKey: ['addresses'],
    queryFn: fetchAddresses,
    enabled: !!addressId,
  })
  const selectedAddress = addresses.find((address) => String(address.id) === addressId)

  return (
    <Screen py={18} className="px-5">
      <Text className="mb-4 text-3xl font-extrabold text-ink">Nouvelle course</Text>
      {selectedAddress && (
        <Card className="mb-4 flex-row items-start">
          <View className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-airmess-yellow">
            <Ionicons name="location-outline" size={22} color="#1A1614" />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-extrabold text-ink" numberOfLines={1}>
              {selectedAddress.label || selectedAddress.recipient_name}
            </Text>
            <Text className="mt-1 text-sm font-bold text-warm-600" numberOfLines={1}>
              {selectedAddress.recipient_name} - {selectedAddress.recipient_phone}
            </Text>
            <Text className="mt-1 text-sm font-semibold text-warm-500" numberOfLines={2}>
              {[selectedAddress.street, selectedAddress.quartier, selectedAddress.city].filter(Boolean).join(', ')}
            </Text>
          </View>
        </Card>
      )}
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
