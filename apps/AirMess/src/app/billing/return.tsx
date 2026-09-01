import { useEffect } from 'react'
import { ActivityIndicator, Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'

export default function BillingReturnScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { context } = useLocalSearchParams<{ context?: string }>()

  useEffect(() => {
    void queryClient.invalidateQueries()
    router.replace(context === 'course' ? '/courses' : '/wallet')
  }, [context, queryClient, router])

  return (
    <View className="flex-1 items-center justify-center bg-cream px-6">
      <ActivityIndicator size="large" color="#1A1614" />
      <Text className="mt-4 text-center text-base font-bold text-ink">
        Retour dans AirMess...
      </Text>
    </View>
  )
}
