import { useEffect, useState } from 'react'
import { Animated, Easing, Image, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'

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
    <View className="flex-1 items-center justify-center bg-airmess-dark">
      <StatusBar style="light" />
      <Animated.View style={{ opacity, transform: [{ scale }] }}>
        <Image
          source={require('../../assets/images/splash-icon.png')}
          style={{ width: 260, height: 390 }}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  )
}
