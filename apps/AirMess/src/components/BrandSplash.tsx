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
    // Fond jaune identique au splash natif (backgroundColor #FFCC00 dans
    // app.json) : pas de flash entre les deux. La marque est posee nue, sans son
    // bloc jaune, pour ne pas faire du jaune sur du jaune.
    <View className="flex-1 items-center justify-center bg-airmess-yellow">
      <StatusBar style="dark" />
      <Animated.View style={{ opacity, transform: [{ scale }] }}>
        <BrandMark variant="bare" />
      </Animated.View>
    </View>
  )
}
