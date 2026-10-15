import { useEffect, useState } from 'react'
import { Animated, Easing, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import BrandMark from './BrandMark'

export default function BrandSplash() {
  const [opacity] = useState(() => new Animated.Value(0))
  const [scale] = useState(() => new Animated.Value(0.94))

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start()
  }, [opacity, scale])

  return (
    // Fond sombre identique au splash natif (voir expo-splash-screen dans
    // app.json) : pas de flash blanc entre les deux.
    <View className="flex-1 items-center justify-center bg-airmess-dark">
      <StatusBar style="light" />
      <Animated.View style={{ opacity, transform: [{ scale }] }}>
        <BrandMark size="lg" />
      </Animated.View>
    </View>
  )
}
